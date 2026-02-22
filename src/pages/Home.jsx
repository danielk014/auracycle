import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { differenceInDays, addDays, format } from "date-fns";
import CycleWheel from "../components/dashboard/CycleWheel";
import QuickStats from "../components/dashboard/QuickStats";
import DailyTip from "../components/dashboard/DailyTip";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Plus, MessageCircle } from "lucide-react";

function getPhase(cycleDay, cycleLength, periodLength) {
  if (cycleDay <= periodLength) return "period";
  if (cycleDay <= periodLength + 6) return "follicular";
  if (cycleDay <= periodLength + 10) return "ovulation";
  return "luteal";
}

export default function Home() {
  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: async () => {
      const list = await base44.entities.CycleSettings.list();
      return list[0] || null;
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["recentLogs"],
    queryFn: () => base44.entities.CycleLog.list("-date", 30),
    initialData: [],
  });

  const cycleLength = settings?.average_cycle_length || 28;
  const periodLength = settings?.average_period_length || 5;
  const lastPeriodStart = settings?.last_period_start;

  let cycleDay = 1;
  let nextPeriodIn = cycleLength;
  let nextPeriodDate = "";

  if (lastPeriodStart) {
    const daysSince = differenceInDays(new Date(), new Date(lastPeriodStart));
    cycleDay = (daysSince % cycleLength) + 1;
    nextPeriodIn = cycleLength - (daysSince % cycleLength);
    nextPeriodDate = format(addDays(new Date(), nextPeriodIn), "MMM d");
  }

  const phase = getPhase(cycleDay, cycleLength, periodLength);

  return (
    <div className="pb-24 px-4 pt-2 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Luna</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your cycle companion</p>
      </motion.div>

      <div className="mb-6">
        <CycleWheel
          cycleDay={cycleDay}
          cycleLength={cycleLength}
          periodLength={periodLength}
          phase={phase}
        />
        {lastPeriodStart && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-sm text-slate-400 mt-3"
          >
            Next period expected around <span className="font-semibold text-rose-400">{nextPeriodDate}</span>
          </motion.p>
        )}
        {!lastPeriodStart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4"
          >
            <Link
              to={createPageUrl("Settings")}
              className="text-sm text-violet-500 font-medium hover:text-violet-600 transition-colors"
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
        />
      </div>

      <DailyTip phase={phase} />

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