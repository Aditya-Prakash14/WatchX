// src/components/ServerDetail.jsx — Full server monitoring with tabbed sub-views
import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, Cpu, MemoryStick, HardDrive, Network, Thermometer, Activity,
  List, Globe, ScrollText, Container, Server,
} from "lucide-react";
import { api } from "../hooks/useApi";
import { formatPct, formatBytes, formatBytesPerSec, formatUptime, timeAgo } from "../lib/utils";
import MetricChart from "./MetricChart";
import ProcessTable from "./ProcessTable";
import PortsServices from "./PortsServices";
import LogViewer from "./LogViewer";
import DockerPanel from "./DockerPanel";
import SystemInfo from "./SystemInfo";

function StatRow({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 text-gray-500 shrink-0" />
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="ml-auto font-medium text-white text-sm">{value}</span>
      {sub && <span className="text-xs text-gray-500 ml-1">{sub}</span>}
    </div>
  );
}

const SUB_TABS = [
  { id: "metrics",   label: "Metrics",          icon: Activity },
  { id: "processes", label: "Processes",         icon: List },
  { id: "network",   label: "Ports & Services",  icon: Globe },
  { id: "logs",      label: "Logs",              icon: ScrollText },
  { id: "docker",    label: "Docker",            icon: Container },
  { id: "system",    label: "System",            icon: Server },
];

export default function ServerDetail({ serverId, onBack, liveMetrics, liveDetails, liveLogs }) {
  const [server, setServer] = useState(null);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState("1h");
  const [subTab, setSubTab] = useState("metrics");

  const rangeSeconds = { "15m": 900, "1h": 3600, "6h": 21600, "24h": 86400 };

  // Fetch server info
  useEffect(() => {
    api.getServer(serverId).then(setServer).catch(console.error);
  }, [serverId]);

  // Fetch historical metrics
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (rangeSeconds[range] || 3600);
    api.getMetrics(serverId, from, now).then(setHistory).catch(console.error);
  }, [serverId, range]);

  // Merge live metrics into history
  const data = useMemo(() => {
    const live = liveMetrics[serverId] || [];
    const combined = [...history];
    const existingTs = new Set(combined.map((m) => m.ts));
    for (const m of live) {
      if (!existingTs.has(m.ts)) combined.push(m);
    }
    combined.sort((a, b) => a.ts - b.ts);
    const cutoff = Math.floor(Date.now() / 1000) - (rangeSeconds[range] || 3600);
    return combined.filter((m) => m.ts >= cutoff);
  }, [history, liveMetrics, serverId, range]);

  const latest = data.length > 0 ? data[data.length - 1] : null;

  // Destructure live details
  const details = liveDetails || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{server?.name || serverId}</h2>
          <p className="text-sm text-gray-500">
            {server?.hostname} · {server?.ip} · {server?.os}
          </p>
        </div>
        {server && (
          <span className={`badge-${server.status} ml-auto`}>{server.status}</span>
        )}
      </div>

      {/* Sub-tab navigation */}
      <nav className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-6 overflow-x-auto">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                subTab === t.id
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ── Metrics tab ───────────────────────────────────────────── */}
      {subTab === "metrics" && (
        <>
          {/* Time range selector */}
          <div className="flex gap-2 mb-6">
            {Object.keys(rangeSeconds).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-brand-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Current stats */}
          {latest && (
            <div className="card mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Current Status</h3>
              <div className="divide-y divide-gray-800">
                <StatRow icon={Cpu}         label="CPU Usage"    value={formatPct(latest.cpu_pct)} />
                <StatRow icon={MemoryStick} label="Memory"       value={formatPct(latest.mem_pct)} sub={`${formatBytes(latest.mem_used)} / ${formatBytes(latest.mem_total)}`} />
                <StatRow icon={HardDrive}   label="Disk"         value={formatPct(latest.disk_pct)} sub={`${formatBytes(latest.disk_used)} / ${formatBytes(latest.disk_total)}`} />
                <StatRow icon={Network}     label="Network RX"   value={formatBytesPerSec(latest.net_rx)} />
                <StatRow icon={Network}     label="Network TX"   value={formatBytesPerSec(latest.net_tx)} />
                <StatRow icon={Thermometer} label="Temperature"  value={latest.temp != null ? `${latest.temp.toFixed(0)}°C` : "—"} />
                <StatRow icon={Activity}    label="Load Average"  value={`${(latest.load_1 || 0).toFixed(2)} / ${(latest.load_5 || 0).toFixed(2)} / ${(latest.load_15 || 0).toFixed(2)}`} />
              </div>
            </div>
          )}

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricChart data={data} dataKey="cpu_pct"  label="CPU Usage"   unit="%" color="brand"   domain={[0, 100]} />
            <MetricChart data={data} dataKey="mem_pct"  label="Memory Usage" unit="%" color="violet"  domain={[0, 100]} />
            <MetricChart data={data} dataKey="disk_pct" label="Disk Usage"  unit="%" color="cyan"    domain={[0, 100]} />
            <MetricChart data={data} dataKey="load_1"   label="Load Avg (1m)" unit=""  color="amber" />
            <MetricChart data={data} dataKey="net_rx"   label="Network RX"  unit=" B/s" color="emerald" />
            <MetricChart data={data} dataKey="net_tx"   label="Network TX"  unit=" B/s" color="red" />
          </div>
        </>
      )}

      {/* ── Processes tab ─────────────────────────────────────────── */}
      {subTab === "processes" && (
        <ProcessTable
          processes={details.processes || []}
          stats={details.processStats || {}}
        />
      )}

      {/* ── Ports & Services tab ──────────────────────────────────── */}
      {subTab === "network" && (
        <PortsServices
          ports={details.ports || []}
          connections={details.connections || []}
          connSummary={details.connSummary || {}}
          services={details.services || []}
        />
      )}

      {/* ── Logs tab ──────────────────────────────────────────────── */}
      {subTab === "logs" && (
        <LogViewer logs={liveLogs || []} />
      )}

      {/* ── Docker tab ────────────────────────────────────────────── */}
      {subTab === "docker" && (
        <DockerPanel containers={details.docker || []} />
      )}

      {/* ── System tab ────────────────────────────────────────────── */}
      {subTab === "system" && (
        <SystemInfo
          filesystems={details.filesystems || []}
          interfaces={details.interfaces || []}
          users={details.users || []}
        />
      )}
    </div>
  );
}
