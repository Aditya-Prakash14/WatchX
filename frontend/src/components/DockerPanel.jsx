// src/components/DockerPanel.jsx — Docker containers overview
import { Container, Play, Square, AlertCircle } from "lucide-react";
import { formatBytes } from "../lib/utils";

export default function DockerPanel({ containers = [] }) {
  if (containers.length === 0) return null; // Hide if no Docker

  const running = containers.filter((c) => c.state === "running").length;
  const stopped = containers.length - running;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Container className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white">Docker Containers</h3>
        </div>
        <div className="flex gap-2 text-xs text-gray-500">
          <span className="text-emerald-400">{running} running</span>
          {stopped > 0 && <span className="text-gray-500">{stopped} stopped</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {containers.map((c) => (
          <div
            key={c.id}
            className={`bg-gray-800/50 rounded-lg p-3 border ${
              c.state === "running" ? "border-emerald-500/20" : "border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {c.state === "running" ? (
                  <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-white truncate">{c.name}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                c.state === "running" ? "bg-emerald-500/15 text-emerald-400" :
                c.state === "exited" ? "bg-red-500/15 text-red-400" :
                "bg-gray-700 text-gray-400"
              }`}>
                {c.state}
              </span>
            </div>

            <div className="text-xs text-gray-500 mb-2 truncate" title={c.image}>
              {c.image}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">CPU:</span>
                <span className={`ml-1 ${c.cpu_pct > 80 ? "text-red-400" : "text-gray-300"}`}>
                  {c.cpu_pct?.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">RAM:</span>
                <span className="ml-1 text-gray-300">
                  {formatBytes(c.mem_usage)} / {formatBytes(c.mem_limit)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Net RX:</span>
                <span className="ml-1 text-gray-300">{formatBytes(c.net_rx)}</span>
              </div>
              <div>
                <span className="text-gray-500">Net TX:</span>
                <span className="ml-1 text-gray-300">{formatBytes(c.net_tx)}</span>
              </div>
            </div>

            {c.status && (
              <div className="text-[10px] text-gray-600 mt-2">{c.status}</div>
            )}

            {c.ports && c.ports.length > 0 && (
              <div className="text-[10px] text-gray-600 mt-1">
                Ports: {c.ports.map((p) => typeof p === "string" ? p : `${p.PrivatePort}→${p.PublicPort || "?"}`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
