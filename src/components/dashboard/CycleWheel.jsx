import React from "react";
import { motion } from "framer-motion";

/**
 * Draws an arc on the SVG ring between two cycle-day positions.
 */
function PhaseArc({ startDay, endDay, cycleLength, radius, strokeWidth, color, opacity = 1 }) {
  const circumference = 2 * Math.PI * radius;
  const startAngle = ((startDay - 1) / cycleLength) * 360 - 90;
  const endAngle = (endDay / cycleLength) * 360 - 90;
  const arcLength = ((endDay - startDay + 1) / cycleLength) * circumference;
  const gap = circumference - arcLength;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const cx = 130, cy = 130;
  const x1 = cx + radius * Math.cos(toRad(startAngle));
  const y1 = cy + radius * Math.sin(toRad(startAngle));

  // Use strokeDasharray trick: draw only the arc segment
  const startOffset = ((startDay - 1) / cycleLength) * circumference;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={`${arcLength} ${gap}`}
      strokeDashoffset={-startOffset}
      strokeLinecap="round"
      opacity={opacity}
      style={{ transform: "rotate(-90deg)", transformOrigin: "130px 130px" }}
    />
  );
}

export default function CycleWheel({
  cycleDay,
  cycleLength = 28,
  periodLength = 5,
  phase,
  prediction = null,
}) {
  const percentage = (cycleDay / cycleLength) * 100;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const phaseColors = {
    period: { stroke: "#E8456B", text: "Period" },
    follicular: { stroke: "#A78BFA", text: "Follicular" },
    ovulation: { stroke: "#34D399", text: "Ovulation" },
    luteal: { stroke: "#F59E0B", text: "Luteal" },
  };
  const currentPhase = phaseColors[phase] || phaseColors.follicular;

  // --- Compute key windows (in cycle-day units) ---
  // Fertile window: ~days 10-16 of cycle
  const fertileStart = Math.max(periodLength + 1, 10);
  const fertileEnd = Math.min(fertileStart + 6, cycleLength - 1);

  // Pre-menstrual / luteal window: last 5 days of cycle
  const pmsStart = cycleLength - 4;
  const pmsEnd = cycleLength;

  // Predicted period range mapped to cycle days (days 1 - periodLength = next period)
  // We show the predicted range as an outer highlight on "day 0 → period" position
  let predictedStart = null;
  let predictedEnd = null;
  if (prediction?.range_start && prediction?.range_end && prediction?.predicted_date) {
    try {
      const today = new Date();
      const rStart = new Date(prediction.range_start);
      const rEnd = new Date(prediction.range_end);
      const daysToRangeStart = Math.round((rStart - today) / 86400000);
      const daysToRangeEnd = Math.round((rEnd - today) / 86400000);
      const daysBeyondCycle = cycleLength - cycleDay;

      // Only show if within current cycle
      if (daysToRangeStart <= daysBeyondCycle + 3) {
        predictedStart = Math.max(1, cycleDay + daysToRangeStart);
        predictedEnd = Math.min(cycleLength, cycleDay + daysToRangeEnd);
        if (predictedStart > cycleLength) { predictedStart = null; predictedEnd = null; }
      }
    } catch (_) {}
  }

  // Outer ring radius for prediction arc
  const outerRadius = 122;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <svg width="270" height="270" viewBox="0 0 260 260">
          {/* Background track */}
          <circle cx="130" cy="130" r={radius} fill="none" stroke="#F3E8FF" strokeWidth="12" />

          {/* Fertile window arc (inner, subtle) */}
          <PhaseArc
            startDay={fertileStart}
            endDay={fertileEnd}
            cycleLength={cycleLength}
            radius={radius}
            strokeWidth={12}
            color="#34D399"
            opacity={0.25}
          />

          {/* PMS / pre-menstrual window arc */}
          <PhaseArc
            startDay={pmsStart}
            endDay={pmsEnd}
            cycleLength={cycleLength}
            radius={radius}
            strokeWidth={12}
            color="#F59E0B"
            opacity={0.25}
          />

          {/* Predicted period range – outer ring */}
          {predictedStart && predictedEnd && (
            <PhaseArc
              startDay={predictedStart}
              endDay={predictedEnd}
              cycleLength={cycleLength}
              radius={outerRadius}
              strokeWidth={5}
              color="#E8456B"
              opacity={0.7}
            />
          )}

          {/* Main progress arc */}
          <motion.circle
            cx="130"
            cy="130"
            r={radius}
            fill="none"
            stroke={currentPhase.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "130px 130px" }}
          />

          {/* Current day dot */}
          <motion.circle
            cx={130 + radius * Math.cos((2 * Math.PI * (cycleDay / cycleLength)) - Math.PI / 2)}
            cy={130 + radius * Math.sin((2 * Math.PI * (cycleDay / cycleLength)) - Math.PI / 2)}
            r="7"
            fill={currentPhase.stroke}
            stroke="white"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <p className="text-5xl font-light text-slate-800">Day {cycleDay}</p>
            <p className="text-sm font-medium mt-1" style={{ color: currentPhase.stroke }}>
              {currentPhase.text} Phase
            </p>
          </motion.div>
        </div>
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center gap-4 mt-1 flex-wrap justify-center"
      >
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 opacity-70" />
          Fertile window
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 opacity-70" />
          Pre-menstrual
        </span>
        {predictedStart && (
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 opacity-80" />
            AI predicted period
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}