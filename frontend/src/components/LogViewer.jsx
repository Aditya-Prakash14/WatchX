// src/components/LogViewer.jsx — Real-time system log viewer with filtering
import { useState, useEffect, useRef, useMemo } from "react";
import { ScrollText, Search, Pause, Play, ArrowDown, Filter } from "lucide-react";

const LEVEL_COLORS = {
  error: "text-red-400 bg-red-500/10",
  warn: "text-amber-400 bg-amber-500/10",
  info: "text-blue-400 bg-blue-500/10",
  debug: "text-gray-500 bg-gray-500/10",
};

export default function LogViewer({ logs = [] }) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef(null);
  const prevLenRef = useRef(0);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && !paused && containerRef.current && logs.length > prevLenRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevLenRef.current = logs.length;
  }, [logs, autoScroll, paused]);

  const filtered = useMemo(() => {
    let entries = paused ? logs.slice(0, prevLenRef.current) : logs;
    if (levelFilter !== "all") {
      entries = entries.filter((l) => l.level === levelFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter((l) => l.message?.toLowerCase().includes(q));
    }
    return entries;
  }, [logs, search, levelFilter, paused]);

  // Level counts
  const counts = useMemo(() => {
    const c = { error: 0, warn: 0, info: 0, debug: 0 };
    for (const l of logs) c[l.level] = (c[l.level] || 0) + 1;
    return c;
  }, [logs]);

  const formatTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white">System Logs</h3>
          <span className="text-xs text-gray-500">({logs.length} entries)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Level counts */}
          <div className="flex gap-1.5 mr-2">
            {Object.entries(counts).map(([level, count]) => (
              count > 0 && (
                <button
                  key={level}
                  onClick={() => setLevelFilter(levelFilter === level ? "all" : level)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    levelFilter === level
                      ? LEVEL_COLORS[level]
                      : "bg-gray-800 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {level}: {count}
                </button>
              )
            ))}
          </div>

          {/* Pause/Resume */}
          <button
            onClick={() => setPaused(!paused)}
            className={`p-1.5 rounded-lg transition-colors ${
              paused ? "bg-amber-500/15 text-amber-400" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            title={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Scroll to bottom */}
          <button
            onClick={() => {
              setAutoScroll(true);
              if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={(e) => {
          const el = e.target;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
          setAutoScroll(atBottom);
        }}
        className="bg-gray-950 rounded-lg p-2 font-mono text-[11px] leading-5 overflow-y-auto max-h-[500px] min-h-[200px]"
      >
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            {logs.length === 0 ? "Waiting for log entries…" : "No logs match your filter."}
          </p>
        ) : (
          filtered.map((entry, i) => (
            <div
              key={`${entry.ts}-${i}`}
              className="flex gap-2 hover:bg-gray-900/50 px-1 rounded"
            >
              <span className="text-gray-600 shrink-0 select-none">{formatTime(entry.ts)}</span>
              <span
                className={`shrink-0 w-12 text-center rounded px-1 ${LEVEL_COLORS[entry.level] || "text-gray-500"}`}
              >
                {entry.level}
              </span>
              <span
                className={`break-all ${
                  entry.level === "error" ? "text-red-300" :
                  entry.level === "warn" ? "text-amber-200" :
                  "text-gray-300"
                }`}
              >
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>

      {paused && (
        <div className="mt-2 text-center text-xs text-amber-400 bg-amber-500/10 rounded-lg py-1">
          ⏸ Log streaming paused — click Resume to continue
        </div>
      )}
    </div>
  );
}
