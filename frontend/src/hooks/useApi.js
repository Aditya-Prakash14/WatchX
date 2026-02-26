// src/hooks/useApi.js — REST API helpers
const BASE = "/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => apiFetch("/dashboard"),

  // Servers
  getServers: () => apiFetch("/servers"),
  getServer: (id) => apiFetch(`/servers/${id}`),
  deleteServer: (id) => apiFetch(`/servers/${id}`, { method: "DELETE" }),

  // Metrics
  getMetrics: (serverId, from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return apiFetch(`/servers/${serverId}/metrics?${params}`);
  },
  getLatestMetric: (serverId) => apiFetch(`/servers/${serverId}/latest`),

  // Alert Rules
  getRules: () => apiFetch("/rules"),
  createRule: (rule) => apiFetch("/rules", { method: "POST", body: JSON.stringify(rule) }),
  updateRule: (id, rule) => apiFetch(`/rules/${id}`, { method: "PUT", body: JSON.stringify(rule) }),
  deleteRule: (id) => apiFetch(`/rules/${id}`, { method: "DELETE" }),

  // Alerts
  getAlerts: (limit = 100) => apiFetch(`/alerts?limit=${limit}`),
  getActiveAlerts: () => apiFetch("/alerts/active"),
  ackAlert: (id) => apiFetch(`/alerts/${id}/acknowledge`, { method: "POST" }),
  resolveAlert: (id) => apiFetch(`/alerts/${id}/resolve`, { method: "POST" }),

  // Detailed live data
  getServerDetails: (id) => apiFetch(`/servers/${id}/details`),
  getProcesses: (id) => apiFetch(`/servers/${id}/processes`),
  getPorts: (id) => apiFetch(`/servers/${id}/ports`),
  getServices: (id) => apiFetch(`/servers/${id}/services`),
  getDocker: (id) => apiFetch(`/servers/${id}/docker`),
  getFilesystems: (id) => apiFetch(`/servers/${id}/filesystems`),
  getInterfaces: (id) => apiFetch(`/servers/${id}/interfaces`),
  getUsers: (id) => apiFetch(`/servers/${id}/users`),
  getLogs: (id, limit = 200, level) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", limit);
    if (level) params.set("level", level);
    return apiFetch(`/servers/${id}/logs?${params}`);
  },
};
