// server/db.js — SQLite database initialization and helpers
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "./data/watchx.db";
const dbDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.resolve(DB_PATH));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    hostname    TEXT,
    ip          TEXT,
    os          TEXT,
    platform    TEXT,
    arch        TEXT,
    status      TEXT DEFAULT 'offline',  -- online | offline | warning | critical
    last_seen   INTEGER,
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    meta        TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id   TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    ts          INTEGER NOT NULL,
    cpu_pct     REAL,
    mem_total   REAL,
    mem_used    REAL,
    mem_pct     REAL,
    disk_total  REAL,
    disk_used   REAL,
    disk_pct    REAL,
    net_rx      REAL,    -- bytes/sec received
    net_tx      REAL,    -- bytes/sec transmitted
    load_1      REAL,
    load_5      REAL,
    load_15     REAL,
    uptime      REAL,
    processes   INTEGER,
    temp        REAL
  );
  CREATE INDEX IF NOT EXISTS idx_metrics_server_ts ON metrics(server_id, ts);

  CREATE TABLE IF NOT EXISTS alert_rules (
    id          TEXT PRIMARY KEY,
    server_id   TEXT REFERENCES servers(id) ON DELETE CASCADE,  -- NULL = global
    metric      TEXT NOT NULL,       -- cpu_pct | mem_pct | disk_pct | temp | custom
    operator    TEXT NOT NULL,       -- gt | lt | gte | lte | eq
    threshold   REAL NOT NULL,
    duration_s  INTEGER DEFAULT 0,   -- sustained duration before firing
    severity    TEXT DEFAULT 'warning',  -- info | warning | critical
    enabled     INTEGER DEFAULT 1,
    cooldown_s  INTEGER DEFAULT 300,
    created_at  INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT REFERENCES alert_rules(id) ON DELETE SET NULL,
    server_id   TEXT REFERENCES servers(id) ON DELETE CASCADE,
    metric      TEXT NOT NULL,
    value       REAL,
    threshold   REAL,
    severity    TEXT,
    message     TEXT,
    status      TEXT DEFAULT 'active',   -- active | acknowledged | resolved
    fired_at    INTEGER NOT NULL,
    resolved_at INTEGER,
    ack_at      INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_server ON alerts(server_id, fired_at);
`);

// ── Prepared statements ──────────────────────────────────────────────
const stmts = {
  // Servers
  upsertServer: db.prepare(`
    INSERT INTO servers (id, name, hostname, ip, os, platform, arch, status, last_seen, meta)
    VALUES (@id, @name, @hostname, @ip, @os, @platform, @arch, @status, @last_seen, @meta)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, hostname=@hostname, ip=@ip, os=@os, platform=@platform,
      arch=@arch, status=@status, last_seen=@last_seen, meta=@meta
  `),
  getServers: db.prepare("SELECT * FROM servers ORDER BY name"),
  getServer: db.prepare("SELECT * FROM servers WHERE id = ?"),
  updateServerStatus: db.prepare("UPDATE servers SET status = ?, last_seen = ? WHERE id = ?"),
  deleteServer: db.prepare("DELETE FROM servers WHERE id = ?"),

  // Metrics
  insertMetric: db.prepare(`
    INSERT INTO metrics (server_id, ts, cpu_pct, mem_total, mem_used, mem_pct,
      disk_total, disk_used, disk_pct, net_rx, net_tx,
      load_1, load_5, load_15, uptime, processes, temp)
    VALUES (@server_id, @ts, @cpu_pct, @mem_total, @mem_used, @mem_pct,
      @disk_total, @disk_used, @disk_pct, @net_rx, @net_tx,
      @load_1, @load_5, @load_15, @uptime, @processes, @temp)
  `),
  getMetrics: db.prepare(`
    SELECT * FROM metrics WHERE server_id = ? AND ts >= ? AND ts <= ?
    ORDER BY ts ASC
  `),
  getLatestMetric: db.prepare(`
    SELECT * FROM metrics WHERE server_id = ? ORDER BY ts DESC LIMIT 1
  `),
  pruneMetrics: db.prepare("DELETE FROM metrics WHERE ts < ?"),

  // Alert Rules
  insertRule: db.prepare(`
    INSERT INTO alert_rules (id, server_id, metric, operator, threshold, duration_s, severity, enabled, cooldown_s)
    VALUES (@id, @server_id, @metric, @operator, @threshold, @duration_s, @severity, @enabled, @cooldown_s)
  `),
  updateRule: db.prepare(`
    UPDATE alert_rules SET metric=@metric, operator=@operator, threshold=@threshold,
      duration_s=@duration_s, severity=@severity, enabled=@enabled, cooldown_s=@cooldown_s
    WHERE id = @id
  `),
  deleteRule: db.prepare("DELETE FROM alert_rules WHERE id = ?"),
  getRules: db.prepare("SELECT * FROM alert_rules ORDER BY created_at DESC"),
  getRulesForServer: db.prepare(
    "SELECT * FROM alert_rules WHERE server_id = ? OR server_id IS NULL"
  ),

  // Alerts
  insertAlert: db.prepare(`
    INSERT INTO alerts (rule_id, server_id, metric, value, threshold, severity, message, status, fired_at)
    VALUES (@rule_id, @server_id, @metric, @value, @threshold, @severity, @message, @status, @fired_at)
  `),
  getAlerts: db.prepare(
    "SELECT * FROM alerts ORDER BY fired_at DESC LIMIT ?"
  ),
  getActiveAlerts: db.prepare(
    "SELECT * FROM alerts WHERE status = 'active' ORDER BY fired_at DESC"
  ),
  ackAlert: db.prepare(
    "UPDATE alerts SET status = 'acknowledged', ack_at = ? WHERE id = ?"
  ),
  resolveAlert: db.prepare(
    "UPDATE alerts SET status = 'resolved', resolved_at = ? WHERE id = ?"
  ),
  getLastFiredAlert: db.prepare(
    "SELECT * FROM alerts WHERE rule_id = ? AND server_id = ? ORDER BY fired_at DESC LIMIT 1"
  ),
};

module.exports = { db, stmts };
