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
} from "date-fns";

// Returns the cycle phase for a given day based on user settings
function getDayPhase(day, settings) {
  if (!settings?.last_period_start) return null;
  const cycleLength  = settings.average_cycle_length  || 28;
  const periodLength = settings.average_period_length || 5;
  const lastStart    = new Date(settings.last_period_start);
  const daysSince    = differenceInDays(day, lastStart);
  if (daysSince < 0) return null;
  const cycleDay = (daysSince % cycleLength) + 1;

  if (cycleDay <= periodLength)                                            return "period";
  // Fertile window: ~5 days before ovulation (day 14 by default) + ovulation day
  if (cycleDay >= cycleLength - 16 && cycleDay <= cycleLength - 11)       return "fertile";
  // Luteal: after ovulation until end of cycle
  if (cycleDay > cycleLength - 11)                                        return "luteal";
  return "follicular";
}

const DAY_STYLES = {
  period:     { bg: "bg-rose-100",   text: "text-rose-700",   dot: "bg-rose-400" },
  fertile:    { bg: "bg-pink-50",    text: "text-pink-700",   dot: "bg-pink-400" },
  luteal:     { bg: "bg-yellow-50",  text: "text-yellow-700", dot: "bg-yellow-400" },
  follicular: { bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-400" },
};

const LEGEND = [
  { label: "Period",    emoji: "🩸", color: "bg-rose-200" },
  { label: "Fertile",  emoji: "💗", color: "bg-pink-200" },
  { label: "Luteal",   emoji: null, color: "bg-yellow-200" },
  { label: "Logged",   emoji: null, color: "bg-violet-200" },
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CycleCalendar({ logs = [], settings, onDayClick, selectedDay }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart   = startOfMonth(currentMonth);
  const monthEnd     = endOfMonth(currentMonth);
  const days         = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const getLogsForDay = (day) => logs.filter((l) => isSameDay(new Date(l.date), day));

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-purple-50">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-9 h-9 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-800">{format(currentMonth, "MMMM")}</h3>
          <p className="text-xs text-slate-400">{format(currentMonth, "yyyy")}</p>
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-9 h-9 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1 uppercase tracking-wide">
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
          const dayLogs    = getLogsForDay(day);
          const isPeriod   = dayLogs.some((l) => l.log_type === "period");
          const hasSymptom = dayLogs.some((l) => l.symptoms?.length > 0);
          const hasMood    = dayLogs.some((l) => l.moods?.length > 0);
          const hasNote    = dayLogs.some((l) => l.log_type === "note" || l.notes);
          const hasLog     = dayLogs.length > 0;
          const today      = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const phase      = getDayPhase(day, settings);

          // Background based on logged period vs predicted phase
          let bg   = "";
          let text = "text-slate-600";
          if (isPeriod) {
            bg   = "bg-rose-100";
            text = "text-rose-700 font-bold";
          } else if (phase === "fertile") {
            bg   = "bg-pink-50";
            text = "text-pink-700";
          } else if (phase === "luteal") {
            bg   = "bg-yellow-50";
            text = "text-yellow-700";
          } else if (phase === "follicular") {
            bg   = "bg-emerald-50/50";
            text = "text-emerald-700";
          }

          // Fertile window gets heart emoji overlay
          const isFertile = !isPeriod && phase === "fertile";

          return (
            <motion.button
              key={day.toISOString()}
              whileTap={{ scale: 0.88 }}
              onClick={() => onDayClick?.(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl text-xs transition-all
                ${bg} ${text}
                ${isSelected ? "ring-2 ring-violet-500 ring-offset-1 shadow-sm" : ""}
                ${today && !isSelected ? "ring-2 ring-violet-400 font-bold" : ""}
                ${!bg ? "hover:bg-slate-50" : ""}
              `}
            >
              {/* Heart emoji for fertile days */}
              {isFertile && (
                <span className="absolute -top-0.5 -right-0.5 text-[9px] leading-none">💗</span>
              )}

              {/* Date number */}
              <span className={`leading-none text-[13px] ${today ? "text-violet-600 font-bold" : ""}`}>
                {format(day, "d")}
              </span>

              {/* Indicator dots */}
              <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                {isPeriod   && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                {hasLog && !isPeriod && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                {hasSymptom && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                {hasMood    && <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-3 mt-4 pt-3 border-t border-slate-50">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            {item.emoji ? (
              <span className="text-sm leading-none">{item.emoji}</span>
            ) : (
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
            )}
            <span className="text-[10px] font-medium text-slate-400">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-300" />
          <span className="text-[10px] font-medium text-slate-400">Symptoms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-pink-300" />
          <span className="text-[10px] font-medium text-slate-400">Mood</span>
        </div>
      </div>
    </div>
  );
}
