import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays, addDays, format } from "date-fns";
import CycleWheel from "@/components/dashboard/CycleWheel";
import QuickStats from "@/components/dashboard/QuickStats";
import DailyTip from "@/components/dashboard/DailyTip";
import AIPrediction from "@/components/dashboard/AIPrediction";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, MessageCircle, CheckCircle, X } from "lucide-react";
import { getCycleLogs, getCycleSettings, upsertCycleSettings } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { buildCycles, computeCycleStats } from "@/lib/cycleStats";
import { toast } from "sonner";

function getPhase(cycleDay, cycleLength, periodLength) {
  if (cycleDay <= periodLength) return "period";
  if (cycleDay <= periodLength + 6) return "follicular";
  if (cycleDay <= periodLength + 10) return "ovulation";
  return "luteal";
}

export default function Home() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showEndPeriod, setShowEndPeriod] = useState(true);

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["recentLogs"],
    queryFn: () => getCycleLogs(30),
  });

  // Use computed averages from actual logs when available, fall back to settings
  const allLogs = recentLogs; // recentLogs is last 30; for cycle calc that's enough
  const computedCycles = buildCycles(allLogs);
  const computedStats  = computeCycleStats(computedCycles);
  const cycleLength  = computedStats.avg || settings?.average_cycle_length  || 28;

  // Average period length from actual logged cycles (span of consecutive period days)
  const avgPeriodFromLogs = computedCycles.length > 0
    ? Math.round(computedCycles.reduce((sum, c) => sum + c.periodLength, 0) / computedCycles.length)
    : null;
  const periodLength = avgPeriodFromLogs ?? settings?.average_period_length ?? 5;
  const lastPeriodStart = settings?.last_period_start;

  let cycleDay = 1;
  let nextPeriodIn = Math.round(cycleLength);
  let nextPeriodDate = "";

  if (lastPeriodStart) {
    const daysSince = differenceInDays(new Date(), new Date(lastPeriodStart));
    cycleDay = (daysSince % cycleLength) + 1;
    nextPeriodIn = cycleLength - (daysSince % cycleLength);
    nextPeriodDate = format(addDays(new Date(), nextPeriodIn), "MMM d");
  }

  const phase = getPhase(cycleDay, cycleLength, periodLength);
  const [aiPrediction, setAiPrediction] = useState(null);

  // Determine if user is currently in period and hasn't marked it ended
  const isPeriodActive = phase === "period" && !settings?.last_period_end;
  const isEndedToday = settings?.last_period_end === format(new Date(), "yyyy-MM-dd");

  const markPeriodEnded = useMutation({
    mutationFn: () =>
      upsertCycleSettings({ last_period_end: format(new Date(), "yyyy-MM-dd") }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycleSettings"] });
      toast.success("Period marked as ended 🎉");
      setShowEndPeriod(false);
    },
  });

  return (
    <div className="pb-28 px-4 pt-10 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <p className="text-sm text-slate-400 font-medium">
          {profile?.display_name ? `Hey, ${profile.display_name} 👋` : "Welcome back 👋"}
        </p>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">AuraCycle</h1>
      </motion.div>

      {/* "Mark period ended" banner */}
      <AnimatePresence>
        {isPeriodActive && showEndPeriod && !isEndedToday && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-700">Has your period ended?</p>
              <p className="text-xs text-rose-400 mt-0.5">Tap to log your period end date</p>
            </div>
            <button
              onClick={() => markPeriodEnded.mutate()}
              disabled={markPeriodEnded.isPending}
              className="flex items-center gap-1.5 bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-rose-600 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Yes, ended
            </button>
            <button onClick={() => setShowEndPeriod(false)} className="text-rose-300 hover:text-rose-500">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cycle wheel — tap to go to Calendar */}
      <div className="mb-6">
        <Link to={createPageUrl("Calendar")} className="block">
          <CycleWheel
            cycleDay={cycleDay}
            cycleLength={cycleLength}
            periodLength={periodLength}
            phase={phase}
            prediction={aiPrediction}
          />
        </Link>
        {lastPeriodStart ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-sm text-slate-400 mt-3"
          >
            Next period expected around{" "}
            <span className="font-semibold text-rose-400">{nextPeriodDate}</span>
          </motion.p>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
            <Link
              to={createPageUrl("Settings")}
              className="text-sm text-violet-500 font-semibold hover:text-violet-600 transition-colors"
            >
              Set your last period date to get started →
            </Link>
          </motion.div>
        )}
      </div>

      <div className="mb-5">
        <QuickStats
          nextPeriodIn={nextPeriodIn}
          cycleLength={cycleLength}
          periodLength={periodLength}
          lastPeriod={lastPeriodStart ? format(new Date(lastPeriodStart), "MMM d") : null}
          cyclesCount={computedCycles.length}
        />
      </div>

      <AIPrediction logs={recentLogs} settings={settings} onPrediction={setAiPrediction} />
      <DailyTip phase={phase} />

      {/* FABs */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-10">
        <Link
          to={createPageUrl("AIAssistant")}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Link>
        <Link
          to={createPageUrl("LogEntry")}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 shadow-lg shadow-rose-200 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6 text-white" />
        </Link>
      </div>
    </div>
  );
}
