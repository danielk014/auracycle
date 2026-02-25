import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Brain, AlertTriangle, CheckCircle, Activity, CalendarDays, Droplets } from "lucide-react";
import { getCycleLogs, getCycleSettings, getCycleSettingsCache } from "@/lib/db";
import {
  buildCycles,
  computeCycleStats,
  detectIrregularity,
  computeSymptomPatterns,
  predictNextPeriod,
} from "@/lib/cycleStats";
import { format, parseISO } from "date-fns";

const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#34D399", "#3B82F6", "#EF4444"];
const FLOW_ORDER = ["spotting", "light", "medium", "heavy"];

export default function Insights() {
  const [activeSymptomTab, setActiveSymptomTab] = useState("frequency");

  const { data: logs = [] } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => getCycleLogs(500),
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
    initialData: getCycleSettingsCache,
  });

  // ── Cycle computations ─────────────────────────────────────
  const cycles       = buildCycles(logs);
  const stats        = computeCycleStats(cycles);
  const irregularity = detectIrregularity(cycles);
  const patterns     = computeSymptomPatterns(logs, cycles);
  const prediction   = predictNextPeriod(cycles, settings);

  // Avg period length from all logged cycles
  const avgPeriodLength = cycles.length > 0
    ? Math.round(cycles.reduce((sum, c) => sum + c.periodLength, 0) / cycles.length)
    : settings?.average_period_length || null;

  const lastCycleLength = stats.last3.length > 0 ? stats.last3[stats.last3.length - 1] : null;

  const stabilityLabel = stats.stdDev === null ? null
    : stats.stdDev <= 1   ? { text: "Very stable",       cls: "bg-emerald-100 text-emerald-700" }
    : stats.stdDev <= 2.5 ? { text: "Stable",            cls: "bg-emerald-50 text-emerald-600" }
    : stats.stdDev <= 4.5 ? { text: "Slightly variable", cls: "bg-amber-50 text-amber-600" }
    :                        { text: "Variable",          cls: "bg-orange-50 text-orange-600" };

  // ── Symptom frequency (normalize :severity suffixes) ──────
  const symptomFreq = {};
  logs.forEach((l) => l.symptoms?.forEach((s) => {
    const name = s.split(":")[0].replace(/_/g, " ");
    symptomFreq[name] = (symptomFreq[name] || 0) + 1;
  }));
  const symptomData = Object.entries(symptomFreq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Flow distribution (case-normalised, shown as % of total) ──
  const flowDist = {};
  logs.filter((l) => l.flow_intensity).forEach((l) => {
    const key = l.flow_intensity.toLowerCase();
    flowDist[key] = (flowDist[key] || 0) + 1;
  });
  const flowData = FLOW_ORDER
    .filter((k) => flowDist[k] > 0)
    .map((k) => ({ name: k, value: flowDist[k] }));
  const flowTotal = flowData.reduce((s, d) => s + d.value, 0);

  const totalLogs = logs.length;

  const predRange = prediction
    ? `${format(parseISO(prediction.range_start), "MMM d")} – ${format(parseISO(prediction.range_end), "MMM d")}`
    : null;

  return (
    <div className="pb-28 px-4 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Insights</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your cycle patterns at a glance</p>
      </motion.div>

      {/* ── Cycle Overview ───────────────────────────────────── */}
      {(stats.avg || avgPeriodLength) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-700">Cycle Overview</h3>
          </div>

          <div className="divide-y divide-slate-50">
            {stats.avg && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-500">Avg cycle length</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{stats.avg} days</span>
                  {stabilityLabel && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stabilityLabel.cls}`}>
                      {stabilityLabel.text}
                    </span>
                  )}
                </div>
              </div>
            )}
            {avgPeriodLength && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-500">Avg period length</span>
                <span className="text-sm font-bold text-slate-800">{avgPeriodLength} days</span>
              </div>
            )}
            {lastCycleLength && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-500">Last cycle length</span>
                <span className="text-sm font-bold text-slate-800">{lastCycleLength} days</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Predictions ──────────────────────────────────────── */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100 shadow-sm mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-700">Next Period Prediction</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-0.5 uppercase tracking-wide font-medium">Most likely</p>
          <p className="text-xl font-bold text-rose-600 mb-2">{predRange}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400">
              Predicted{" "}
              <span className="font-medium text-slate-600">
                {format(parseISO(prediction.predicted_date), "MMMM d")}
              </span>
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              prediction.confidence === "high"   ? "bg-emerald-100 text-emerald-700" :
              prediction.confidence === "medium" ? "bg-amber-100 text-amber-700"    :
                                                   "bg-orange-100 text-orange-700"
            }`}>
              {prediction.confidence.charAt(0).toUpperCase() + prediction.confidence.slice(1)} confidence
            </span>
          </div>
          {prediction.cycles_analyzed > 0 && (
            <p className="text-[10px] text-slate-400 mt-1.5">
              Based on {prediction.cycles_analyzed} tracked cycle{prediction.cycles_analyzed !== 1 ? "s" : ""}
            </p>
          )}
        </motion.div>
      )}

      {/* ── Irregularity alert ───────────────────────────────── */}
      {irregularity && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-4 border mb-4 flex items-start gap-3 ${
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

      {/* ── Flow distribution (fixed) ────────────────────────── */}
      {flowData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-700">Flow Distribution</h3>
          </div>
          <div className="space-y-3">
            {flowData.map((f) => {
              const pct = (f.value / flowTotal) * 100;
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
                  <span className="text-xs font-medium text-slate-600 w-8 text-right">{f.value}×</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Symptoms section ─────────────────────────────────── */}
      {(symptomData.length > 0 || patterns.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-slate-700">Symptoms</h3>
            </div>
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
            <ResponsiveContainer width="100%" height={Math.min(220, symptomData.length * 30 + 20)}>
              <BarChart data={symptomData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #EDE9FE", fontSize: 12 }}
                  formatter={(val) => [`${val} time${val !== 1 ? "s" : ""}`, "Logged"]}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={14} />
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
                    <div className="absolute inset-0 bg-slate-100 rounded-full" />
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
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
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
