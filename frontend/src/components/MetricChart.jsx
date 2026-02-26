// src/components/MetricChart.jsx — Real-time time-series chart using Recharts
import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatTimestamp } from "../lib/utils";

const COLORS = {
  brand:   { stroke: "#2aa4ff", fill: "#2aa4ff" },
  emerald: { stroke: "#34d399", fill: "#34d399" },
  amber:   { stroke: "#fbbf24", fill: "#fbbf24" },
  red:     { stroke: "#f87171", fill: "#f87171" },
  violet:  { stroke: "#a78bfa", fill: "#a78bfa" },
  cyan:    { stroke: "#22d3ee", fill: "#22d3ee" },
};

export default function MetricChart({
  data,
  dataKey,
  label,
  unit = "%",
  color = "brand",
  domain,
  height = 180,
}) {
  const c = COLORS[color] || COLORS.brand;

  const chartData = useMemo(
    () =>
      (data || []).map((d) => ({
        ts: d.ts,
        value: d[dataKey],
        time: formatTimestamp(d.ts),
      })),
    [data, dataKey]
  );

  return (
    <div className="card">
      <h4 className="text-sm font-medium text-gray-400 mb-3">{label}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c.fill} stopOpacity={0.3} />
              <stop offset="95%" stopColor={c.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={domain || [0, "auto"]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}${unit === "%" ? "%" : ""}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 8,
              color: "#e2e8f0",
              fontSize: 13,
            }}
            formatter={(value) => [`${typeof value === "number" ? value.toFixed(1) : value}${unit}`, label]}
            labelFormatter={(l) => l}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={c.stroke}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
