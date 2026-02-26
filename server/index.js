// server/index.js — WatchX server entrypoint (v2 — full-spectrum monitoring)
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const { stmts } = require("./db");
const routes = require("./routes");
const { evaluateMetric, setBroadcast } = require("./alertEngine");

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory stores for live data (per server) ─────────────────────
// These are volatile — not stored in SQLite, streamed in real-time
const serverDetails = new Map();   // serverId → { topProcesses, listeningPorts, ... }
const serverLogs = new Map();      // serverId → [log entries] (ring buffer)
const MAX_LOG_ENTRIES = 500;

// ── REST API ─────────────────────────────────────────────────────────
app.use("/api", routes);

// ── Additional API routes for live data ──────────────────────────────
app.get("/api/servers/:id/details", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json({});
  res.json(details);
});

app.get("/api/servers/:id/processes", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json({ processes: [], stats: {} });
  res.json({
    processes: details.topProcesses || [],
    stats: details.processStats || {},
  });
});

app.get("/api/servers/:id/ports", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json({ ports: [], connections: [], summary: {} });
  res.json({
    ports: details.listeningPorts || [],
    connections: details.connections || [],
    summary: details.connSummary || {},
  });
});

app.get("/api/servers/:id/services", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json([]);
  res.json(details.services || []);
});

app.get("/api/servers/:id/docker", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json([]);
  res.json(details.docker || []);
});

app.get("/api/servers/:id/filesystems", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json([]);
  res.json(details.filesystems || []);
});

app.get("/api/servers/:id/interfaces", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json([]);
  res.json(details.interfaces || []);
});

app.get("/api/servers/:id/users", (req, res) => {
  const details = serverDetails.get(req.params.id);
  if (!details) return res.json([]);
  res.json(details.loggedInUsers || []);
});

app.get("/api/servers/:id/logs", (req, res) => {
  const logs = serverLogs.get(req.params.id);
  const limit = Number(req.query.limit) || 200;
  const level = req.query.level; // filter by level
  let entries = logs || [];
  if (level) entries = entries.filter((l) => l.level === level);
  res.json(entries.slice(-limit));
});

// ── Serve frontend in production ─────────────────────────────────────
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

// ── HTTP + WebSocket server ──────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Connected dashboard clients
const dashboardClients = new Set();
// Connected agent clients: Map<serverId, ws>
const agentClients = new Map();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of dashboardClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

setBroadcast(broadcast);

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get("role");

  if (role === "agent") {
    // ── Agent connection ────────────────────────────────────────────
    let serverId = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);

        if (msg.type === "register") {
          serverId = msg.server.id;
          const now = Math.floor(Date.now() / 1000);
          stmts.upsertServer.run({
            id: msg.server.id,
            name: msg.server.name || msg.server.hostname,
            hostname: msg.server.hostname,
            ip: msg.server.ip || "",
            os: msg.server.os || "",
            platform: msg.server.platform || "",
            arch: msg.server.arch || "",
            status: "online",
            last_seen: now,
            meta: JSON.stringify(msg.server.meta || {}),
          });
          agentClients.set(serverId, ws);
          if (!serverLogs.has(serverId)) serverLogs.set(serverId, []);
          console.log(`[Agent] Registered: ${msg.server.name} (${serverId})`);

          broadcast({ type: "server:online", serverId, server: stmts.getServer.get(serverId) });
        }

        if (msg.type === "metrics" && serverId) {
          const now = Math.floor(Date.now() / 1000);
          const metricRow = {
            server_id: serverId,
            ts: now,
            cpu_pct: msg.data.cpu_pct ?? null,
            mem_total: msg.data.mem_total ?? null,
            mem_used: msg.data.mem_used ?? null,
            mem_pct: msg.data.mem_pct ?? null,
            disk_total: msg.data.disk_total ?? null,
            disk_used: msg.data.disk_used ?? null,
            disk_pct: msg.data.disk_pct ?? null,
            net_rx: msg.data.net_rx ?? null,
            net_tx: msg.data.net_tx ?? null,
            load_1: msg.data.load_1 ?? null,
            load_5: msg.data.load_5 ?? null,
            load_15: msg.data.load_15 ?? null,
            uptime: msg.data.uptime ?? null,
            processes: msg.data.processes ?? null,
            temp: msg.data.temp ?? null,
          };

          stmts.insertMetric.run(metricRow);
          stmts.updateServerStatus.run(
            stmts.getServer.get(serverId)?.status === "critical" ? "critical" :
            stmts.getServer.get(serverId)?.status === "warning" ? "warning" : "online",
            now, serverId
          );

          // Evaluate alert rules
          evaluateMetric(serverId, metricRow);

          // Push live metric to dashboards (include extra fields)
          broadcast({
            type: "metric",
            serverId,
            data: {
              ...metricRow,
              cpu_cores: msg.data.cpu_cores || [],
              mem_available: msg.data.mem_available,
              mem_swap_total: msg.data.mem_swap_total,
              mem_swap_used: msg.data.mem_swap_used,
              battery_pct: msg.data.battery_pct,
              battery_charging: msg.data.battery_charging,
            },
          });
        }

        // ── Detailed snapshot (processes, ports, docker, etc.) ──────
        if (msg.type === "details" && serverId) {
          serverDetails.set(serverId, { ...msg.data, _updated: Date.now() });

          broadcast({
            type: "details",
            serverId,
            data: msg.data,
          });
        }

        // ── Individual log entry (real-time stream) ─────────────────
        if (msg.type === "log" && serverId) {
          const logs = serverLogs.get(serverId) || [];
          logs.push(msg.entry);
          if (logs.length > MAX_LOG_ENTRIES) logs.shift();
          serverLogs.set(serverId, logs);

          broadcast({
            type: "log",
            serverId,
            entry: msg.entry,
          });
        }

        // ── Bulk log snapshot (on reconnect) ────────────────────────
        if (msg.type === "logs:snapshot" && serverId) {
          const logs = serverLogs.get(serverId) || [];
          for (const entry of (msg.entries || [])) {
            logs.push(entry);
            if (logs.length > MAX_LOG_ENTRIES) logs.shift();
          }
          serverLogs.set(serverId, logs);
        }

      } catch (err) {
        console.error("[Agent] Bad message:", err.message);
      }
    });

    ws.on("close", () => {
      if (serverId) {
        agentClients.delete(serverId);
        const now = Math.floor(Date.now() / 1000);
        stmts.updateServerStatus.run("offline", now, serverId);
        broadcast({ type: "server:offline", serverId });
        console.log(`[Agent] Disconnected: ${serverId}`);
      }
    });
  } else {
    // ── Dashboard client connection ─────────────────────────────────
    dashboardClients.add(ws);

    // Send current subscription info
    ws.send(JSON.stringify({
      type: "init",
      serverCount: agentClients.size,
      connectedServers: [...agentClients.keys()],
    }));

    // Handle dashboard requests for specific server data
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);

        // Dashboard can request logs/details for a specific server
        if (msg.type === "subscribe:logs" && msg.serverId) {
          const logs = serverLogs.get(msg.serverId) || [];
          ws.send(JSON.stringify({
            type: "logs:snapshot",
            serverId: msg.serverId,
            entries: logs.slice(-200),
          }));
        }

        if (msg.type === "subscribe:details" && msg.serverId) {
          const details = serverDetails.get(msg.serverId);
          if (details) {
            ws.send(JSON.stringify({
              type: "details",
              serverId: msg.serverId,
              data: details,
            }));
          }
        }
      } catch (err) {
        // ignore
      }
    });

    console.log(`[Dashboard] Client connected (${dashboardClients.size} total)`);
    ws.on("close", () => {
      dashboardClients.delete(ws);
      console.log(`[Dashboard] Client disconnected (${dashboardClients.size} total)`);
    });
  }
});

// ── Maintenance: prune old metrics ───────────────────────────────────
const RETENTION_DAYS = Number(process.env.METRIC_RETENTION_DAYS) || 30;
setInterval(() => {
  const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 86400;
  const { changes } = stmts.pruneMetrics.run(cutoff);
  if (changes > 0) console.log(`[Maintenance] Pruned ${changes} old metric rows`);
}, 60 * 60 * 1000);

// ── Offline detection: mark servers offline if no heartbeat ──────────
setInterval(() => {
  const servers = stmts.getServers.all();
  const now = Math.floor(Date.now() / 1000);
  for (const s of servers) {
    if (s.status !== "offline" && s.last_seen && (now - s.last_seen) > 60) {
      stmts.updateServerStatus.run("offline", now, s.id);
      broadcast({ type: "server:offline", serverId: s.id });
      console.log(`[Monitor] Server ${s.name} marked offline (no heartbeat)`);
    }
  }
}, 30000);

// ── Default alert rules (seed once) ─────────────────────────────────
const { v4: uuidv4 } = require("uuid");
const existingRules = stmts.getRules.all();
if (existingRules.length === 0) {
  const defaults = [
    { metric: "cpu_pct", operator: "gt", threshold: 90, severity: "critical", duration_s: 30 },
    { metric: "cpu_pct", operator: "gt", threshold: 75, severity: "warning", duration_s: 60 },
    { metric: "mem_pct", operator: "gt", threshold: 90, severity: "critical", duration_s: 10 },
    { metric: "mem_pct", operator: "gt", threshold: 80, severity: "warning", duration_s: 30 },
    { metric: "disk_pct", operator: "gt", threshold: 90, severity: "critical", duration_s: 0 },
    { metric: "disk_pct", operator: "gt", threshold: 80, severity: "warning", duration_s: 0 },
  ];
  for (const d of defaults) {
    stmts.insertRule.run({
      id: uuidv4(),
      server_id: null,
      metric: d.metric,
      operator: d.operator,
      threshold: d.threshold,
      duration_s: d.duration_s,
      severity: d.severity,
      enabled: 1,
      cooldown_s: 300,
    });
  }
  console.log("[Init] Seeded default alert rules");
}

// ── Start ────────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  console.log(`
  ╦ ╦┌─┐┌┬┐┌─┐┬ ┬╔═╗  v2.0 — Full-Spectrum Monitoring
  ║║║├─┤ │ │  ├─┤╚═╗
  ╚╩╝┴ ┴ ┴ └─┘┴ ┴╚═╝
  
  Server:     http://${HOST}:${PORT}
  WebSocket:  ws://${HOST}:${PORT}/ws
  API:        http://${HOST}:${PORT}/api

  New endpoints:
    /api/servers/:id/details       — full system snapshot
    /api/servers/:id/processes     — top processes by CPU/RAM
    /api/servers/:id/ports         — listening ports & connections
    /api/servers/:id/services      — running services
    /api/servers/:id/docker        — Docker containers
    /api/servers/:id/filesystems   — mounted filesystems
    /api/servers/:id/interfaces    — network interfaces
    /api/servers/:id/users         — logged-in users
    /api/servers/:id/logs          — system log entries
  `);
});
