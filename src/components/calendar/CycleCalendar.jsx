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
  parseISO,
  isWithinInterval,
} from "date-fns";

// Returns the cycle phase for a given day based on user settings (current cycle)
function getDayPhase(day, settings) {
  if (!settings?.last_period_start) return null;
  const cycleLength  = settings.average_cycle_length  || 28;
  const periodLength = settings.average_period_length || 5;
  const lastStart    = new Date(settings.last_period_start);
  const daysSince    = differenceInDays(day, lastStart);
  if (daysSince < 0) return null;
  const cycleDay = (daysSince % cycleLength) + 1;

  if (cycleDay <= periodLength)                                       return "period";
  if (cycleDay >= cycleLength - 16 && cycleDay <= cycleLength - 11)  return "fertile";
  if (cycleDay > cycleLength - 11)                                    return "luteal";
  return "follicular";
}

// Is this day within the predicted next period range?
function isPredictedPeriodDay(day, prediction) {
  if (!prediction?.range_start || !prediction?.range_end) return false;
  try {
    return isWithinInterval(day, {
      start: parseISO(prediction.range_start),
      end:   parseISO(prediction.range_end),
    });
  } catch { return false; }
}

// Is this day the exact predicted period date?
function isPredictedMidDay(day, prediction) {
  if (!prediction?.predicted_date) return false;
  try { return isSameDay(day, parseISO(prediction.predicted_date)); }
  catch { return false; }
}

// Is this day within the next fertile window?
function isNextFertileDay(day, fertileWindow) {
  if (!fertileWindow?.start || !fertileWindow?.end) return false;
  try {
    return isWithinInterval(day, { start: fertileWindow.start, end: fertileWindow.end });
  } catch { return false; }
}

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CycleCalendar({ logs = [], settings, prediction, fertileWindow, onDayClick, selectedDay }) {
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
          const dayLogs      = getLogsForDay(day);
          const isPeriod     = dayLogs.some((l) => l.log_type === "period");
          const hasSymptom   = dayLogs.some((l) => l.symptoms?.length > 0);
          const hasMood      = dayLogs.some((l) => l.moods?.length > 0);
          const hasLog       = dayLogs.length > 0;
          const today        = isToday(day);
          const isSelected   = selectedDay && isSameDay(day, selectedDay);
          const phase        = getDayPhase(day, settings);

          // Prediction overlays (only when not logged)
          const predPeriod   = !isPeriod && isPredictedPeriodDay(day, prediction);
          const predMid      = !isPeriod && isPredictedMidDay(day, prediction);
          const nextFertile  = !isPeriod && !predPeriod && isNextFertileDay(day, fertileWindow);

          // Background priority: logged period → predicted period → current fertile → phases
          let bg   = "";
          let text = "text-slate-600";

          if (isPeriod) {
            bg   = "bg-rose-100";
            text = "text-rose-700 font-bold";
          } else if (predMid) {
            bg   = "bg-rose-200";
            text = "text-rose-800 font-bold";
          } else if (predPeriod) {
            bg   = "bg-rose-50 border border-rose-200 border-dashed";
            text = "text-rose-600";
          } else if (nextFertile) {
            bg   = "bg-emerald-50 border border-emerald-200 border-dashed";
            text = "text-emerald-700";
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

          const isFertile = !isPeriod && !predPeriod && !nextFertile && phase === "fertile";

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
              {/* Overlays */}
              {isFertile  && <span className="absolute -top-0.5 -right-0.5 text-[9px] leading-none">💗</span>}
              {predMid    && <span className="absolute -top-0.5 -right-0.5 text-[9px] leading-none">🔮</span>}
              {nextFertile && <span className="absolute -top-0.5 -right-0.5 text-[9px] leading-none">🌱</span>}

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
                {predPeriod && !isPeriod && <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-300" />
          <span className="text-[10px] font-medium text-slate-400">Period</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-200 border border-rose-300 border-dashed" />
          <span className="text-[10px] font-medium text-slate-400">Predicted 🔮</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">💗</span>
          <span className="text-[10px] font-medium text-slate-400">Fertile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">🌱</span>
          <span className="text-[10px] font-medium text-slate-400">Next fertile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-300" />
          <span className="text-[10px] font-medium text-slate-400">Symptoms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-violet-300" />
          <span className="text-[10px] font-medium text-slate-400">Logged</span>
        </div>
      </div>
    </div>
  );
}
