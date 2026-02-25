import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { parseISO, format, differenceInDays } from "date-fns";
import {
  buildCycles,
  computeCycleStats,
  predictNextPeriod,
  getLateStatus,
  detectIrregularity,
} from "@/lib/cycleStats";

export default function AIPrediction({ logs, settings, onPrediction }) {
  const [aiInsight, setAiInsight] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);

  // ── Local stats (instant, no API) ───────────────────────────
  const cycles      = buildCycles(logs);
  const stats       = computeCycleStats(cycles);
  const localPred   = predictNextPeriod(cycles, settings);
  const lateStatus  = getLateStatus(localPred, settings);
  const irregularity = detectIrregularity(cycles);

  // Bubble prediction up to parent (for CycleWheel arc)
  useEffect(() => {
    if (localPred) onPrediction?.(localPred);
  }, [logs, settings]);

  // ── AI enrichment (runs once when we have enough data) ──────
  useEffect(() => {
    if (!settings || fetched) return;

    const periodLogs = logs
      .filter((l) => l.log_type === "period" && l.date)
      .sort((a, b) => parseISO(b.date) - parseISO(a.date))
      .slice(0, 20);

    if (periodLogs.length < 3) return;

    setLoading(true);
    setFetched(true);

    const context = periodLogs
      .map((l) => {
        let s = `${l.date} (flow: ${l.flow_intensity || "unknown"}`;
        if (l.stress_level)  s += `, stress: ${l.stress_level}/5`;
        if (l.sleep_quality) s += `, sleep: ${l.sleep_quality}/5`;
        if (l.exercise_type && l.exercise_type !== "none") s += `, exercise: ${l.exercise_type}`;
        return s + ")";
      })
      .join(", ");

    const today = format(new Date(), "yyyy-MM-dd");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: "You are a menstrual cycle prediction AI. Respond ONLY with valid JSON — no explanation, no markdown.",
        messages: [{
          role: "user",
          content: `Based on this period log data, give a short personalised insight.

Period logs: ${context}
Average cycle: ${settings.average_cycle_length || 28} days
Last period start: ${settings.last_period_start || "unknown"}
Today: ${today}
Local prediction: ${localPred?.predicted_date || "unknown"} (${localPred?.confidence || "unknown"} confidence)

Respond with JSON only:
{
  "insight": "One personalised sentence max 15 words about a notable pattern or health tip",
  "pattern_note": "One sentence about a specific symptom or lifestyle pattern, or null"
}`,
        }],
      }),
    })
      .then((r) => r.json())
      .then(({ content }) => {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) setAiInsight(JSON.parse(jsonMatch[0]));
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logs, settings]);

  if (!settings?.last_period_start) return null;
  if (!localPred && !lateStatus) return null;

  // ── Confidence colours ───────────────────────────────────────
  const confColor = {
    high:   { badge: "text-emerald-600 bg-emerald-50", bar: "from-emerald-400 to-emerald-500" },
    medium: { badge: "text-amber-600 bg-amber-50",     bar: "from-amber-400 to-amber-500" },
    low:    { badge: "text-slate-500 bg-slate-100",    bar: "from-slate-300 to-slate-400" },
  }[localPred?.confidence || "low"];

  const predictedLabel = localPred
    ? (() => { try { return format(parseISO(localPred.predicted_date), "MMM d"); } catch { return "—"; } })()
    : null;

  const rangeLabel = localPred?.range_start && localPred?.range_end
    ? (() => {
        try {
          return `${format(parseISO(localPred.range_start), "MMM d")} – ${format(parseISO(localPred.range_end), "MMM d")}`;
        } catch { return null; }
      })()
    : null;

  // Days until predicted period
  const daysUntil = localPred
    ? differenceInDays(parseISO(localPred.predicted_date), new Date())
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 space-y-3"
    >
      {/* ── Late period alert ──────────────────────────────── */}
      <AnimatePresence>
        {lateStatus && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`rounded-2xl p-4 border ${
              lateStatus.severity === "high"     ? "bg-rose-50 border-rose-200" :
              lateStatus.severity === "moderate" ? "bg-amber-50 border-amber-200" :
              lateStatus.severity === "mild"     ? "bg-yellow-50 border-yellow-200" :
                                                   "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-xl mt-0.5">{lateStatus.emoji}</span>
              <div>
                <p className={`text-sm font-semibold ${
                  lateStatus.severity === "high"     ? "text-rose-700" :
                  lateStatus.severity === "moderate" ? "text-amber-700" :
                  lateStatus.severity === "mild"     ? "text-yellow-700" :
                                                       "text-slate-600"
                }`}>
                  Period is {lateStatus.daysLate} {lateStatus.daysLate === 1 ? "day" : "days"} past expected
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{lateStatus.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main prediction card ───────────────────────────── */}
      {localPred && !lateStatus && (
        <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-2xl p-4 border border-violet-100">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Next Period</span>
            {localPred.confidence && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto capitalize ${confColor.badge}`}>
                {localPred.confidence} confidence
              </span>
            )}
          </div>

          {/* Date + range */}
          <div className="flex items-end gap-3 mb-3">
            <div>
              <p className="text-2xl font-bold text-slate-800">{predictedLabel}</p>
              {daysUntil !== null && daysUntil >= 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  in {daysUntil === 0 ? "less than a day" : `${daysUntil} ${daysUntil === 1 ? "day" : "days"}`}
                </p>
              )}
            </div>
          </div>

          {/* Confidence range bar */}
          {rangeLabel && (
            <div className="mb-3">
              <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Likely window</p>
              <div className="relative h-2 bg-white/60 rounded-full overflow-hidden">
                {/* Range band */}
                <div
                  className={`absolute top-0 h-full bg-gradient-to-r ${confColor.bar} opacity-30 rounded-full`}
                  style={{ left: "10%", right: "10%" }}
                />
                {/* Predicted date marker */}
                <div
                  className={`absolute top-0 w-2 h-full bg-gradient-to-b ${confColor.bar} rounded-full`}
                  style={{ left: "calc(50% - 4px)" }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">{format(parseISO(localPred.range_start), "MMM d")}</span>
                <span className="text-[10px] font-semibold text-violet-500">{predictedLabel}</span>
                <span className="text-[10px] text-slate-400">{format(parseISO(localPred.range_end), "MMM d")}</span>
              </div>
            </div>
          )}

          {/* AI insight */}
          {loading && (
            <div className="flex items-center gap-1.5 mt-1">
              <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
              <span className="text-[11px] text-violet-400">Analysing patterns…</span>
            </div>
          )}
          {aiInsight?.insight && !loading && (
            <p className="text-xs text-slate-500 italic">"{aiInsight.insight}"</p>
          )}
          {aiInsight?.pattern_note && !loading && (
            <p className="text-xs text-slate-400 mt-1">• {aiInsight.pattern_note}</p>
          )}

          {/* ── Cycle stats (always visible when data available) ── */}
          {stats.count >= 2 && (
            <div className="mt-3 pt-3 border-t border-violet-100/60">
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { label: "Avg length", value: stats.avg ? `${stats.avg}d` : "—", color: "text-violet-600" },
                  { label: "Variation",  value: stats.stdDev !== null ? `±${stats.stdDev}d` : "—", color: "text-amber-600" },
                  { label: "Tracked",    value: `${stats.count} cycles`, color: "text-slate-600" },
                ].map((s) => (
                  <div key={s.label} className="text-center bg-white/60 rounded-xl py-2">
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {stats.last3.length > 0 && (
                <>
                  <p className="text-[9px] text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Last 3 cycles</p>
                  <div className="flex gap-1.5">
                    {stats.last3.map((len, i) => {
                      const isLong  = stats.avg && len > stats.avg + 2;
                      const isShort = stats.avg && len < stats.avg - 2;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-xl py-1.5 text-center ${
                            isLong  ? "bg-amber-100"  :
                            isShort ? "bg-blue-100"   :
                                      "bg-violet-100"
                          }`}
                        >
                          <span className={`text-xs font-bold ${
                            isLong  ? "text-amber-700"  :
                            isShort ? "text-blue-700"   :
                                      "text-violet-700"
                          }`}>{len}d</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Irregularity flag ─────────────────────────────── */}
      <AnimatePresence>
        {irregularity?.isIrregular && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Cycle variability detected</p>
              <p className="text-xs text-amber-600 mt-0.5">{irregularity.message}</p>
              <p className="text-[10px] text-amber-400 mt-1">Cycle lengths: {irregularity.last3.join(", ")} days</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
