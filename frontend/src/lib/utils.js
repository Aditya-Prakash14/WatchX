// src/lib/utils.js — Formatting & utility helpers

export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || bytes === null || bytes === undefined) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

export function formatBytesPerSec(bytes) {
  return `${formatBytes(bytes)}/s`;
}

export function formatPct(pct) {
  if (pct === null || pct === undefined) return "—";
  return `${pct.toFixed(1)}%`;
}

export function formatUptime(seconds) {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatTimestamp(unixSeconds) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleTimeString();
}

export function formatDateTime(unixSeconds) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString();
}

export function timeAgo(unixSeconds) {
  if (!unixSeconds) return "never";
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function statusColor(status) {
  switch (status) {
    case "online":   return "emerald";
    case "warning":  return "amber";
    case "critical": return "red";
    case "offline":  return "gray";
    default:         return "gray";
  }
}

export function severityColor(severity) {
  switch (severity) {
    case "info":     return "blue";
    case "warning":  return "amber";
    case "critical": return "red";
    default:         return "gray";
  }
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
