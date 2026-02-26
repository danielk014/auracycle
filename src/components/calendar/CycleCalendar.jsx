import React, { useState, useRef } from "react";
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
  addDays,
  isSameDay,
  isToday,
  differenceInDays,
  parseISO,
  isWithinInterval,
} from "date-fns";

function getDayPhase(day, settings) {
  if (!settings?.last_period_start) return null;
  const cycleLength  = settings.average_cycle_length  || 28;
  const periodLength = settings.average_period_length || 5;
  let daysSince = differenceInDays(day, parseISO(settings.last_period_start));
  // For days before the last period, extrapolate the previous cycle's phases
  if (daysSince < 0) {
    daysSince = ((daysSince % cycleLength) + cycleLength) % cycleLength;
  } else if (daysSince >= cycleLength) {
    // Beyond the current cycle — let the prediction system (predPeriod/predMid) handle these
    return null;
  }
  const cycleDay = daysSince + 1;
  if (cycleDay <= periodLength)                                       return "period";
  if (cycleDay >= cycleLength - 16 && cycleDay <= cycleLength - 11)  return "fertile";
  if (cycleDay > cycleLength - 11)                                    return "luteal";
  return "follicular";
}

function isPredictedPeriodDay(day, prediction) {
  if (!prediction?.range_start || !prediction?.range_end) return false;
  try {
    return isWithinInterval(day, {
      start: parseISO(prediction.range_start),
      end:   parseISO(prediction.range_end),
    });
  } catch { return false; }
}

function isPredictedMidDay(day, prediction) {
  if (!prediction?.predicted_date) return false;
  try { return isSameDay(day, parseISO(prediction.predicted_date)); }
  catch { return false; }
}

// Days after the predicted start up to the expected period duration
function isPredictedPeriodBodyDay(day, prediction, periodLength = 5) {
  if (!prediction?.predicted_date) return false;
  try {
    const start = addDays(parseISO(prediction.predicted_date), 1);
    const end   = addDays(parseISO(prediction.predicted_date), periodLength - 1);
    if (end < start) return false;
    return isWithinInterval(day, { start, end });
  } catch { return false; }
}

function isNextFertileDay(day, fertileWindow) {
  if (!fertileWindow?.start || !fertileWindow?.end) return false;
  try {
    return isWithinInterval(day, { start: fertileWindow.start, end: fertileWindow.end });
  } catch { return false; }
}

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const SWIPE_THRESHOLD = 50; // px

export default function CycleCalendar({
  logs = [],
  settings,
  prediction,
  fertileWindow,
  onDayClick,
  selectedDay,
  periodLength = 5,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const monthStart   = startOfMonth(currentMonth);
  const monthEnd     = endOfMonth(currentMonth);
  const days         = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const getLogsForDay = (day) => logs.filter((l) => isSameDay(parseISO(l.date), day));

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only treat as swipe if horizontal movement dominates and exceeds threshold
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) setCurrentMonth((m) => addMonths(m, 1));  // swipe left → next month
      else        setCurrentMonth((m) => subMonths(m, 1));  // swipe right → prev month
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="bg-white rounded-3xl p-4 shadow-sm border border-purple-50 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
        {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}

        {days.map((day) => {
          const dayLogs    = getLogsForDay(day);
          const isPeriod   = dayLogs.some((l) => l.log_type === "period");
          const hasSymptom = dayLogs.some((l) => l.symptoms?.length > 0);
          const hasMood    = dayLogs.some((l) => l.moods?.length > 0);
          const today      = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const phase      = getDayPhase(day, settings);

          const predMid    = !isPeriod && isPredictedMidDay(day, prediction);
          const predPeriod = !isPeriod && !predMid && isPredictedPeriodDay(day, prediction);
          // Body days = predicted start+1 through predicted start+(periodLength-1)
          // Only show if not already covered by the confidence range
          const predBody   = !isPeriod && !predMid && !predPeriod && isPredictedPeriodBodyDay(day, prediction, periodLength);
          const nextFertile= !isPeriod && !predPeriod && !predMid && !predBody && isNextFertileDay(day, fertileWindow);
          const isFertile  = !isPeriod && !predPeriod && !predMid && !predBody && !nextFertile && phase === "fertile";

          // Background — real data wins over predictions
          let bg     = "";
          let text   = "text-slate-600";
          let border = "";

          if (isPeriod) {
            bg   = "bg-rose-100";
            text = "text-rose-700 font-bold";
          } else if (predMid) {
            bg   = "bg-rose-100";
            text = "text-rose-700 font-semibold";
            border = "ring-1 ring-rose-300 ring-inset";
          } else if (predPeriod) {
            bg     = "bg-rose-50";
            text   = "text-rose-500";
            border = "border-2 border-dashed border-rose-300";
          } else if (predBody) {
            bg     = "bg-rose-50/60";
            text   = "text-rose-400";
            border = "border border-dashed border-rose-200";
          } else if (nextFertile) {
            bg   = "bg-teal-50";
            text = "text-teal-700";
          } else if (isFertile) {
            bg   = "bg-teal-50";
            text = "text-teal-700";
          } else if (phase === "luteal") {
            bg   = "bg-violet-50";
            text = "text-violet-700";
          } else if (phase === "follicular") {
            bg   = "bg-emerald-50/50";
            text = "text-emerald-700";
          }

          return (
            <motion.button
              key={day.toISOString()}
              whileTap={{ scale: 0.88 }}
              onClick={() => onDayClick?.(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl text-xs transition-all gap-0
                ${bg} ${text} ${border}
                ${isSelected ? "ring-2 ring-violet-500 ring-offset-1 shadow-sm" : ""}
                ${today && !isSelected ? "ring-2 ring-violet-400" : ""}
                ${!bg ? "hover:bg-slate-50" : ""}
              `}
            >
              {/* Date number */}
              <span className={`leading-none text-[13px] ${today ? "text-violet-600 font-bold" : ""}`}>
                {format(day, "d")}
              </span>

              {/* Indicator dots — phase markers + logged data */}
              <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
                {/* Phase dots: fertile=green, luteal=purple */}
                {(isFertile || nextFertile) && !isPeriod && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
                {phase === "luteal" && !isPeriod && (
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
                {/* Logged data dots */}
                {isPeriod   && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                {hasSymptom && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                {hasMood    && <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-slate-50">
        {[
          { dot: "bg-rose-400",    label: "Period" },
          { dot: "bg-emerald-300", label: "Follicular" },
          { dot: "bg-teal-300",    label: "Fertile" },
          { dot: "bg-rose-300",    label: "Predicted", dashed: true },
          { dot: "bg-violet-300",  label: "Luteal" },
          { dot: "bg-amber-300",   label: "Symptoms" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${item.dot} ${item.dashed ? "ring-1 ring-rose-400 ring-offset-[1.5px]" : ""}`} />
            <span className="text-[10px] font-medium text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
