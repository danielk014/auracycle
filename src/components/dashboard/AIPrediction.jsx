import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { parseISO, format } from "date-fns";

export default function AIPrediction({ logs, settings, onPrediction }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [fetched, setFetched]       = useState(false);

  useEffect(() => {
    if (!settings || fetched || logs.length < 3) return;

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
        if (l.stress_level) s += `, stress: ${l.stress_level}/5`;
        if (l.sleep_quality) s += `, sleep quality: ${l.sleep_quality}/5`;
        if (l.exercise_type && l.exercise_type !== "none") s += `, exercise: ${l.exercise_type}`;
        return s + ")";
      })
      .join(", ");

    const today = format(new Date(), "yyyy-MM-dd");

    const systemPrompt = `You are a menstrual cycle prediction AI. Respond ONLY with valid JSON — no explanation, no markdown.`;
    const userMessage = `Based on this historical period data, predict the next period.

Period log dates (with lifestyle factors): ${context}
Reported average cycle length: ${settings.average_cycle_length || 28} days
Last period start: ${settings.last_period_start || "unknown"}
Today: ${today}

Respond with JSON only:
{
  "predicted_date": "YYYY-MM-DD",
  "range_start": "YYYY-MM-DD",
  "range_end": "YYYY-MM-DD",
  "confidence": "high|medium|low",
  "insight": "One sentence max 12 words about the pattern"
}`;

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    })
      .then((r) => r.json())
      .then(({ content }) => {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setPrediction(parsed);
            onPrediction?.(parsed);
          }
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logs, settings]);

  if (!settings?.last_period_start) return null;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-2xl px-4 py-3 border border-violet-100 flex items-center gap-3 mb-5"
      >
        <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
        <p className="text-xs text-violet-500">AI is analysing your cycle history…</p>
      </motion.div>
    );
  }

  if (!prediction) return null;

  const confidenceColors = {
    high:   "text-emerald-600 bg-emerald-50",
    medium: "text-amber-600 bg-amber-50",
    low:    "text-slate-500 bg-slate-100",
  };

  const predictedLabel = (() => {
    try { return format(parseISO(prediction.predicted_date), "MMM d"); }
    catch { return prediction.predicted_date; }
  })();

  const rangeLabel = (() => {
    try { return `${format(parseISO(prediction.range_start), "MMM d")} – ${format(parseISO(prediction.range_end), "MMM d")}`; }
    catch { return null; }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-2xl p-4 border border-violet-100 mb-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-violet-500" />
        <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">AI Prediction</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto capitalize ${confidenceColors[prediction.confidence] || confidenceColors.low}`}>
          {prediction.confidence} confidence
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-2xl font-bold text-slate-800">{predictedLabel}</p>
          {rangeLabel && <p className="text-xs text-slate-400 mt-0.5">Range: {rangeLabel}</p>}
        </div>
      </div>
      {prediction.insight && (
        <p className="text-xs text-slate-500 mt-2 italic">"{prediction.insight}"</p>
      )}
    </motion.div>
  );
}
