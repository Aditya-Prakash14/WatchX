// src/components/AlertRules.jsx — Manage alert rules
import { useState, useEffect } from "react";
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "../hooks/useApi";

const METRICS = [
  { value: "cpu_pct", label: "CPU %" },
  { value: "mem_pct", label: "Memory %" },
  { value: "disk_pct", label: "Disk %" },
  { value: "temp", label: "Temperature" },
  { value: "load_1", label: "Load Avg (1m)" },
  { value: "net_rx", label: "Net RX B/s" },
  { value: "net_tx", label: "Net TX B/s" },
];

const OPERATORS = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "==" },
];

const SEVERITIES = ["info", "warning", "critical"];

export default function AlertRules() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    metric: "cpu_pct",
    operator: "gt",
    threshold: 90,
    duration_s: 0,
    severity: "warning",
    cooldown_s: 300,
  });

  const fetchRules = () => api.getRules().then(setRules).catch(console.error);
  useEffect(() => { fetchRules(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createRule(form);
    setShowForm(false);
    setForm({ metric: "cpu_pct", operator: "gt", threshold: 90, duration_s: 0, severity: "warning", cooldown_s: 300 });
    fetchRules();
  };

  const handleDelete = async (id) => {
    await api.deleteRule(id);
    fetchRules();
  };

  const handleToggle = async (rule) => {
    await api.updateRule(rule.id, { ...rule, enabled: !rule.enabled });
    fetchRules();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white">Alert Rules</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800/50 rounded-lg p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select
            value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={form.operator}
            onChange={(e) => setForm({ ...form, operator: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="number"
            step="any"
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
            placeholder="Threshold"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            value={form.duration_s}
            onChange={(e) => setForm({ ...form, duration_s: Number(e.target.value) })}
            placeholder="Sustained (sec)"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700">
            Create
          </button>
        </form>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No alert rules configured.</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {rules.map((rule) => (
            <div key={rule.id} className="py-3 flex items-center gap-3">
              <button onClick={() => handleToggle(rule)} className="shrink-0">
                {rule.enabled ? (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-600" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`badge-${rule.severity === "critical" ? "critical" : rule.severity === "warning" ? "warning" : "info"} mr-2`}>
                  {rule.severity}
                </span>
                <span className="text-sm text-gray-300">
                  {METRICS.find((m) => m.value === rule.metric)?.label || rule.metric}
                  {" "}
                  {OPERATORS.find((o) => o.value === rule.operator)?.label || rule.operator}
                  {" "}
                  {rule.threshold}
                </span>
                {rule.duration_s > 0 && (
                  <span className="text-xs text-gray-500 ml-2">for {rule.duration_s}s</span>
                )}
                {rule.server_id && (
                  <span className="text-xs text-gray-600 ml-2">server: {rule.server_id.substring(0, 8)}</span>
                )}
                {!rule.server_id && (
                  <span className="text-xs text-gray-600 ml-2">all servers</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(rule.id)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
