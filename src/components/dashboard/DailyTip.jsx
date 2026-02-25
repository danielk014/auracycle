import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const tips = {
  period: [
    {
      days: [1, 2],
      title: "Heaviest days",
      tip: "A heat pad on your lower belly relaxes uterine muscles and eases cramping. Ibuprofen (taken with food) works better than paracetamol for period pain.",
    },
    {
      days: [3, 4],
      title: "Flow is easing",
      tip: "Replenish iron lost during your period with spinach, lentils, or red meat. Pair them with vitamin C — it doubles iron absorption.",
    },
    {
      days: [5, 6, 7],
      title: "Nearly through it",
      tip: "Light movement like walking or gentle yoga boosts circulation and lifts your mood as your period winds down. You're almost there.",
    },
  ],
  follicular: [
    "Estrogen is rising — your energy and focus are naturally climbing. This is the best phase to start new habits, tackle hard tasks, or push your workouts.",
    "Your skin tends to look its best right now thanks to rising estrogen. Stay hydrated and use SPF to make the most of it.",
    "Social energy is high in the follicular phase. Make plans, have important conversations, and lean into your natural confidence.",
  ],
  ovulation: [
    "You're at peak energy and communication skills. Great day for presentations, difficult conversations, or anything that needs your A-game.",
    "Your fertile window is open. Clear, stretchy cervical mucus (like egg whites) is your body's natural sign. Stay hydrated and fuel well today.",
  ],
  luteal: [
    "Progesterone is rising — bloating and mood shifts are normal. Cutting back on salt and caffeine this week can make a real difference.",
    "Magnesium (dark chocolate, nuts, seeds) reduces cramps and mood swings before your period. Start taking it now if PMS is a pattern for you.",
    "Your body temperature runs slightly higher in the luteal phase. Swap high-intensity cardio for strength training or pilates — you'll feel better for it.",
    "Cravings for carbs and sweets are driven by progesterone — they're real, not a lack of willpower. Complex carbs like oats and sweet potato satisfy without the crash.",
  ],
};

function getPeriodTip(cycleDay) {
  for (const entry of tips.period) {
    if (entry.days.includes(cycleDay)) return { title: entry.title, tip: entry.tip };
  }
  // fallback for longer periods
  return { title: "Period day", tip: tips.period[2].tip };
}

const PHASE_LABELS = {
  period:     { label: "Period Phase",    color: "text-rose-600" },
  follicular: { label: "Follicular Phase", color: "text-emerald-600" },
  ovulation:  { label: "Ovulation Phase",  color: "text-teal-600" },
  luteal:     { label: "Luteal Phase",     color: "text-amber-600" },
};

export default function DailyTip({ phase, cycleDay = 1 }) {
  let title = "";
  let tip = "";

  if (phase === "period") {
    const periodTip = getPeriodTip(cycleDay);
    title = periodTip.title;
    tip = periodTip.tip;
  } else {
    const phaseTips = tips[phase] || tips.follicular;
    const idx = new Date().getDate() % phaseTips.length;
    tip = phaseTips[idx];
    title = PHASE_LABELS[phase]?.label || "Daily Tip";
  }

  const phaseColor = PHASE_LABELS[phase]?.color || "text-violet-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-gradient-to-br from-violet-50 to-rose-50 rounded-2xl p-5 border border-violet-100/50"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-white w-7 h-7 rounded-lg flex items-center justify-center shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-violet-700">Daily Tip</p>
          {title && <p className={`text-[10px] font-semibold uppercase tracking-wide ${phaseColor}`}>{title}</p>}
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
    </motion.div>
  );
}
