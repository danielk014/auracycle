import React, { useState } from "react";
import { motion } from "framer-motion";
import { differenceInDays, format, parseISO, addDays } from "date-fns";
import { Activity } from "lucide-react";

function buildCycles(logs) {
  const periodLogs = logs
    .filter((l) => l.log_type === "period" && l.date)
    .map((l) => ({ ...l, dateObj: parseISO(l.date) }))
    .sort((a, b) => a.dateObj - b.dateObj);

  if (periodLogs.length === 0) return [];

  // Group consecutive period days into cycles
  const cycles = [];
  let current = [periodLogs[0]];

  for (let i = 1; i < periodLogs.length; i++) {
    const prev = periodLogs[i - 1];
    const curr = periodLogs[i];
    const gap = differenceInDays(curr.dateObj, prev.dateObj);
    if (gap <= 2) {
      current.push(curr);
    } else {
      cycles.push(current);
      current = [curr];
    }
  }
  cycles.push(current);

  return cycles.map((group, i) => {
    const start = group[0];
    const end = group[group.length - 1];
    const length = differenceInDays(end.dateObj, start.dateObj) + 1;
    const nextStart = cycles[i + 1]?.[0];
    const cycleLength = nextStart
      ? differenceInDays(nextStart.dateObj, start.dateObj)
      : null;
    return {
      index: i + 1,
      start: start.date,
      end: end.date,
      periodLength: length,
      cycleLength,
      ovulationDay: cycleLength ? format(addDays(start.dateObj, Math.round(cycleLength / 2) - 2), "MMM d") : null,
      avgFlow: group.map((d) => d.flow_intensity).filter(Boolean),
    };
  });
}

const FLOW_COLORS = {
  spotting: "#FDA4AF",
  light: "#FB7185",
  medium: "#F43F5E",
  heavy: "#BE123C",
};

export default function CycleHistoryChart({ logs }) {
  const [hovered, setHovered] = useState(null);
  const cycles = buildCycles(logs);

  if (cycles.length === 0) return null;

  const maxCycleLen = Math.max(...cycles.map((c) => c.cycleLength || c.periodLength + 14), 35);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl p-5 border border-slate-100 mb-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-rose-500" />
        <h3 className="text-sm font-semibold text-slate-700">Cycle History</h3>
      </div>

      <div className="space-y-3">
        {cycles.slice(-8).map((cycle, i) => {
          const periodPct = ((cycle.periodLength / maxCycleLen) * 100).toFixed(1);
          const cyclePct = cycle.cycleLength
            ? ((cycle.cycleLength / maxCycleLen) * 100).toFixed(1)
            : null;
          const ovulationPct = cycle.cycleLength
            ? (((Math.round(cycle.cycleLength / 2) - 2) / maxCycleLen) * 100).toFixed(1)
            : null;

          return (
            <div key={i} className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                  {format(parseISO(cycle.start), "MMM d")}
                </span>
                <div
                  className="flex-1 relative h-6 bg-slate-50 rounded-full overflow-hidden cursor-pointer"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onTouchStart={() => setHovered(hovered === i ? null : i)}
                >
                  {/* Full cycle bar */}
                  {cyclePct && (
                    <div
                      className="absolute left-0 top-0 h-full bg-rose-50 rounded-full"
                      style={{ width: `${cyclePct}%` }}
                    />
                  )}
                  {/* Period bar */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${periodPct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                  />
                  {/* Ovulation dot */}
                  {ovulationPct && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-400 border-2 border-white shadow-sm z-10"
                      style={{ left: `calc(${ovulationPct}% - 6px)` }}
                    />
                  )}
                </div>
                <span className="text-xs text-slate-400 w-10 text-right flex-shrink-0">
                  {cycle.cycleLength ? `${cycle.cycleLength}d` : "—"}
                </span>
              </div>

              {/* Tooltip */}
              {hovered === i && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-16 top-8 z-20 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 shadow-lg min-w-[180px]"
                >
                  <p className="font-semibold mb-1">Cycle {cycle.index}</p>
                  <p>🩸 Period: {format(parseISO(cycle.start), "MMM d")} – {format(parseISO(cycle.end), "MMM d")} ({cycle.periodLength} days)</p>
                  {cycle.cycleLength && <p>📅 Cycle length: {cycle.cycleLength} days</p>}
                  {cycle.ovulationDay && <p>🌸 Est. ovulation: {cycle.ovulationDay}</p>}
                  {cycle.avgFlow.length > 0 && (
                    <p>💧 Flow: {cycle.avgFlow[Math.floor(cycle.avgFlow.length / 2)]}</p>
                  )}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-400 to-rose-500" />
          <span className="text-xs text-slate-400">Period</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-100" />
          <span className="text-xs text-slate-400">Full cycle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-violet-400" />
          <span className="text-xs text-slate-400">Est. ovulation</span>
        </div>
      </div>
    </motion.div>
  );
}