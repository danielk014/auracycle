import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Droplets, Brain, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import CycleHistoryChart from "@/components/insights/CycleHistoryChart";
import { getCycleLogs, getCycleSettings } from "@/lib/db";
import {
  buildCycles,
  computeCycleStats,
  detectIrregularity,
  computeSymptomPatterns,
} from "@/lib/cycleStats";

const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#34D399", "#3B82F6", "#EF4444"];

export default function Insights() {
  const [activeSymptomTab, setActiveSymptomTab] = useState("frequency");

  const { data: logs = [] } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => getCycleLogs(500),
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
  });

  // ── Cycle computations ─────────────────────────────────────
  const cycles       = buildCycles(logs);
  const stats        = computeCycleStats(cycles);
  const irregularity = detectIrregularity(cycles);
  const patterns     = computeSymptomPatterns(logs, cycles);

  // ── Frequency stats ────────────────────────────────────────
  const symptomFreq = {};
  logs.forEach((l) => l.symptoms?.forEach((s) => { symptomFreq[s] = (symptomFreq[s] || 0) + 1; }));
  const symptomData = Object.entries(symptomFreq)
    .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);


  const flowDist = { spotting: 0, light: 0, medium: 0, heavy: 0 };
  logs.filter((l) => l.flow_intensity).forEach((l) => { flowDist[l.flow_intensity] = (flowDist[l.flow_intensity] || 0) + 1; });
  const flowData = Object.entries(flowDist).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const totalLogs  = logs.length;
  const periodDays = logs.filter((l) => l.log_type === "period").length;

  // ── Symptom timing scatter data ───────────────────────────
  // Top 5 patterns for scatter chart
  const topPatterns = patterns.slice(0, 5);
  const scatterData = topPatterns.flatMap((p, colorIdx) =>
    p.allDays.map((day) => ({ day, symptom: p.symptom, colorIdx }))
  );

  return (
    <div className="pb-28 px-4 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Insights</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your cycle patterns at a glance</p>
      </motion.div>

      {/* ── Cycle history chart ──────────────────────────────── */}
      <CycleHistoryChart logs={logs} />

      {/* ── Irregularity alert ───────────────────────────────── */}
      {irregularity && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-4 border mb-5 flex items-start gap-3 ${
            irregularity.isIrregular
              ? "bg-amber-50 border-amber-200"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          {irregularity.isIrregular
            ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            : <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          }
          <div>
            <p className={`text-xs font-semibold ${irregularity.isIrregular ? "text-amber-700" : "text-emerald-700"}`}>
              {irregularity.isIrregular ? "Cycle variability detected" : "Regular cycle pattern"}
            </p>
            <p className={`text-xs mt-0.5 ${irregularity.isIrregular ? "text-amber-600" : "text-emerald-600"}`}>
              {irregularity.message}
            </p>
            {irregularity.last3.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Recent lengths: {irregularity.last3.join(" → ")} days
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Cycle statistics panel ───────────────────────────── */}
      {stats.count >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-700">Cycle Statistics</h3>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Average", value: stats.avg ? `${stats.avg}d` : "—", color: "text-violet-600" },
              { label: "Variation", value: stats.stdDev !== null ? `±${stats.stdDev}d` : "—", color: "text-amber-600" },
              { label: "Shortest", value: stats.min ? `${stats.min}d` : "—", color: "text-emerald-600" },
              { label: "Longest",  value: stats.max ? `${stats.max}d` : "—", color: "text-rose-600" },
            ].map((item) => (
              <div key={item.label} className="text-center bg-slate-50 rounded-xl py-2.5">
                <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {stats.last3.length >= 2 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-2 font-medium uppercase tracking-wider">Last 3 cycle lengths</p>
              <div className="flex gap-2">
                {stats.last3.map((len, i) => {
                  const isLong = len > (stats.avg || 28) + 3;
                  const isShort = len < (stats.avg || 28) - 3;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-xl py-2.5 text-center border ${
                        isLong  ? "bg-amber-50 border-amber-100"   :
                        isShort ? "bg-blue-50 border-blue-100"     :
                                  "bg-violet-50 border-violet-100"
                      }`}
                    >
                      <span className={`text-sm font-bold ${
                        isLong  ? "text-amber-600" :
                        isShort ? "text-blue-600"  :
                                  "text-violet-600"
                      }`}>{len}d</span>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Cycle {stats.count - stats.last3.length + i + 1}
                      </p>
                    </div>
                  );
                })}
              </div>
              {stats.stdDev !== null && (
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  {stats.stdDev <= 2
                    ? "Very consistent cycle — great for prediction accuracy."
                    : stats.stdDev <= 4
                    ? "Slightly variable — predictions have a ±2–3 day window."
                    : "Higher variability — consider tracking more cycles for accuracy."}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Summary cards ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: TrendingUp, label: "Total Logs",  value: totalLogs,                       bg: "bg-violet-50", color: "text-violet-500" },
          { icon: Droplets,   label: "Period Days", value: periodDays,                       bg: "bg-rose-50",   color: "text-rose-500" },
          { icon: Brain,      label: "Symptoms",    value: Object.keys(symptomFreq).length,  bg: "bg-amber-50",  color: "text-amber-500" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-4 border border-purple-50 shadow-sm text-center"
          >
            <div className={`${card.bg} w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-400">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Symptom section with tabs ────────────────────────── */}
      {(symptomData.length > 0 || patterns.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">Symptoms</h3>
            {patterns.length > 0 && (
              <div className="flex bg-slate-100 rounded-xl p-0.5">
                {[
                  { id: "frequency", label: "Frequency" },
                  { id: "timing",    label: "Timing" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSymptomTab(tab.id)}
                    className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition-all ${
                      activeSymptomTab === tab.id
                        ? "bg-white text-violet-600 shadow-sm"
                        : "text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeSymptomTab === "frequency" && symptomData.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={symptomData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: "#64748B" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EDE9FE", fontSize: 12 }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeSymptomTab === "timing" && patterns.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-3">
                When each symptom typically appears in your cycle
              </p>
              {patterns.slice(0, 6).map((p, i) => (
                <div key={p.rawSymptom} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 capitalize w-24 flex-shrink-0 truncate">{p.symptom}</span>
                  <div className="flex-1 bg-slate-50 rounded-full h-5 relative overflow-hidden">
                    {/* Background cycle bar */}
                    <div className="absolute inset-0 bg-slate-100 rounded-full" />
                    {/* Symptom range marker */}
                    {(() => {
                      const cycleLen = stats.avg || 28;
                      const minPct = ((Math.min(...p.allDays) - 1) / cycleLen) * 100;
                      const maxPct = ((Math.max(...p.allDays)) / cycleLen) * 100;
                      const avgPct = ((p.avgDay - 1) / cycleLen) * 100;
                      return (
                        <>
                          <div
                            className="absolute top-0 h-full rounded-full opacity-30"
                            style={{
                              left: `${Math.max(0, minPct)}%`,
                              width: `${Math.max(4, maxPct - minPct)}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
                            style={{
                              left: `calc(${avgPct}% - 5px)`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </>
                      );
                    })()}
                  </div>
                  <span className="text-[10px] text-slate-400 w-14 text-right flex-shrink-0">
                    {p.typicalRange}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 rounded bg-violet-200" />
                  <span className="text-[10px] text-slate-400">Day range</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  <span className="text-[10px] text-slate-400">Avg day</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Pattern insights (text) ──────────────────────────── */}
      {patterns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-5"
        >
          <h3 className="text-sm font-bold text-slate-700 mb-3">Your Patterns</h3>
          <div className="space-y-2.5">
            {patterns.slice(0, 5).map((p) => (
              <div key={p.rawSymptom} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-slate-600">
                  <span className="font-medium capitalize">{p.symptom}</span>
                  {" "}tends to appear around{" "}
                  <span className="font-semibold text-violet-600">{p.typicalRange}</span>
                  {" "}of your cycle
                  {p.count >= 3 && (
                    <span className="text-slate-400"> ({p.count} occurrences)</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Flow distribution ────────────────────────────────── */}
      {flowData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm"
        >
          <h3 className="text-sm font-bold text-slate-700 mb-4">Flow Distribution</h3>
          <div className="space-y-3">
            {flowData.map((f) => {
              const maxVal = Math.max(...flowData.map((d) => d.value));
              const pct = (f.value / maxVal) * 100;
              return (
                <div key={f.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16 capitalize">{f.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-rose-300 to-rose-500 rounded-full"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 w-6 text-right">{f.value}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {totalLogs === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-violet-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-600 mb-1">No data yet</h3>
          <p className="text-sm text-slate-400">Start logging to see your insights here.</p>
        </motion.div>
      )}
    </div>
  );
}
