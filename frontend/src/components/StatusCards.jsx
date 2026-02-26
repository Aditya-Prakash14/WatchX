// src/components/StatusCards.jsx — Overview KPI cards
import { Server, AlertTriangle, AlertOctagon, CheckCircle } from "lucide-react";

function Card({ icon: Icon, label, value, color, sub }) {
  const colors = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber:   "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
    red:     "from-red-500/20 to-red-500/5 border-red-500/20 text-red-400",
    blue:    "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
    gray:    "from-gray-500/20 to-gray-500/5 border-gray-500/20 text-gray-400",
  };
  const c = colors[color] || colors.gray;

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 ${c}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 opacity-70" />
        {sub && <span className="text-xs opacity-60">{sub}</span>}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-70 mt-1">{label}</div>
    </div>
  );
}

export default function StatusCards({ dashboard }) {
  if (!dashboard) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card icon={Server}       label="Total Servers"   value={dashboard.total_servers}  color="blue"    sub={`${dashboard.online} online`} />
      <Card icon={CheckCircle}  label="Healthy"         value={dashboard.online}         color="emerald" />
      <Card icon={AlertTriangle} label="Warnings"       value={dashboard.warning}        color="amber"   sub={`${dashboard.active_alerts} active alerts`} />
      <Card icon={AlertOctagon}  label="Critical"       value={dashboard.critical}       color="red"     sub={`${dashboard.critical_alerts} critical alerts`} />
    </div>
  );
}
