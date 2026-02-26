// src/components/SystemInfo.jsx — Filesystem mounts, network interfaces, logged-in users
import { HardDrive, Network, Users, Wifi } from "lucide-react";
import { formatBytes, formatPct } from "../lib/utils";

function FilesystemTable({ filesystems = [] }) {
  if (filesystems.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <HardDrive className="w-4 h-4 text-cyan-400" />
        <h4 className="text-sm font-medium text-white">Filesystem Mounts</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Filesystem</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Mount</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Type</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Size</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Used</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Avail</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Use%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filesystems.map((f, i) => (
              <tr key={`${f.mount}-${i}`} className="hover:bg-gray-800/40">
                <td className="px-2 py-1.5 text-gray-400 font-mono truncate max-w-[150px]" title={f.fs}>
                  {f.fs}
                </td>
                <td className="px-2 py-1.5 text-gray-300 font-mono">{f.mount}</td>
                <td className="px-2 py-1.5 text-gray-500">{f.type}</td>
                <td className="px-2 py-1.5 text-gray-400 font-mono">{formatBytes(f.size)}</td>
                <td className="px-2 py-1.5 text-gray-400 font-mono">{formatBytes(f.used)}</td>
                <td className="px-2 py-1.5 text-gray-400 font-mono">{formatBytes(f.available)}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          f.use_pct > 90 ? "bg-red-500" : f.use_pct > 75 ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                        style={{ width: `${Math.min(f.use_pct || 0, 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono ${
                      f.use_pct > 90 ? "text-red-400" : f.use_pct > 75 ? "text-amber-400" : "text-gray-300"
                    }`}>
                      {formatPct(f.use_pct)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InterfacesTable({ interfaces = [] }) {
  if (interfaces.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Wifi className="w-4 h-4 text-violet-400" />
        <h4 className="text-sm font-medium text-white">Network Interfaces</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Interface</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">IPv4</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">MAC</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Type</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Speed</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">State</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">DHCP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {interfaces.map((n, i) => (
              <tr key={`${n.iface}-${i}`} className="hover:bg-gray-800/40">
                <td className="px-2 py-1.5 text-gray-300 font-medium">{n.iface}</td>
                <td className="px-2 py-1.5 text-gray-400 font-mono">{n.ip4 || "—"}</td>
                <td className="px-2 py-1.5 text-gray-500 font-mono">{n.mac}</td>
                <td className="px-2 py-1.5 text-gray-500">{n.type}</td>
                <td className="px-2 py-1.5 text-gray-400">
                  {n.speed ? `${n.speed} Mbps` : "—"}
                </td>
                <td className="px-2 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    n.operstate === "up" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-500"
                  }`}>
                    {n.operstate || "unknown"}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-gray-500">{n.dhcp ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTable({ users = [] }) {
  if (users.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-medium text-white">Logged-in Users</h4>
        <span className="text-xs text-gray-500">({users.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">User</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Terminal</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Login Time</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">IP</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Command</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {users.map((u, i) => (
              <tr key={`${u.user}-${i}`} className="hover:bg-gray-800/40">
                <td className="px-2 py-1.5 text-gray-300 font-medium">{u.user}</td>
                <td className="px-2 py-1.5 text-gray-500 font-mono">{u.terminal || "—"}</td>
                <td className="px-2 py-1.5 text-gray-400">{u.login_time || "—"}</td>
                <td className="px-2 py-1.5 text-gray-500 font-mono">{u.ip || "—"}</td>
                <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]">{u.command || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SystemInfo({ filesystems = [], interfaces = [], users = [] }) {
  return (
    <div className="card space-y-6">
      <FilesystemTable filesystems={filesystems} />
      <InterfacesTable interfaces={interfaces} />
      <UsersTable users={users} />
    </div>
  );
}
