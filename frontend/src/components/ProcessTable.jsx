// src/components/ProcessTable.jsx — Top processes by CPU/Memory
import { useState, useMemo } from "react";
import { Activity, Cpu, MemoryStick, Search, ArrowUpDown } from "lucide-react";
import { formatBytes } from "../lib/utils";

export default function ProcessTable({ processes = [], stats = {} }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("cpu"); // cpu | mem | pid | name
  const [sortDir, setSortDir] = useState("desc");

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = [...processes];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.command?.toLowerCase().includes(q) ||
          String(p.pid).includes(q) ||
          p.user?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let aVal = a[sortBy], bVal = b[sortBy];
      if (sortBy === "name") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [processes, search, sortBy, sortDir]);

  const SortHeader = ({ col, label, className = "" }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-300 select-none ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === col && (
          <ArrowUpDown className="w-3 h-3 text-brand-400" />
        )}
      </span>
    </th>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white">Processes</h3>
          <span className="text-xs text-gray-500">({processes.length} shown)</span>
        </div>
        {stats.total !== undefined && (
          <div className="flex gap-3 text-xs text-gray-500">
            <span>Total: <span className="text-gray-300">{stats.total}</span></span>
            <span>Running: <span className="text-emerald-400">{stats.running}</span></span>
            <span>Sleeping: <span className="text-gray-400">{stats.sleeping}</span></span>
            {stats.blocked > 0 && <span>Blocked: <span className="text-red-400">{stats.blocked}</span></span>}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name, command, PID, or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr>
              <SortHeader col="pid" label="PID" className="w-20" />
              <SortHeader col="name" label="Process" />
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <SortHeader col="cpu" label="CPU %" className="w-24" />
              <SortHeader col="mem" label="MEM %" className="w-24" />
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">RSS</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.slice(0, 100).map((p, i) => (
              <tr key={`${p.pid}-${i}`} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-3 py-1.5 text-gray-400 font-mono text-xs">{p.pid}</td>
                <td className="px-3 py-1.5">
                  <div className="text-white text-xs font-medium truncate max-w-[250px]">{p.name}</div>
                  {p.command && p.command !== p.name && (
                    <div className="text-gray-600 text-[10px] truncate max-w-[250px]" title={p.command}>
                      {p.command}
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5 text-gray-500 text-xs">{p.user}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.cpu > 80 ? "bg-red-500" : p.cpu > 50 ? "bg-amber-500" : "bg-brand-500"}`}
                        style={{ width: `${Math.min(p.cpu, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono ${p.cpu > 50 ? "text-amber-400" : "text-gray-300"}`}>
                      {p.cpu?.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.mem > 50 ? "bg-red-500" : p.mem > 20 ? "bg-violet-500" : "bg-violet-400"}`}
                        style={{ width: `${Math.min(p.mem, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-300">{p.mem?.toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-gray-400 text-xs font-mono">{formatBytes(p.mem_rss)}</td>
                <td className="px-3 py-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    p.state === "running" ? "bg-emerald-500/15 text-emerald-400" :
                    p.state === "sleeping" ? "bg-blue-500/15 text-blue-400" :
                    p.state === "blocked" ? "bg-red-500/15 text-red-400" :
                    "bg-gray-700 text-gray-400"
                  }`}>
                    {p.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">No processes match your search.</p>
        )}
      </div>
    </div>
  );
}
