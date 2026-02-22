import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays, addDays } from "date-fns";
import ChatBubble from "@/components/chat/ChatBubble";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Why might my period be late?",
  "Tips for managing PMS symptoms",
  "What does my cycle pattern say about my health?",
  "Best foods during my period",
  "How to reduce cramps naturally",
  "Why am I more emotional before my period?",
];

export default function AIAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: logs } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => base44.entities.CycleLog.list("-date", 100),
    initialData: [],
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: async () => {
      const list = await base44.entities.CycleSettings.list();
      return list[0] || null;
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => {
    const periodLogs = logs.filter((l) => l.log_type === "period").slice(0, 20);
    const symptomLogs = logs.filter((l) => l.symptoms?.length > 0).slice(0, 20);
    const moodLogs = logs.filter((l) => l.moods?.length > 0).slice(0, 20);

    let context = "User's Menstrual Health Data:\n";

    if (settings) {
      context += `- Average cycle length: ${settings.average_cycle_length || 28} days\n`;
      context += `- Average period length: ${settings.average_period_length || 5} days\n`;
      if (settings.last_period_start) {
        const daysSince = differenceInDays(new Date(), new Date(settings.last_period_start));
        context += `- Last period started: ${settings.last_period_start} (${daysSince} days ago)\n`;
        context += `- Current cycle day: ${(daysSince % (settings.average_cycle_length || 28)) + 1}\n`;
      }
    }

    if (periodLogs.length > 0) {
      context += "\nRecent Period Logs:\n";
      periodLogs.forEach((l) => {
        context += `- ${l.date}: Flow ${l.flow_intensity || "unspecified"}`;
        if (l.symptoms?.length) context += `, Symptoms: ${l.symptoms.join(", ")}`;
        context += "\n";
      });
    }

    if (symptomLogs.length > 0) {
      context += "\nRecent Symptoms:\n";
      symptomLogs.forEach((l) => {
        context += `- ${l.date}: ${l.symptoms.join(", ")}\n`;
      });
    }

    if (moodLogs.length > 0) {
      context += "\nRecent Moods:\n";
      moodLogs.forEach((l) => {
        context += `- ${l.date}: ${l.moods.join(", ")}\n`;
      });
    }

    return context;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const context = buildContext();
      const conversationHistory = messages.slice(-8).map((m) => `${m.role}: ${m.content}`).join("\n");

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Luna, a friendly and knowledgeable AI menstrual health assistant. You provide helpful, empathetic, and evidence-based advice about menstrual health, cycle tracking, symptoms, and wellness.

IMPORTANT: You are NOT a doctor. Always recommend consulting a healthcare provider for serious concerns. Be warm, supportive, and non-judgmental.

${context}

Previous conversation:
${conversationHistory}

User's question: ${text}

Provide a helpful, personalized response based on the user's data. Use markdown formatting for readability. Keep responses concise but informative.`,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again in a moment. 💜" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-violet-50/50 to-white max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <Link to={createPageUrl("Home")} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-rose-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Luna AI</h2>
            <p className="text-xs text-slate-400">Your health assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center pt-8"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-rose-100 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Hey there! 👋</h3>
            <p className="text-sm text-slate-400 text-center mb-6 max-w-xs">
              I'm Luna, your AI health companion. Ask me anything about your cycle, symptoms, or wellness.
            </p>
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Try asking</p>
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left text-sm bg-white rounded-2xl px-4 py-3 border border-slate-100 text-slate-600 hover:border-violet-200 hover:bg-violet-50/50 transition-all"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-rose-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-2 h-2 rounded-full bg-violet-300" />
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-2 h-2 rounded-full bg-violet-300" />
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-2 h-2 rounded-full bg-violet-300" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-md border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Luna anything..."
            className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm border border-slate-200 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 hover:from-violet-600 hover:to-rose-600 p-0 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}