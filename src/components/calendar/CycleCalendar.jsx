import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  differenceInDays,
  addDays,
} from "date-fns";

function getDayPhase(day, settings) {
  if (!settings?.last_period_start) return null;
  const cycleLength = settings.average_cycle_length || 28;
  const periodLength = settings.average_period_length || 5;
  const lastStart = new Date(settings.last_period_start);
  const daysSince = differenceInDays(day, lastStart);
  if (daysSince < 0) return null;
  const cycleDay = (daysSince % cycleLength) + 1;

  if (cycleDay <= periodLength) return "period";
  if (cycleDay <= periodLength + 5) return "follicular";
  if (cycleDay >= cycleLength - 14 && cycleDay <= cycleLength - 14 + 5) return "ovulation";
  if (cycleDay > periodLength + 5 && cycleDay < cycleLength - 14) return "follicular";
  return "luteal";
}

const PHASE_STYLES = {
  period: "bg-rose-100 text-rose-700",
  follicular: "bg-emerald-50 text-emerald-700",
  ovulation: "bg-green-100 text-green-700",
  luteal: "bg-amber-50 text-amber-700",
};

const LEGEND = [
  { label: "Period", color: "bg-rose-300" },
  { label: "Fertile", color: "bg-green-300" },
  { label: "Luteal", color: "bg-amber-300" },
  { label: "Logged", color: "bg-violet-300" },
];

export default function CycleCalendar({ logs = [], settings, onDayClick, selectedDay }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const getLogForDay = (day) => logs.find((l) => isSameDay(new Date(l.date), day));

  const getAllLogsForDay = (day) => logs.filter((l) => isSameDay(new Date(l.date), day));

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-purple-50">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-9 h-9 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-800">
            {format(currentMonth, "MMMM")}
          </h3>
          <p className="text-xs text-slate-400">{format(currentMonth, "yyyy")}</p>
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-9 h-9 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const allDayLogs = getAllLogsForDay(day);
          const isPeriod = allDayLogs.some((l) => l.log_type === "period");
          const hasSymptom = allDayLogs.some((l) => l.symptoms?.length > 0);
          const hasMood = allDayLogs.some((l) => l.moods?.length > 0);
          const hasAnyLog = allDayLogs.length > 0;
          const today = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const phase = getDayPhase(day, settings);

          let bgClass = "hover:bg-slate-50 text-slate-600";
          if (isPeriod) bgClass = "bg-rose-100 text-rose-700 font-semibold";
          else if (phase === "ovulation") bgClass = "bg-green-50 text-green-700";
          else if (phase === "follicular") bgClass = "bg-emerald-50/60 text-emerald-700";
          else if (phase === "luteal") bgClass = "bg-amber-50/60 text-amber-700";

          return (
            <motion.button
              key={day.toISOString()}
              whileTap={{ scale: 0.88 }}
              onClick={() => onDayClick?.(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all ${bgClass} ${
                isSelected ? "ring-2 ring-violet-500 ring-offset-1" : ""
              } ${today && !isSelected ? "ring-2 ring-violet-300 font-bold" : ""}`}
            >
              <span className={`${today ? "text-violet-600" : ""} text-xs leading-none`}>
                {format(day, "d")}
              </span>
              <div className="flex gap-0.5 mt-0.5">
                {isPeriod && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                {hasSymptom && !isPeriod && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                {hasMood && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-slate-50">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-[10px] text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
