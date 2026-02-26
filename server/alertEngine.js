// server/alertEngine.js — Evaluates alert rules against incoming metrics
const { stmts } = require("./db");
const nodemailer = require("nodemailer");

// ── Notification transports ──────────────────────────────────────────
let mailTransport = null;
if (process.env.SMTP_HOST) {
  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendEmail(subject, html) {
  if (!mailTransport || !process.env.ALERT_EMAIL_TO) return;
  try {
    await mailTransport.sendMail({
      from: process.env.SMTP_FROM || "watchx@localhost",
      to: process.env.ALERT_EMAIL_TO,
      subject,
      html,
    });
  } catch (err) {
    console.error("[AlertEngine] Email send failed:", err.message);
  }
}

async function sendWebhook(payload) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[AlertEngine] Webhook send failed:", err.message);
  }
}

// ── Operator evaluation ──────────────────────────────────────────────
function evaluate(value, operator, threshold) {
  switch (operator) {
    case "gt":  return value > threshold;
    case "lt":  return value < threshold;
    case "gte": return value >= threshold;
    case "lte": return value <= threshold;
    case "eq":  return value === threshold;
    default:    return false;
  }
}

const operatorLabels = {
  gt: ">", lt: "<", gte: ">=", lte: "<=", eq: "==",
};

// Track sustained durations: key = `${ruleId}:${serverId}`
const sustainedSince = new Map();

// ── Core evaluation ──────────────────────────────────────────────────
// wssBroadcast: function to push real-time alert to connected dashboards
let _wssBroadcast = null;
function setBroadcast(fn) {
  _wssBroadcast = fn;
}

function evaluateMetric(serverId, metric) {
  const rules = stmts.getRulesForServer.all(serverId);
  const now = Math.floor(Date.now() / 1000);

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const value = metric[rule.metric];
    if (value === undefined || value === null) continue;

    const key = `${rule.id}:${serverId}`;
    const triggered = evaluate(value, rule.operator, rule.threshold);

    if (triggered) {
      // Track sustained duration
      if (!sustainedSince.has(key)) sustainedSince.set(key, now);
      const elapsed = now - sustainedSince.get(key);

      if (elapsed >= (rule.duration_s || 0)) {
        // Check cooldown — don't re-fire within cooldown period
        const lastAlert = stmts.getLastFiredAlert.get(rule.id, serverId);
        if (lastAlert && lastAlert.status === "active" && (now - lastAlert.fired_at) < (rule.cooldown_s || 300)) {
          continue;
        }

        // Resolve previous active alert for this rule if it exists (auto-resolve stale)
        if (lastAlert && lastAlert.status === "active") {
          stmts.resolveAlert.run(now, lastAlert.id);
        }

        const message = `${rule.metric} ${operatorLabels[rule.operator] || rule.operator} ${rule.threshold} — current value: ${value.toFixed(1)}`;

        const alertData = {
          rule_id: rule.id,
          server_id: serverId,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          severity: rule.severity,
          message,
          status: "active",
          fired_at: now,
        };

        const result = stmts.insertAlert.run(alertData);
        const newAlert = { ...alertData, id: result.lastInsertRowid };

        console.log(`[Alert] ${rule.severity.toUpperCase()}: ${message} on server ${serverId}`);

        // Update server status
        if (rule.severity === "critical") {
          stmts.updateServerStatus.run("critical", now, serverId);
        } else if (rule.severity === "warning") {
          const server = stmts.getServer.get(serverId);
          if (server && server.status !== "critical") {
            stmts.updateServerStatus.run("warning", now, serverId);
          }
        }

        // Dispatch notifications
        const server = stmts.getServer.get(serverId);
        const serverName = server ? server.name : serverId;

        sendEmail(
          `[WatchX ${rule.severity.toUpperCase()}] ${serverName}: ${rule.metric}`,
          `<h2>🔔 WatchX Alert</h2>
           <p><strong>Server:</strong> ${serverName}</p>
           <p><strong>Severity:</strong> ${rule.severity}</p>
           <p><strong>Details:</strong> ${message}</p>
           <p><strong>Time:</strong> ${new Date(now * 1000).toISOString()}</p>`
        );

        sendWebhook({
          type: "alert",
          alert: newAlert,
          server: serverName,
          timestamp: new Date(now * 1000).toISOString(),
        });

        // Broadcast over WebSocket
        if (_wssBroadcast) {
          _wssBroadcast({
            type: "alert:new",
            alert: newAlert,
          });
        }

        sustainedSince.delete(key);
      }
    } else {
      // Condition cleared — resolve active alert & reset tracking
      sustainedSince.delete(key);
      const lastAlert = stmts.getLastFiredAlert.get(rule.id, serverId);
      if (lastAlert && lastAlert.status === "active") {
        stmts.resolveAlert.run(now, lastAlert.id);

        if (_wssBroadcast) {
          _wssBroadcast({
            type: "alert:resolved",
            alertId: lastAlert.id,
            serverId,
          });
        }

        // Re-evaluate server status
        const remaining = stmts.getActiveAlerts.all().filter(a => a.server_id === serverId);
        const hasCritical = remaining.some(a => a.severity === "critical");
        const hasWarning = remaining.some(a => a.severity === "warning");
        const newStatus = hasCritical ? "critical" : hasWarning ? "warning" : "online";
        stmts.updateServerStatus.run(newStatus, now, serverId);
      }
    }
  }
}

module.exports = { evaluateMetric, setBroadcast };
