import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, Brain, AlertTriangle, CheckCircle, Activity,
  CalendarDays, Droplets, Sparkles, Zap, RefreshCw,
} from "lucide-react";
import { getCycleLogs, getCycleSettings, getCycleSettingsCache } from "@/lib/db";
import {
  buildCycles,
  computeCycleStats,
  detectIrregularity,
  computeSymptomPatterns,
  predictNextPeriod,
} from "@/lib/cycleStats";
import { format, parseISO, differenceInDays } from "date-fns";

const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#34D399", "#3B82F6", "#EF4444"];
const FLOW_ORDER = ["spotting", "light", "medium", "heavy"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Insights() {
  const [activeSymptomTab, setActiveSymptomTab] = useState("frequency");
  const [activeCorrelTab,  setActiveCorrelTab]  = useState("flow");

  // ── 1 year+ of data ─────────────────────────────────────────
  const { data: logs = [] } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => getCycleLogs(1000),
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
    initialData: getCycleSettingsCache,
  });

  // ── Core cycle computations ─────────────────────────────────
  const cycles       = useMemo(() => buildCycles(logs),              [logs]);
  const stats        = useMemo(() => computeCycleStats(cycles),      [cycles]);
  const irregularity = useMemo(() => detectIrregularity(cycles),     [cycles]);
  const patterns     = useMemo(() => computeSymptomPatterns(logs, cycles), [logs, cycles]);
  const prediction   = useMemo(() => predictNextPeriod(cycles, settings),  [cycles, settings]);

  const avgPeriodLength = cycles.length > 0
    ? Math.round(cycles.reduce((s, c) => s + c.periodLength, 0) / cycles.length)
    : (settings?.average_period_length || null);
  const lastCycleLength = stats.last3.length > 0 ? stats.last3[stats.last3.length - 1] : null;

  const stabilityLabel = stats.stdDev === null ? null
    : stats.stdDev <= 1   ? { text: "Very stable",       cls: "bg-emerald-100 text-emerald-700" }
    : stats.stdDev <= 2.5 ? { text: "Stable",            cls: "bg-emerald-50 text-emerald-600" }
    : stats.stdDev <= 4.5 ? { text: "Slightly variable", cls: "bg-amber-50 text-amber-600" }
    :                        { text: "Variable",          cls: "bg-orange-50 text-orange-600" };

  // ── Logs grouped by date ────────────────────────────────────
  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      if (!l.date) return;
      if (!map[l.date]) map[l.date] = { symptoms: [], flow: null, stress: null, sleep: null };
      const d = map[l.date];
      l.symptoms?.forEach((s) => d.symptoms.push(s.split(":")[0]));
      if (l.flow_intensity) d.flow = l.flow_intensity.toLowerCase();
      if (l.stress_level != null && d.stress === null) d.stress = l.stress_level;
      if (l.sleep_hours  != null && d.sleep  === null) d.sleep  = l.sleep_hours;
    });
    return map;
  }, [logs]);

  // ── Symptom × Flow correlation ──────────────────────────────
  const sfCorrelation = useMemo(() => {
    const result = {};
    Object.values(logsByDate).forEach((d) => {
      if (!d.flow || d.symptoms.length === 0) return;
      d.symptoms.forEach((s) => {
        if (!result[s]) result[s] = { heavy: 0, medium: 0, light: 0, spotting: 0, total: 0 };
        if (result[s][d.flow] !== undefined) {
          result[s][d.flow]++;
          result[s].total++;
        }
      });
    });
    return result;
  }, [logsByDate]);

  // ── Symptom × Stress correlation ───────────────────────────
  const stressCorrelation = useMemo(() => {
    const highStressDays = Object.values(logsByDate).filter((d) => d.stress >= 4);
    const counts = {};
    highStressDays.forEach((d) => d.symptoms.forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    }));
    return { counts, highStressDayCount: highStressDays.length };
  }, [logsByDate]);

  // ── Cross-cycle symptom patterns ───────────────────────────
  const crossCycleData = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      if (!log.symptoms?.length || !log.date) return;
      const logDate = parseISO(log.date);
      let cycleIdx = -1;
      for (let i = 0; i < cycles.length; i++) {
        const next = cycles[i + 1]?.startObj;
        const inCycle = next
          ? logDate >= cycles[i].startObj && logDate < next
          : logDate >= cycles[i].startObj;
        if (inCycle) { cycleIdx = i; break; }
      }
      if (cycleIdx < 0) return;
      const cycleDay = differenceInDays(logDate, cycles[cycleIdx].startObj) + 1;
      if (cycleDay < 1 || cycleDay > 42) return;
      log.symptoms.forEach((raw) => {
        const s = raw.split(":")[0];
        if (!map[s]) map[s] = {};
        if (!map[s][cycleIdx]) map[s][cycleIdx] = [];
        map[s][cycleIdx].push(cycleDay);
      });
    });
    return Object.entries(map)
      .map(([s, cycleMap]) => {
        const allDays = Object.values(cycleMap).flat();
        const avgDay  = allDays.length
          ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length)
          : 0;
        return {
          symptom: s,
          label: s.replace(/_/g, " "),
          cycleMap,
          uniqueCycles: Object.keys(cycleMap).length,
          avgDay,
        };
      })
      .filter((d) => d.uniqueCycles >= 2)
      .sort((a, b) => b.uniqueCycles - a.uniqueCycles);
  }, [logs, cycles]);

  // ── Luna's AI-style insights ────────────────────────────────
  const lunaInsights = useMemo(() => {
    const out = [];

    // Cross-cycle symptom consistency
    crossCycleData.slice(0, 3).forEach((d) => {
      if (d.uniqueCycles === cycles.length && cycles.length >= 2) {
        out.push({
          text: `${cap(d.label)} appeared in every one of your ${cycles.length} tracked cycles, always around day ${d.avgDay}`,
          emoji: "🔁",
        });
      } else if (d.uniqueCycles >= 2) {
        out.push({
          text: `${cap(d.label)} showed up in ${d.uniqueCycles} of ${cycles.length} cycles, typically around day ${d.avgDay}`,
          emoji: "🔁",
        });
      }
    });

    // Symptom × flow correlations
    Object.entries(sfCorrelation)
      .filter(([, d]) => d.total >= 3)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 2)
      .forEach(([s, d]) => {
        const dominant = FLOW_ORDER
          .map((f) => [f, d[f] || 0])
          .sort((a, b) => b[1] - a[1])[0];
        if (dominant[1] / d.total >= 0.55) {
          out.push({
            text: `${cap(s.replace(/_/g, " "))} tends to occur most on ${dominant[0]}-flow days (${dominant[1]} of ${d.total} times)`,
            emoji: "💧",
          });
        }
      });

    // Symptom × stress
    const { counts: sc, highStressDayCount: hsc } = stressCorrelation;
    if (hsc >= 2) {
      Object.entries(sc)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .forEach(([s, count]) => {
          if (count >= 2) {
            out.push({
              text: `On ${count} of ${hsc} high-stress days, you also experienced ${s.replace(/_/g, " ")}`,
              emoji: "⚡",
            });
          }
        });
    }

    // Cycle stability
    if (stats.stdDev !== null && stats.count >= 2) {
      if (stats.stdDev <= 1.5) {
        out.push({
          text: `Your cycle is very consistent — only ±${stats.stdDev} days of variation across ${stats.count} cycles`,
          emoji: "✨",
        });
      }
    }

    return out.slice(0, 6);
  }, [crossCycleData, sfCorrelation, stressCorrelation, cycles, stats]);

  // ── Symptom frequency & flow distribution ──────────────────
  const symptomFreq = {};
  logs.forEach((l) => l.symptoms?.forEach((s) => {
    const name = s.split(":")[0].replace(/_/g, " ");
    symptomFreq[name] = (symptomFreq[name] || 0) + 1;
  }));
  const symptomData = Object.entries(symptomFreq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const flowDist = {};
  logs.filter((l) => l.flow_intensity).forEach((l) => {
    const key = l.flow_intensity.toLowerCase();
    flowDist[key] = (flowDist[key] || 0) + 1;
  });
  const flowData  = FLOW_ORDER.filter((k) => flowDist[k] > 0).map((k) => ({ name: k, value: flowDist[k] }));
  const flowTotal = flowData.reduce((s, d) => s + d.value, 0);

  const predRange = prediction
    ? `${format(parseISO(prediction.range_start), "MMM d")} – ${format(parseISO(prediction.range_end), "MMM d")}`
    : null;

  const totalLogs = logs.length;

  // ── Correlation display helpers ─────────────────────────────
  const flowCorrelCards = Object.entries(sfCorrelation)
    .filter(([, d]) => d.total >= 2)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([s, d]) => {
      const dominant = FLOW_ORDER.map((f) => ({ f, n: d[f] || 0 })).sort((a, b) => b.n - a.n)[0];
      return { symptom: s.replace(/_/g, " "), dominant: dominant.f, dominantN: dominant.n, total: d.total, data: d };
    });

  const stressCorrelCards = Object.entries(stressCorrelation.counts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s, count]) => ({ symptom: s.replace(/_/g, " "), count, total: stressCorrelation.highStressDayCount }));

  const maxCycleDay = Math.min(stats.avg || 28, 30);

  // ────────────────────────────────────────────────────────────
  return (
    <div className="pb-28 px-4 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Insights</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your patterns, analysed by Luna</p>
      </motion.div>

      {/* ── Luna's Analysis ──────────────────────────────────── */}
      {lunaInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 mb-4 shadow-lg shadow-violet-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-white/80" />
            <h3 className="text-sm font-bold text-white">Luna's Analysis</h3>
          </div>
          <div className="space-y-2.5">
            {lunaInsights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{ins.emoji}</span>
                <p className="text-sm text-white/90 leading-snug">{ins.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Cycle Overview ───────────────────────────────────── */}
      {(stats.avg || avgPeriodLength) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-700">Cycle Overview</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.avg && (
              <div className="flex items-center justify-between py-2.5">
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
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-slate-500">Avg period length</span>
                <span className="text-sm font-bold text-slate-800">{avgPeriodLength} days</span>
              </div>
            )}
            {lastCycleLength && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-slate-500">Last cycle length</span>
                <span className="text-sm font-bold text-slate-800">{lastCycleLength} days</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-slate-500">Cycles tracked</span>
              <span className="text-sm font-bold text-slate-800">{cycles.length}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Across Your Cycles (symptom timeline) ────────────── */}
      {crossCycleData.length > 0 && cycles.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-700">Across Your Cycles</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            Each row = one cycle. Purple = symptom day, rose = period day.
          </p>

          {crossCycleData.slice(0, 3).map((symptomData, sIdx) => {
            const displayCycles = cycles.slice(-5);
            return (
              <div key={symptomData.symptom} className={`${sIdx > 0 ? "mt-5 pt-4 border-t border-slate-50" : ""}`}>
                <p className="text-xs font-semibold text-slate-600 capitalize mb-2">
                  {symptomData.label}
                  <span className="ml-2 text-[10px] font-normal text-slate-400">
                    in {symptomData.uniqueCycles}/{cycles.length} cycles
                  </span>
                </p>
                <div className="space-y-1.5">
                  {displayCycles.map((cycle, i) => {
                    const globalIdx = cycles.length - displayCycles.length + i;
                    const symptomDays = new Set(symptomData.cycleMap[globalIdx] || []);
                    // Period days = days 1 through cycle.periodLength
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-9 text-right flex-shrink-0">
                          C{cycle.index}
                        </span>
                        <div
                          className="flex-1 grid gap-0.5"
                          style={{ gridTemplateColumns: `repeat(${maxCycleDay}, 1fr)` }}
                        >
                          {Array.from({ length: maxCycleDay }, (_, d) => {
                            const day = d + 1;
                            const isPeriod  = day <= (cycle.periodLength || 5);
                            const isSymptom = symptomDays.has(day);
                            return (
                              <div
                                key={day}
                                title={`Day ${day}`}
                                className={`h-4 rounded-sm ${
                                  isSymptom ? "bg-violet-400" :
                                  isPeriod  ? "bg-rose-200"   :
                                              "bg-slate-100"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Mini legend */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-violet-400" />
                    <span className="text-[10px] text-slate-400">{cap(symptomData.label)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-rose-200" />
                    <span className="text-[10px] text-slate-400">Period</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-slate-100" />
                    <span className="text-[10px] text-slate-400">Other</span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── Symptom Correlations ─────────────────────────────── */}
      {(flowCorrelCards.length > 0 || stressCorrelCards.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-700">Symptom Correlations</h3>
            </div>
            {flowCorrelCards.length > 0 && stressCorrelCards.length > 0 && (
              <div className="flex bg-slate-100 rounded-xl p-0.5">
                {[
                  { id: "flow",   label: "Flow" },
                  { id: "stress", label: "Stress" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCorrelTab(tab.id)}
                    className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition-all ${
                      activeCorrelTab === tab.id ? "bg-white text-violet-600 shadow-sm" : "text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flow correlation */}
          {(activeCorrelTab === "flow" || stressCorrelCards.length === 0) && flowCorrelCards.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-3">
                Which symptoms appear with each flow intensity
              </p>
              <div className="space-y-3">
                {flowCorrelCards.map((card) => (
                  <div key={card.symptom}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600 capitalize">{card.symptom}</span>
                      <span className="text-[10px] text-slate-400">{card.total} logged days</span>
                    </div>
                    <div className="flex gap-1">
                      {FLOW_ORDER.filter((f) => (card.data[f] || 0) > 0).map((f) => {
                        const n   = card.data[f] || 0;
                        const pct = (n / card.total) * 100;
                        const col = f === "heavy" ? "bg-rose-500" : f === "medium" ? "bg-rose-400" : f === "light" ? "bg-rose-300" : "bg-rose-200";
                        return (
                          <div key={f} className="flex flex-col items-center" style={{ width: `${pct}%`, minWidth: 28 }}>
                            <div className={`w-full h-5 ${col} rounded-md`} />
                            <span className="text-[9px] text-slate-400 mt-0.5 capitalize">{f[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-50 flex-wrap">
                {["spotting", "light", "medium", "heavy"].map((f) => (
                  <div key={f} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${
                      f === "heavy" ? "bg-rose-500" : f === "medium" ? "bg-rose-400" : f === "light" ? "bg-rose-300" : "bg-rose-200"
                    }`} />
                    <span className="text-[10px] text-slate-400 capitalize">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stress correlation */}
          {(activeCorrelTab === "stress" || flowCorrelCards.length === 0) && stressCorrelCards.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-3">
                Symptoms on high-stress days (stress ≥ 4/5) — {stressCorrelation.highStressDayCount} days total
              </p>
              <div className="space-y-2.5">
                {stressCorrelCards.map((card) => (
                  <div key={card.symptom} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 capitalize w-28 flex-shrink-0">{card.symptom}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(card.count / card.total) * 100}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-10 text-right flex-shrink-0">
                      {card.count}/{card.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Next Period Prediction ────────────────────────────── */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
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
              {cap(prediction.confidence)} confidence
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
          transition={{ delay: 0.16 }}
          className={`rounded-2xl p-4 border mb-4 flex items-start gap-3 ${
            irregularity.isIrregular ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
          }`}
        >
          {irregularity.isIrregular
            ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            : <CheckCircle    className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
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

      {/* ── Flow Distribution ────────────────────────────────── */}
      {flowData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
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

      {/* ── Symptoms (Frequency / Timing tabs) ───────────────── */}
      {(symptomData.length > 0 || patterns.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-slate-700">Symptom Detail</h3>
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
                      activeSymptomTab === tab.id ? "bg-white text-violet-600 shadow-sm" : "text-slate-400"
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
              {patterns.slice(0, 7).map((p, i) => (
                <div key={p.rawSymptom} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 capitalize w-24 flex-shrink-0 truncate">{p.symptom}</span>
                  <div className="flex-1 bg-slate-50 rounded-full h-5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-slate-100 rounded-full" />
                    {(() => {
                      const cycleLen = stats.avg || 28;
                      const minPct = ((Math.min(...p.allDays) - 1) / cycleLen) * 100;
                      const maxPct = ((Math.max(...p.allDays))     / cycleLen) * 100;
                      const avgPct = ((p.avgDay - 1)               / cycleLen) * 100;
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
                            style={{ left: `calc(${avgPct}% - 5px)`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </>
                      );
                    })()}
                  </div>
                  <span className="text-[10px] text-slate-400 w-14 text-right flex-shrink-0">{p.typicalRange}</span>
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

      {/* ── Pattern text ─────────────────────────────────────── */}
      {patterns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm mb-4"
        >
          <h3 className="text-sm font-bold text-slate-700 mb-3">Your Patterns</h3>
          <div className="space-y-2.5">
            {patterns.slice(0, 6).map((p) => (
              <div key={p.rawSymptom} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-slate-600">
                  <span className="font-medium capitalize">{p.symptom}</span>
                  {" "}tends to appear around{" "}
                  <span className="font-semibold text-violet-600">{p.typicalRange}</span>
                  {" "}of your cycle
                  {p.count >= 3 && <span className="text-slate-400"> ({p.count} times)</span>}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Empty state ──────────────────────────────────────── */}
      {totalLogs === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-violet-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-600 mb-1">No data yet</h3>
          <p className="text-sm text-slate-400">Start logging to see Luna's insights here.</p>
        </motion.div>
      )}
    </div>
  );
}
