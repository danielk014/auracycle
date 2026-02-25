import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, Loader2, RotateCcw, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInDays, format } from "date-fns";
import ChatBubble from "@/components/chat/ChatBubble";
import { getCycleLogs, getCycleSettings } from "@/lib/db";
import {
  buildCycles,
  computeCycleStats,
  predictNextPeriod,
  getLateStatus,
  detectIrregularity,
  computeSymptomPatterns,
  getFertileWindow,
} from "@/lib/cycleStats";

const SUGGESTION_CATEGORIES = [
  {
    label: "Cycle",
    color: "bg-rose-50 text-rose-600 border-rose-100",
    prompts: [
      "Why might my period be late?",
      "What's a normal cycle length?",
      "What does my cycle pattern say about my health?",
    ],
  },
  {
    label: "Symptoms",
    color: "bg-amber-50 text-amber-700 border-amber-100",
    prompts: [
      "Tips for managing PMS symptoms",
      "How to reduce cramps naturally",
      "Why do I feel bloated before my period?",
    ],
  },
  {
    label: "Mood",
    color: "bg-violet-50 text-violet-600 border-violet-100",
    prompts: [
      "Why am I more emotional before my period?",
      "How does my cycle affect my mood?",
      "Natural ways to feel better during PMS",
    ],
  },
  {
    label: "Wellness",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    prompts: [
      "Best foods during my period",
      "How does sleep affect my cycle?",
      "Exercise tips for each cycle phase",
    ],
  },
];

const LUNA_SYSTEM_PROMPT = (context) => `You are Luna, a warm, empathetic, and knowledgeable AI menstrual health assistant built into the AuraCycle app. You help users understand their cycle, symptoms, mood patterns, and overall wellness.

Guidelines:
- Be warm, supportive, and non-judgmental
- Provide evidence-based, accurate information
- Personalise responses using the user's actual cycle data when relevant
- Keep responses concise but helpful — use bullet points and bold for readability
- Always recommend consulting a healthcare provider for serious medical concerns
- You are NOT a doctor — make this clear when appropriate
- Use a friendly, conversational tone — like a knowledgeable friend

${context}`;

export default function AIAssistant() {
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const chatEndRef   = useRef(null);
  const textareaRef  = useRef(null);

  // Fetch ALL logs — RLS at DB level guarantees this user only sees their own data
  const { data: logs = [] } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => getCycleLogs(500),
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const buildContext = () => {
    // All data is scoped to the authenticated user via Supabase RLS — no cross-user leakage
    const today       = format(new Date(), "yyyy-MM-dd");
    const periodLogs  = logs.filter((l) => l.log_type === "period");
    const symptomLogs = logs.filter((l) => l.symptoms?.length > 0);
    const moodLogs    = logs.filter((l) => l.moods?.length > 0);
    const lifestyleLogs = logs.filter((l) => l.sleep_hours || l.stress_level || l.exercise);

    // Computed stats (pure JS, no API)
    const cycles      = buildCycles(logs);
    const stats       = computeCycleStats(cycles);
    const prediction  = predictNextPeriod(cycles, settings);
    const lateStatus  = getLateStatus(prediction, settings);
    const irregularity = detectIrregularity(cycles);
    const patterns    = computeSymptomPatterns(logs, cycles);
    const fertile     = settings?.last_period_start
      ? getFertileWindow(settings.last_period_start, stats.avg || settings?.average_cycle_length || 28)
      : null;

    let ctx = "=== User's Complete Cycle & Health Data ===\n";
    ctx += `Today: ${today}\n\n`;

    // ── Settings ──
    if (settings) {
      ctx += "--- Settings ---\n";
      ctx += `Cycle length (manual): ${settings.average_cycle_length || 28} days\n`;
      ctx += `Period length (manual): ${settings.average_period_length || 5} days\n`;
      if (settings.last_period_start) {
        const daysSince = differenceInDays(new Date(), new Date(settings.last_period_start));
        const cycleDay  = (daysSince % (settings.average_cycle_length || 28)) + 1;
        ctx += `Last period start: ${settings.last_period_start} (${daysSince} days ago, cycle day ${cycleDay})\n`;
      }
      if (settings.last_period_end) ctx += `Last period end: ${settings.last_period_end}\n`;
    }

    // ── Computed stats ──
    ctx += "\n--- Computed Statistics ---\n";
    if (stats.count >= 2) {
      ctx += `Average cycle: ${stats.avg} days\n`;
      ctx += `Cycle variation (std dev): ±${stats.stdDev} days\n`;
      ctx += `Range: ${stats.min}–${stats.max} days across ${stats.count} cycles\n`;
      if (stats.last3.length > 0) ctx += `Last 3 cycle lengths: ${stats.last3.join(", ")} days\n`;
    }
    if (prediction) {
      ctx += `Predicted next period: ${prediction.predicted_date} (range: ${prediction.range_start} – ${prediction.range_end}, ${prediction.confidence} confidence)\n`;
    }
    if (lateStatus) {
      ctx += `LATE PERIOD: ${lateStatus.daysLate} days late — ${lateStatus.message}\n`;
    }
    if (irregularity) {
      ctx += `Cycle regularity: ${irregularity.isIrregular ? "IRREGULAR" : "regular"} — ${irregularity.message}\n`;
    }
    if (fertile) {
      ctx += `Fertile window this cycle: ${fertile.startFormatted} – ${fertile.endFormatted} (ovulation est. ${fertile.ovulationFormatted})\n`;
      if (fertile.isActive) ctx += "Note: User is currently in their fertile window.\n";
    }

    // ── Symptom patterns ──
    if (patterns.length > 0) {
      ctx += "\n--- Symptom Timing Patterns ---\n";
      patterns.slice(0, 8).forEach((p) => {
        ctx += `  • ${p.symptom}: typically ${p.typicalRange} of cycle (${p.count} occurrences)\n`;
      });
    }

    // ── Period logs ──
    if (periodLogs.length > 0) {
      ctx += `\n--- Period Logs (${periodLogs.length} total, showing recent 12) ---\n`;
      periodLogs.slice(0, 12).forEach((l) => {
        ctx += `  • ${l.date}: flow=${l.flow_intensity || "unspecified"}`;
        if (l.symptoms?.length) ctx += `, symptoms: ${l.symptoms.join(", ")}`;
        if (l.stress_level) ctx += `, stress: ${l.stress_level}/5`;
        if (l.sleep_quality) ctx += `, sleep: ${l.sleep_quality}/5`;
        ctx += "\n";
      });
    }

    // ── Symptom logs ──
    if (symptomLogs.length > 0) {
      ctx += `\n--- Symptom Logs (${symptomLogs.length} total, showing recent 10) ---\n`;
      symptomLogs.slice(0, 10).forEach((l) => {
        ctx += `  • ${l.date}: ${l.symptoms.join(", ")}`;
        if (l.stress_level) ctx += ` | stress: ${l.stress_level}/5`;
        if (l.sleep_quality) ctx += ` | sleep quality: ${l.sleep_quality}/5`;
        ctx += "\n";
      });
    }

    // ── Mood logs ──
    if (moodLogs.length > 0) {
      ctx += `\n--- Mood Logs (${moodLogs.length} total, showing recent 10) ---\n`;
      moodLogs.slice(0, 10).forEach((l) => {
        ctx += `  • ${l.date}: ${l.moods.join(", ")}`;
        if (l.notes) ctx += ` | note: "${l.notes.slice(0, 60)}"`;
        ctx += "\n";
      });
    }

    // ── Lifestyle data ──
    if (lifestyleLogs.length > 0) {
      ctx += `\n--- Lifestyle Logs (${lifestyleLogs.length} total, showing recent 8) ---\n`;
      lifestyleLogs.slice(0, 8).forEach((l) => {
        const parts = [];
        if (l.sleep_hours) parts.push(`sleep: ${l.sleep_hours}h`);
        if (l.sleep_quality) parts.push(`sleep quality: ${l.sleep_quality}/5`);
        if (l.stress_level) parts.push(`stress: ${l.stress_level}/5`);
        if (l.water_intake) parts.push(`water: ${l.water_intake}ml`);
        if (l.exercise) parts.push(`exercise: ${l.exercise_type || "yes"}`);
        ctx += `  • ${l.date}: ${parts.join(", ")}\n`;
      });
    }

    return ctx;
  };

  const sendMessage = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const systemPrompt = LUNA_SYSTEM_PROMPT(buildContext());

      // Call Vercel serverless function — uses server-side ANTHROPIC_API_KEY
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: updatedMessages.slice(-10), // send last 10 messages for context
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { content } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I couldn't respond right now. ${err.message || "Please try again."} 💜`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCategory = SUGGESTION_CATEGORIES[activeCat];

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto" style={{ background: "linear-gradient(160deg, #faf5ff 0%, #fff0f8 100%)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 bg-white/70 backdrop-blur-xl border-b border-purple-50 shadow-sm">
        <Link to={createPageUrl("Home")} className="p-2 -ml-2 rounded-xl hover:bg-purple-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-md shadow-violet-200">
            <Sparkles className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Luna AI</h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Your health companion
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-2 rounded-xl hover:bg-purple-50 transition-colors text-slate-400 hover:text-slate-600"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center pt-6"
          >
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-violet-200">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">AI</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Hi, I'm Luna! 👋</h3>
            <p className="text-sm text-slate-500 text-center mb-6 max-w-xs leading-relaxed">
              Your personal cycle health companion. Ask me anything — I'm here to help you understand your body.
            </p>

            {/* Category tabs */}
            <div className="w-full mb-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {SUGGESTION_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCat(i)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      activeCat === i ? cat.color + " shadow-sm" : "bg-white text-slate-400 border-slate-100"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full space-y-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCat}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2"
                >
                  {activeCategory.prompts.map((prompt, i) => (
                    <motion.button
                      key={prompt}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left text-sm bg-white rounded-2xl px-4 py-3.5 border border-purple-50 text-slate-600 hover:border-violet-200 hover:bg-violet-50/40 transition-all flex items-center justify-between group shadow-sm"
                    >
                      <span>{prompt}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors flex-shrink-0 ml-2" />
                    </motion.button>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-purple-50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                {[0, 0.18, 0.36].map((delay, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay }}
                    className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-pink-400"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pt-3 pb-6 bg-white/90 backdrop-blur-xl border-t border-purple-50 shadow-[0_-4px_16px_rgba(139,92,246,0.06)]">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 bg-slate-50 rounded-2xl border border-purple-100 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask Luna anything about your cycle..."
              rows={1}
              className="w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none text-slate-700 placeholder:text-slate-400 leading-relaxed"
              style={{ maxHeight: 120, minHeight: 44 }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 flex-shrink-0 shadow-md shadow-violet-200 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center"
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </form>
      </div>
    </div>
  );
}
