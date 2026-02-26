// src/components/PortsServices.jsx — Listening ports, network connections, and services
import { useState } from "react";
import { Globe, Radio, Plug, Unplug, Search } from "lucide-react";

function PortsTable({ ports = [] }) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? ports.filter(
        (p) =>
          String(p.port).includes(search) ||
          p.process?.toLowerCase().includes(search.toLowerCase()) ||
          p.address?.includes(search)
      )
    : ports;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-medium text-white">Listening Ports</h4>
          <span className="text-xs text-gray-500">({ports.length})</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search port…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-gray-600 w-40 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-900">
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Port</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Protocol</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Address</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">PID</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Process</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.map((p, i) => (
              <tr key={`${p.port}-${p.protocol}-${i}`} className="hover:bg-gray-800/40">
                <td className="px-2 py-1.5">
                  <span className="font-mono text-brand-400 font-medium">{p.port}</span>
                </td>
                <td className="px-2 py-1.5 text-gray-400 uppercase">{p.protocol}</td>
                <td className="px-2 py-1.5 text-gray-400 font-mono">{p.address || "*"}</td>
                <td className="px-2 py-1.5 text-gray-500 font-mono">{p.pid || "—"}</td>
                <td className="px-2 py-1.5 text-gray-300">{p.process || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-600 py-4 text-xs">No matching ports.</p>}
      </div>
    </div>
  );
}

function ConnectionSummary({ summary = {} }) {
  const items = [
    { label: "Total", value: summary.total || 0, color: "text-gray-300" },
    { label: "Established", value: summary.established || 0, color: "text-emerald-400" },
    { label: "Listening", value: summary.listening || 0, color: "text-brand-400" },
    { label: "TIME_WAIT", value: summary.time_wait || 0, color: "text-amber-400" },
    { label: "CLOSE_WAIT", value: summary.close_wait || 0, color: "text-red-400" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Plug className="w-4 h-4 text-brand-400" />
        <h4 className="text-sm font-medium text-white">Connection Summary</h4>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {items.map((it) => (
          <div key={it.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className={`text-xl font-bold ${it.color}`}>{it.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionsTable({ connections = [] }) {
  const [stateFilter, setStateFilter] = useState("all");
  const states = ["all", "ESTABLISHED", "TIME_WAIT", "CLOSE_WAIT", "SYN_SENT", "FIN_WAIT"];
  const filtered = stateFilter === "all" ? connections : connections.filter((c) => c.state === stateFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-violet-400" />
          <h4 className="text-sm font-medium text-white">Active Connections</h4>
          <span className="text-xs text-gray-500">({filtered.length})</span>
        </div>
        <div className="flex gap-1">
          {states.map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                stateFilter === s ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-900">
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Protocol</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Local</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Remote</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">State</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Process</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.slice(0, 100).map((c, i) => (
              <tr key={i} className="hover:bg-gray-800/40">
                <td className="px-2 py-1 text-gray-400 uppercase font-mono">{c.protocol}</td>
                <td className="px-2 py-1 text-gray-300 font-mono">{c.localAddress}:{c.localPort}</td>
                <td className="px-2 py-1 text-gray-400 font-mono">{c.peerAddress}:{c.peerPort}</td>
                <td className="px-2 py-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    c.state === "ESTABLISHED" ? "bg-emerald-500/15 text-emerald-400" :
                    c.state === "LISTEN" || c.state === "LISTENING" ? "bg-brand-500/15 text-brand-400" :
                    c.state === "TIME_WAIT" ? "bg-amber-500/15 text-amber-400" :
                    c.state === "CLOSE_WAIT" ? "bg-red-500/15 text-red-400" :
                    "bg-gray-700 text-gray-400"
                  }`}>
                    {c.state}
                  </span>
                </td>
                <td className="px-2 py-1 text-gray-500">{c.process || c.pid || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-600 py-4 text-xs">No connections.</p>}
      </div>
    </div>
  );
}

function ServicesTable({ services = [] }) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? services : services.filter((s) => s.running);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Unplug className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-medium text-white">Services</h4>
          <span className="text-xs text-gray-500">
            ({services.filter((s) => s.running).length} running / {services.length} total)
          </span>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showAll ? "Running only" : "Show all"}
        </button>
      </div>
      <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-900">
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Service</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Status</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">PIDs</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">CPU %</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">MEM %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {display.map((s, i) => (
              <tr key={`${s.name}-${i}`} className="hover:bg-gray-800/40">
                <td className="px-2 py-1.5 text-gray-300 font-medium">{s.name}</td>
                <td className="px-2 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    s.running ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-500"
                  }`}>
                    {s.running ? "running" : "stopped"}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-gray-500 font-mono">
                  {(s.pids || []).join(", ") || "—"}
                </td>
                <td className="px-2 py-1.5 text-gray-400">{s.cpu?.toFixed(1) || "—"}</td>
                <td className="px-2 py-1.5 text-gray-400">{s.mem?.toFixed(1) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {display.length === 0 && <p className="text-center text-gray-600 py-4 text-xs">No services detected.</p>}
      </div>
    </div>
  );
}

export default function PortsServices({ ports = [], connections = [], connSummary = {}, services = [] }) {
  return (
    <div className="card space-y-6">
      <ConnectionSummary summary={connSummary} />
      <PortsTable ports={ports} />
      <ConnectionsTable connections={connections} />
      {services.length > 0 && <ServicesTable services={services} />}
    </div>
  );
}
