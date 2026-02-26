// agent/index.js — WatchX full-spectrum metrics collection agent
// Collects: CPU, RAM, disk, network, processes, listening ports, services,
// Docker containers, filesystem mounts, network interfaces, and system logs.

const os = require("os");
const si = require("systeminformation");
const { execSync, spawn } = require("child_process");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

// ── Configuration ────────────────────────────────────────────────────
const SERVER_URL = process.env.WATCHX_SERVER || "ws://localhost:3001/ws?role=agent";
const INTERVAL_MS = Number(process.env.COLLECT_INTERVAL_MS) || 5000;
const DETAIL_INTERVAL_MS = Number(process.env.DETAIL_INTERVAL_MS) || 15000; // ports/procs/docker
const LOG_LINES = Number(process.env.LOG_LINES) || 200;
const SERVER_ID = process.env.SERVER_ID || uuidv4();
const SERVER_NAME = process.env.SERVER_NAME || os.hostname();

let ws = null;
let reconnectTimer = null;
let collectTimer = null;
let detailTimer = null;
let logTailProc = null;

// ── System info (collected once on startup) ──────────────────────────
async function getServerInfo() {
  const [osInfo, net, cpu, system] = await Promise.all([
    si.osInfo(),
    si.networkInterfaces(),
    si.cpu(),
    si.system(),
  ]);

  const primaryNet = (Array.isArray(net) ? net : [net]).find(
    (n) => !n.internal && n.ip4
  );

  return {
    id: SERVER_ID,
    name: SERVER_NAME,
    hostname: os.hostname(),
    ip: primaryNet?.ip4 || "127.0.0.1",
    os: `${osInfo.distro} ${osInfo.release}`,
    platform: osInfo.platform,
    arch: osInfo.arch,
    kernel: osInfo.kernel,
    meta: {
      cpus: os.cpus().length,
      cpu_model: cpu.brand,
      cpu_speed: cpu.speed,
      totalMem: os.totalmem(),
      manufacturer: system.manufacturer,
      model: system.model,
    },
  };
}

// ── Core metric collection (every 5s) ────────────────────────────────
let prevNet = null;
let prevNetTs = null;

async function collectMetrics() {
  const [cpu, mem, disk, procs, temp, netStats, battery] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.processes(),
    si.cpuTemperature().catch(() => ({ main: null })),
    si.networkStats(),
    si.battery().catch(() => ({ hasBattery: false })),
  ]);

  // Per-CPU core usage
  const cpuCores = (cpu.cpus || []).map((c, i) => ({
    core: i,
    load: c.load ?? 0,
  }));

  // Aggregate disk
  const diskTotal = disk.reduce((s, d) => s + d.size, 0);
  const diskUsed = disk.reduce((s, d) => s + d.used, 0);

  // Network throughput
  const netNow = (Array.isArray(netStats) ? netStats : [netStats]).reduce(
    (acc, n) => ({ rx: acc.rx + (n.rx_bytes || 0), tx: acc.tx + (n.tx_bytes || 0) }),
    { rx: 0, tx: 0 }
  );
  const nowTs = Date.now();
  let netRx = 0, netTx = 0;
  if (prevNet && prevNetTs) {
    const dt = (nowTs - prevNetTs) / 1000;
    if (dt > 0) {
      netRx = Math.max(0, (netNow.rx - prevNet.rx) / dt);
      netTx = Math.max(0, (netNow.tx - prevNet.tx) / dt);
    }
  }
  prevNet = netNow;
  prevNetTs = nowTs;

  return {
    cpu_pct: cpu.currentLoad ?? 0,
    cpu_cores: cpuCores,
    mem_total: mem.total,
    mem_used: mem.active,
    mem_pct: mem.total > 0 ? (mem.active / mem.total) * 100 : 0,
    mem_available: mem.available,
    mem_swap_total: mem.swaptotal,
    mem_swap_used: mem.swapused,
    disk_total: diskTotal,
    disk_used: diskUsed,
    disk_pct: diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0,
    net_rx: netRx,
    net_tx: netTx,
    load_1: os.loadavg()[0],
    load_5: os.loadavg()[1],
    load_15: os.loadavg()[2],
    uptime: os.uptime(),
    processes: procs.all ?? 0,
    temp: temp.main,
    battery_pct: battery.hasBattery ? battery.percent : null,
    battery_charging: battery.hasBattery ? battery.isCharging : null,
  };
}

// ── Detailed snapshot (every 15s) — processes, ports, docker, fs, net ─
async function collectDetails() {
  const [procs, conns, services, dockerContainers, fsSizes, netIfaces, users] =
    await Promise.all([
      si.processes(),
      si.networkConnections().catch(() => []),
      si.services("*").catch(() => []),
      si.dockerContainers().catch(() => []),
      si.fsSize(),
      si.networkInterfaces(),
      si.users().catch(() => []),
    ]);

  // ── Top processes by CPU & Memory ──────────────────────────────
  const sorted = (procs.list || [])
    .filter((p) => p.cpu > 0 || p.mem > 0)
    .sort((a, b) => b.cpu - a.cpu);

  const topProcesses = sorted.slice(0, 50).map((p) => ({
    pid: p.pid,
    name: p.name,
    command: (p.command || "").substring(0, 200),
    cpu: p.cpu,
    mem: p.mem,
    mem_rss: p.memRss ? p.memRss * 1024 : 0, // KB → bytes
    state: p.state,
    user: p.user || "",
    started: p.started || "",
  }));

  // ── Listening ports & active connections ───────────────────────
  const connections = (Array.isArray(conns) ? conns : []).map((c) => ({
    protocol: c.protocol,
    localAddress: c.localAddress,
    localPort: c.localPort,
    peerAddress: c.peerAddress,
    peerPort: c.peerPort,
    state: c.state,
    pid: c.pid,
    process: c.process || "",
  }));

  const listeningPorts = connections
    .filter((c) => c.state === "LISTEN" || c.state === "LISTENING")
    .reduce((acc, c) => {
      // Dedupe by port+protocol
      const key = `${c.protocol}:${c.localPort}`;
      if (!acc.find((p) => `${p.protocol}:${p.port}` === key)) {
        acc.push({
          port: c.localPort,
          protocol: c.protocol,
          address: c.localAddress,
          pid: c.pid,
          process: c.process,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.port - b.port);

  // ── Services ───────────────────────────────────────────────────
  const serviceList = (Array.isArray(services) ? services : []).map((s) => ({
    name: s.name,
    running: s.running,
    startmode: s.startmode || "",
    pids: s.pids || [],
    cpu: s.cpu ?? 0,
    mem: s.mem ?? 0,
  }));

  // ── Docker containers ──────────────────────────────────────────
  const docker = (Array.isArray(dockerContainers) ? dockerContainers : []).map((c) => ({
    id: c.id?.substring(0, 12),
    name: c.name,
    image: c.image,
    state: c.state,
    status: c.status,
    ports: c.ports || [],
    started: c.startedAt,
    cpu_pct: c.cpuPercent ?? 0,
    mem_usage: c.memUsage ?? 0,
    mem_limit: c.memLimit ?? 0,
    net_rx: c.netIO?.rx ?? 0,
    net_tx: c.netIO?.tx ?? 0,
  }));

  // ── Filesystem mounts ──────────────────────────────────────────
  const filesystems = fsSizes.map((f) => ({
    fs: f.fs,
    type: f.type,
    mount: f.mount,
    size: f.size,
    used: f.used,
    available: f.available,
    use_pct: f.use,
    rw: f.rw,
  }));

  // ── Network interfaces ─────────────────────────────────────────
  const interfaces = (Array.isArray(netIfaces) ? netIfaces : [netIfaces]).map((n) => ({
    iface: n.iface,
    ip4: n.ip4,
    ip6: n.ip6,
    mac: n.mac,
    speed: n.speed,
    type: n.type,
    operstate: n.operstate,
    internal: n.internal,
    dhcp: n.dhcp,
  }));

  // ── Logged-in users ────────────────────────────────────────────
  const loggedInUsers = (Array.isArray(users) ? users : []).map((u) => ({
    user: u.user,
    terminal: u.tty,
    login_time: u.date,
    ip: u.ip,
    command: u.command || "",
  }));

  // ── Connection summary ─────────────────────────────────────────
  const connSummary = {
    total: connections.length,
    established: connections.filter((c) => c.state === "ESTABLISHED").length,
    listening: listeningPorts.length,
    time_wait: connections.filter((c) => c.state === "TIME_WAIT").length,
    close_wait: connections.filter((c) => c.state === "CLOSE_WAIT").length,
  };

  return {
    topProcesses,
    listeningPorts,
    connections: connections.slice(0, 200), // cap to prevent huge payloads
    connSummary,
    services: serviceList,
    docker,
    filesystems,
    interfaces,
    loggedInUsers,
    processStats: {
      total: procs.all ?? 0,
      running: procs.running ?? 0,
      sleeping: procs.sleeping ?? 0,
      blocked: procs.blocked ?? 0,
      unknown: procs.unknown ?? 0,
    },
  };
}

// ── Log tailing ──────────────────────────────────────────────────────
function getLogCommand() {
  const platform = os.platform();
  if (platform === "linux") {
    // Try journalctl first, fall back to /var/log/syslog
    try {
      execSync("which journalctl", { stdio: "ignore" });
      return { cmd: "journalctl", args: ["-f", "-n", String(LOG_LINES), "--no-pager", "-o", "short-iso"] };
    } catch {
      return { cmd: "tail", args: ["-f", "-n", String(LOG_LINES), "/var/log/syslog"] };
    }
  } else if (platform === "darwin") {
    return { cmd: "log", args: ["stream", "--style", "compact", "--level", "default"] };
  }
  return null;
}

let logBuffer = [];
const MAX_LOG_BUFFER = 500;

function startLogTail() {
  const logCmd = getLogCommand();
  if (!logCmd) return;

  try {
    logTailProc = spawn(logCmd.cmd, logCmd.args, { stdio: ["ignore", "pipe", "pipe"] });

    logTailProc.stdout.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        const entry = {
          ts: Date.now(),
          message: line.substring(0, 500), // cap line length
          level: detectLogLevel(line),
        };
        logBuffer.push(entry);
        if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();

        // Stream to server in real-time
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "log", entry }));
        }
      }
    });

    logTailProc.stderr.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        const entry = { ts: Date.now(), message: line.substring(0, 500), level: "error" };
        logBuffer.push(entry);
        if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();
      }
    });

    logTailProc.on("close", () => {
      console.log("[WatchX Agent] Log tail process exited");
    });
  } catch (err) {
    console.error("[WatchX Agent] Failed to start log tail:", err.message);
  }
}

function detectLogLevel(line) {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("fatal") || lower.includes("crit")) return "error";
  if (lower.includes("warn")) return "warn";
  if (lower.includes("debug") || lower.includes("trace")) return "debug";
  return "info";
}

// ── WebSocket connection ─────────────────────────────────────────────
async function connect() {
  const serverInfo = await getServerInfo();

  console.log(`[WatchX Agent] Connecting to ${SERVER_URL}`);
  ws = new WebSocket(SERVER_URL);

  ws.on("open", () => {
    console.log("[WatchX Agent] Connected! Registering server...");
    ws.send(JSON.stringify({ type: "register", server: serverInfo }));

    // ── Core metrics loop (every 5s) ─────────────────────────────
    if (collectTimer) clearInterval(collectTimer);
    collectTimer = setInterval(async () => {
      try {
        const data = await collectMetrics();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "metrics", data }));
        }
      } catch (err) {
        console.error("[WatchX Agent] Metrics error:", err.message);
      }
    }, INTERVAL_MS);

    // Send first metrics immediately
    collectMetrics().then((data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "metrics", data }));
      }
    });

    // ── Detailed snapshot loop (every 15s) ───────────────────────
    if (detailTimer) clearInterval(detailTimer);
    detailTimer = setInterval(async () => {
      try {
        const details = await collectDetails();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "details", data: details }));
        }
      } catch (err) {
        console.error("[WatchX Agent] Details error:", err.message);
      }
    }, DETAIL_INTERVAL_MS);

    // Send first details immediately
    collectDetails().then((details) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "details", data: details }));
      }
    });

    // ── Start log tailing ────────────────────────────────────────
    startLogTail();

    // Send buffered logs snapshot
    if (logBuffer.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "logs:snapshot", entries: logBuffer.slice(-100) }));
    }
  });

  ws.on("close", () => {
    console.log("[WatchX Agent] Disconnected. Reconnecting in 5s...");
    if (collectTimer) clearInterval(collectTimer);
    if (detailTimer) clearInterval(detailTimer);
    if (logTailProc) { logTailProc.kill(); logTailProc = null; }
    reconnectTimer = setTimeout(connect, 5000);
  });

  ws.on("error", (err) => {
    console.error("[WatchX Agent] WS error:", err.message);
    ws.close();
  });
}

// ── Start ────────────────────────────────────────────────────────────
console.log(`
╦ ╦┌─┐┌┬┐┌─┐┬ ┬╔═╗  Agent v2.0
║║║├─┤ │ │  ├─┤╚═╗
╚╩╝┴ ┴ ┴ └─┘┴ ┴╚═╝  Full-Spectrum Monitoring

Server ID:    ${SERVER_ID}
Server Name:  ${SERVER_NAME}
Target:       ${SERVER_URL}
Metrics:      every ${INTERVAL_MS}ms
Details:      every ${DETAIL_INTERVAL_MS}ms (ports, procs, docker, fs)
Log tailing:  enabled
`);

connect().catch((err) => {
  console.error("[WatchX Agent] Fatal:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[WatchX Agent] Shutting down...");
  if (collectTimer) clearInterval(collectTimer);
  if (detailTimer) clearInterval(detailTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (logTailProc) logTailProc.kill();
  if (ws) ws.close();
  process.exit(0);
});
