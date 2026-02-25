import React from "react";
import { motion } from "framer-motion";
import { Droplets, Calendar, Moon, Heart } from "lucide-react";

export default function QuickStats({ nextPeriodIn, cycleLength, periodLength, lastPeriod, cyclesCount = 0 }) {
  const stats = [
    {
      icon: Droplets,
      label: "Next Period",
      value: nextPeriodIn <= 0 ? "Today" : `${nextPeriodIn} days`,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      icon: Calendar,
      label: cyclesCount >= 2 ? "Est. Cycle Length" : "Cycle Length",
      value: `${Math.round(cycleLength)} days`,
      color: "text-violet-500",
      bg: "bg-violet-50",
    },
    {
      icon: Moon,
      label: cyclesCount >= 1 ? "Avg Period Length" : "Period Length",
      value: `${periodLength} days`,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      icon: Heart,
      label: "Last Period",
      value: lastPeriod || "Not set",
      color: "text-pink-500",
      bg: "bg-pink-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i, duration: 0.4 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
        >
          <div className={`${stat.bg} w-9 h-9 rounded-xl flex items-center justify-center mb-2`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
          <p className="text-base font-semibold text-slate-800 mt-0.5">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}