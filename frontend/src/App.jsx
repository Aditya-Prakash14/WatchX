// src/App.jsx — WatchX main application shell
import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import StatusCards from "./components/StatusCards";
import ServerList from "./components/ServerList";
import ServerDetail from "./components/ServerDetail";
import AlertPanel from "./components/AlertPanel";
import AlertRules from "./components/AlertRules";
import { useWebSocket } from "./hooks/useWebSocket";
import { api } from "./hooks/useApi";

const MAX_LIVE_POINTS = 720; // ~1h at 5s intervals
const MAX_LOG_ENTRIES = 500;

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [tab, setTab] = useState("overview"); // overview | alerts | rules

  // Live metrics buffer: { serverId: [metric, ...] }
  const liveMetricsRef = useRef({});
  const [liveMetrics, setLiveMetrics] = useState({});

  // Live details per server: { serverId: { processes, ports, ... } }
  const [liveDetails, setLiveDetails] = useState({});

  // Live logs per server: { serverId: [logEntry, ...] }
  const liveLogsRef = useRef({});
  const [liveLogs, setLiveLogs] = useState({});

  // Fetch dashboard summary
  const fetchDashboard = useCallback(() => {
    api.getDashboard().then(setDashboard).catch(console.error);
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // WebSocket handler
  const handleWsMessage = useCallback((msg) => {
    switch (msg.type) {
      case "metric": {
        const { serverId, data } = msg;
        if (!liveMetricsRef.current[serverId]) liveMetricsRef.current[serverId] = [];
        liveMetricsRef.current[serverId].push(data);
        if (liveMetricsRef.current[serverId].length > MAX_LIVE_POINTS) {
          liveMetricsRef.current[serverId] = liveMetricsRef.current[serverId].slice(-MAX_LIVE_POINTS);
        }
        setLiveMetrics({ ...liveMetricsRef.current });

        // Update dashboard server's latest metric in-place
        setDashboard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            servers: prev.servers.map((s) =>
              s.id === serverId ? { ...s, latest_metric: data, status: s.status === "offline" ? "online" : s.status, last_seen: data.ts } : s
            ),
          };
        });
        break;
      }
      case "details": {
        const { serverId, data } = msg;
        setLiveDetails((prev) => ({ ...prev, [serverId]: data }));
        break;
      }
      case "log": {
        const { serverId, entry } = msg;
        if (!liveLogsRef.current[serverId]) liveLogsRef.current[serverId] = [];
        liveLogsRef.current[serverId].push(entry);
        if (liveLogsRef.current[serverId].length > MAX_LOG_ENTRIES) {
          liveLogsRef.current[serverId] = liveLogsRef.current[serverId].slice(-MAX_LOG_ENTRIES);
        }
        setLiveLogs({ ...liveLogsRef.current });
        break;
      }
      case "logs:snapshot": {
        const { serverId, entries } = msg;
        liveLogsRef.current[serverId] = entries || [];
        setLiveLogs({ ...liveLogsRef.current });
        break;
      }
      case "server:online":
      case "server:offline":
        fetchDashboard();
        break;
      case "alert:new":
        setLiveAlerts((prev) => [msg.alert, ...prev].slice(0, 50));
        fetchDashboard();
        break;
      case "alert:resolved":
        fetchDashboard();
        break;
    }
  }, [fetchDashboard]);

  const { connected, send } = useWebSocket(handleWsMessage);

  // When a server is selected, subscribe to its details & logs
  useEffect(() => {
    if (selectedServer && connected) {
      send({ type: "subscribe:details", serverId: selectedServer });
      send({ type: "subscribe:logs", serverId: selectedServer });
    }
  }, [selectedServer, connected, send]);

  // Navigation tabs
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "alerts", label: "Alerts" },
    { id: "rules", label: "Rules" },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <Header connected={connected} />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {selectedServer ? (
          <ServerDetail
            serverId={selectedServer}
            onBack={() => setSelectedServer(null)}
            liveMetrics={liveMetrics}
            liveDetails={liveDetails[selectedServer] || null}
            liveLogs={liveLogs[selectedServer] || []}
          />
        ) : (
          <>
            {/* Tab navigation */}
            <nav className="flex gap-1 bg-gray-900 rounded-xl p-1 w-fit">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {tab === "overview" && (
              <>
                <StatusCards dashboard={dashboard} />
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Servers</h2>
                  <ServerList
                    servers={dashboard?.servers || []}
                    onSelectServer={setSelectedServer}
                  />
                </div>
                {/* Quick alert view on overview */}
                <AlertPanel liveAlerts={liveAlerts} />
              </>
            )}

            {tab === "alerts" && <AlertPanel liveAlerts={liveAlerts} />}
            {tab === "rules" && <AlertRules />}
          </>
        )}
      </main>
    </div>
  );
}
