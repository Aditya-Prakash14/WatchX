// src/components/ServerList.jsx — Server cards grid
import { Server, Cpu, MemoryStick, HardDrive, Clock } from "lucide-react";
import { formatPct, formatBytes, formatUptime, timeAgo, cn } from "../lib/utils";

function StatusDot({ status }) {
  const colors = {
    online: "bg-emerald-400 shadow-emerald-400/50",
    warning: "bg-amber-400 shadow-amber-400/50 animate-pulse",
    critical: "bg-red-400 shadow-red-400/50 animate-pulse",
    offline: "bg-gray-500",
  };
  return (
    <span className={cn("inline-block w-2.5 h-2.5 rounded-full shadow-lg", colors[status] || colors.offline)} />
  );
}

function MiniGauge({ label, pct, icon: Icon, color }) {
  const c = pct > 90 ? "bg-red-500" : pct > 75 ? "bg-amber-500" : `bg-${color}-500`;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
        <Icon className="w-3 h-3" />
        <span>{label}</span>
        <span className="ml-auto font-medium text-gray-200">{formatPct(pct)}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", c)}
          style={{ width: `${Math.min(pct || 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function ServerList({ servers, onSelectServer }) {
  if (!servers || servers.length === 0) {
    return (
      <div className="card text-center py-12">
        <Server className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No servers connected yet.</p>
        <p className="text-gray-600 text-sm mt-1">Start the WatchX agent on a server to begin monitoring.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {servers.map((server) => {
        const m = server.latest_metric;
        return (
          <button
            key={server.id}
            onClick={() => onSelectServer(server.id)}
            className="card text-left hover:border-brand-600/50 hover:bg-gray-900/80 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand-600/20 transition-colors">
                  <Server className="w-5 h-5 text-gray-400 group-hover:text-brand-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{server.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{server.hostname} · {server.ip}</p>
                </div>
              </div>
              <div className={`badge-${server.status}`}>
                <StatusDot status={server.status} />
                {server.status}
              </div>
            </div>

            {m ? (
              <div className="flex gap-4">
                <MiniGauge label="CPU" pct={m.cpu_pct} icon={Cpu} color="brand" />
                <MiniGauge label="RAM" pct={m.mem_pct} icon={MemoryStick} color="violet" />
                <MiniGauge label="Disk" pct={m.disk_pct} icon={HardDrive} color="cyan" />
              </div>
            ) : (
              <p className="text-xs text-gray-600">Awaiting first metrics…</p>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500">
              <span>{server.os}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {m ? formatUptime(m.uptime) : "—"} uptime
              </span>
              <span>seen {timeAgo(server.last_seen)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
