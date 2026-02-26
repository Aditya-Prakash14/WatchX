// src/components/AlertPanel.jsx — Active & historical alerts panel
import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, AlertTriangle, AlertOctagon, Info, X } from "lucide-react";
import { api } from "../hooks/useApi";
import { formatDateTime, timeAgo } from "../lib/utils";

function SeverityIcon({ severity }) {
  switch (severity) {
    case "critical": return <AlertOctagon className="w-4 h-4 text-red-400" />;
    case "warning":  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    default:         return <Info className="w-4 h-4 text-blue-400" />;
  }
}

function StatusBadge({ status }) {
  const styles = {
    active:       "badge-critical",
    acknowledged: "badge-warning",
    resolved:     "badge-online",
  };
  return <span className={styles[status] || "badge-offline"}>{status}</span>;
}

export default function AlertPanel({ liveAlerts }) {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("active"); // active | all

  const fetchAlerts = () => {
    const fetcher = tab === "active" ? api.getActiveAlerts() : api.getAlerts(200);
    fetcher.then(setAlerts).catch(console.error);
  };

  useEffect(() => {
    fetchAlerts();
  }, [tab]);

  // Re-fetch when live alerts stream in
  useEffect(() => {
    if (liveAlerts.length > 0) fetchAlerts();
  }, [liveAlerts]);

  const handleAck = async (id) => {
    await api.ackAlert(id);
    fetchAlerts();
  };

  const handleResolve = async (id) => {
    await api.resolveAlert(id);
    fetchAlerts();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white">Alerts</h3>
          {tab === "active" && alerts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
              {alerts.length}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {["active", "all"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {t === "active" ? "Active" : "History"}
            </button>
          ))}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No {tab} alerts — all clear!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto -mx-2 px-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="py-3 flex items-start gap-3">
              <SeverityIcon severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge-${alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}`}>
                    {alert.severity}
                  </span>
                  <StatusBadge status={alert.status} />
                  <span className="text-xs text-gray-500 ml-auto">{timeAgo(alert.fired_at)}</span>
                </div>
                <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Server: {alert.server_id?.substring(0, 8)} · Fired: {formatDateTime(alert.fired_at)}
                  {alert.resolved_at && ` · Resolved: ${formatDateTime(alert.resolved_at)}`}
                </p>
              </div>
              {alert.status === "active" && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleAck(alert.id)}
                    title="Acknowledge"
                    className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleResolve(alert.id)}
                    title="Resolve"
                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
