// server/routes.js — REST API routes
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { stmts } = require("./db");

const router = express.Router();

// ── Servers ──────────────────────────────────────────────────────────
router.get("/servers", (_req, res) => {
  const servers = stmts.getServers.all();
  res.json(servers);
});

router.get("/servers/:id", (req, res) => {
  const server = stmts.getServer.get(req.params.id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  res.json(server);
});

router.delete("/servers/:id", (req, res) => {
  stmts.deleteServer.run(req.params.id);
  res.json({ ok: true });
});

// ── Metrics ──────────────────────────────────────────────────────────
router.get("/servers/:id/metrics", (req, res) => {
  const { id } = req.params;
  const now = Math.floor(Date.now() / 1000);
  const from = Number(req.query.from) || now - 3600;        // default last hour
  const to = Number(req.query.to) || now;
  const metrics = stmts.getMetrics.all(id, from, to);
  res.json(metrics);
});

router.get("/servers/:id/latest", (req, res) => {
  const metric = stmts.getLatestMetric.get(req.params.id);
  if (!metric) return res.status(404).json({ error: "No metrics yet" });
  res.json(metric);
});

// ── Alert Rules ──────────────────────────────────────────────────────
router.get("/rules", (_req, res) => {
  res.json(stmts.getRules.all());
});

router.post("/rules", (req, res) => {
  const { server_id, metric, operator, threshold, duration_s, severity, cooldown_s } = req.body;
  if (!metric || !operator || threshold === undefined) {
    return res.status(400).json({ error: "metric, operator, and threshold are required" });
  }
  const rule = {
    id: uuidv4(),
    server_id: server_id || null,
    metric,
    operator,
    threshold: Number(threshold),
    duration_s: Number(duration_s) || 0,
    severity: severity || "warning",
    enabled: 1,
    cooldown_s: Number(cooldown_s) || 300,
  };
  stmts.insertRule.run(rule);
  res.status(201).json(rule);
});

router.put("/rules/:id", (req, res) => {
  const { metric, operator, threshold, duration_s, severity, enabled, cooldown_s } = req.body;
  stmts.updateRule.run({
    id: req.params.id,
    metric,
    operator,
    threshold: Number(threshold),
    duration_s: Number(duration_s) || 0,
    severity: severity || "warning",
    enabled: enabled !== undefined ? (enabled ? 1 : 0) : 1,
    cooldown_s: Number(cooldown_s) || 300,
  });
  res.json({ ok: true });
});

router.delete("/rules/:id", (req, res) => {
  stmts.deleteRule.run(req.params.id);
  res.json({ ok: true });
});

// ── Alerts ───────────────────────────────────────────────────────────
router.get("/alerts", (req, res) => {
  const limit = Number(req.query.limit) || 100;
  res.json(stmts.getAlerts.all(limit));
});

router.get("/alerts/active", (_req, res) => {
  res.json(stmts.getActiveAlerts.all());
});

router.post("/alerts/:id/acknowledge", (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  stmts.ackAlert.run(now, Number(req.params.id));
  res.json({ ok: true });
});

router.post("/alerts/:id/resolve", (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  stmts.resolveAlert.run(now, Number(req.params.id));
  res.json({ ok: true });
});

// ── Dashboard Summary ────────────────────────────────────────────────
router.get("/dashboard", (_req, res) => {
  const servers = stmts.getServers.all();
  const activeAlerts = stmts.getActiveAlerts.all();

  const summary = {
    total_servers: servers.length,
    online: servers.filter(s => s.status === "online").length,
    warning: servers.filter(s => s.status === "warning").length,
    critical: servers.filter(s => s.status === "critical").length,
    offline: servers.filter(s => s.status === "offline").length,
    active_alerts: activeAlerts.length,
    critical_alerts: activeAlerts.filter(a => a.severity === "critical").length,
    servers: servers.map(s => {
      const latest = stmts.getLatestMetric.get(s.id);
      return { ...s, latest_metric: latest || null };
    }),
  };
  res.json(summary);
});

module.exports = router;
