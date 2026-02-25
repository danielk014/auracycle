import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
import { ArrowLeft, Check, ChevronRight, Droplets, Heart, Brain, Pencil, Dumbbell, Moon, GlassWater, Zap } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FlowPicker from "@/components/log/FlowPicker";
import SymptomPicker from "@/components/log/SymptomPicker";
import MoodPicker from "@/components/log/MoodPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getCycleSettings, createCycleLog, upsertCycleSettings } from "@/lib/db";

const STEPS = ["flow", "symptoms", "mood", "lifestyle", "notes"];

export default function LogEntry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const dateParam = searchParams.get("date");
  const [logDate, setLogDate] = useState(
    dateParam ? new Date(dateParam + "T12:00:00") : new Date()
  );

  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    period_day_type: "mid",
    flow_intensity: null,
    is_period_end: false,
    symptoms: [],
    moods: [],
    notes: "",
    sleep_hours: "",
    sleep_quality: null,
    water_intake: "",
    exercise: false,
    exercise_type: "none",
    stress_level: null,
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
  });

  const createLog = useMutation({
    mutationFn: async () => {
      const dateStr = format(logDate, "yyyy-MM-dd");
      const shared = {
        date: dateStr,
        symptoms:      data.symptoms,
        moods:         data.moods,
        notes:         data.notes || null,
        sleep_hours:   data.sleep_hours   ? parseFloat(data.sleep_hours)  : null,
        sleep_quality: data.sleep_quality || null,
        water_intake:  data.water_intake  ? parseInt(data.water_intake)   : null,
        exercise:      data.exercise,
        exercise_type: data.exercise_type !== "none" ? data.exercise_type : null,
        stress_level:  data.stress_level  || null,
      };

      const isFirstDay = data.period_day_type === "first";
      const isLastDay  = data.period_day_type === "last";
      const isPeriodLog = !!(data.flow_intensity) || isFirstDay || isLastDay;

      if (isPeriodLog) {
        const flow = data.flow_intensity || "medium";

        // Always create the main log for the selected date
        await createCycleLog({
          ...shared,
          log_type:       "period",
          flow_intensity: flow,
          is_period_end:  isLastDay,
        });

        if (isFirstDay) {
          // Auto-fill the next (defaultPeriodLen - 1) days with basic period logs
          const defaultLen = settings?.average_period_length || 5;
          for (let i = 1; i < defaultLen; i++) {
            try {
              await createCycleLog({
                date:           format(addDays(logDate, i), "yyyy-MM-dd"),
                log_type:       "period",
                flow_intensity: i >= defaultLen - 1 ? "light" : "medium",
                symptoms: [], moods: [],
              });
            } catch { /* skip if already exists */ }
          }
          // First day always updates the period start
          await upsertCycleSettings({ last_period_start: dateStr });

        } else if (isLastDay) {
          // Fill in all missing days between last_period_start and this date
          const startStr = settings?.last_period_start;
          if (startStr && startStr < dateStr) {
            let d = addDays(parseISO(startStr), 1);
            let guard = 0;
            while (format(d, "yyyy-MM-dd") < dateStr && guard++ < 30) {
              try {
                await createCycleLog({
                  date: format(d, "yyyy-MM-dd"),
                  log_type: "period",
                  flow_intensity: "medium",
                  symptoms: [], moods: [],
                });
              } catch { /* skip duplicates */ }
              d = addDays(d, 1);
            }
          }
          await upsertCycleSettings({ last_period_end: dateStr });

        } else {
          // Regular mid-period day: smart last_period_start update
          const currentStart = settings?.last_period_start;
          const cycleLen = settings?.average_cycle_length || 28;
          const daysFromStart = currentStart
            ? differenceInDays(logDate, new Date(currentStart))
            : -1;
          const shouldUpdateStart =
            !currentStart || daysFromStart < 0 || daysFromStart > cycleLen * 0.5;
          if (shouldUpdateStart) {
            await upsertCycleSettings({ last_period_start: dateStr });
          }
        }

      } else {
        const log_type =
          data.symptoms.length > 0 ? "symptom"
          : data.moods.length > 0  ? "mood"
          : "note";
        await createCycleLog({ ...shared, log_type });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
      queryClient.invalidateQueries({ queryKey: ["cycleSettings"] });
      queryClient.invalidateQueries({ queryKey: ["cycleLogs"] });
      navigate(createPageUrl("Home"));
    },
  });

  const stepContent = {
    flow: {
      title: "Period Flow",
      icon: Droplets,
      color: "text-rose-500",
      content: (
        <div className="space-y-4">
          {/* Period day type */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "first", emoji: "🌸", label: "First Day",  desc: "Start of period" },
              { id: "mid",   emoji: "🩸", label: "Period Day", desc: "Ongoing" },
              { id: "last",  emoji: "✨", label: "Last Day",   desc: "End of period" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setData({ ...data, period_day_type: t.id })}
                className={`flex flex-col items-center py-3 rounded-2xl border-2 text-xs font-semibold transition-all ${
                  data.period_day_type === t.id
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-100 text-slate-500 hover:border-slate-200 bg-white"
                }`}
              >
                <span className="text-xl mb-1">{t.emoji}</span>
                <span className="font-bold">{t.label}</span>
                <span className="text-[10px] font-normal text-slate-400 mt-0.5">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* Auto-fill notice */}
          {data.period_day_type === "first" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-xs text-rose-600 flex items-start gap-2"
            >
              <span>🌸</span>
              <span>We'll automatically fill in the next {(settings?.average_period_length || 5) - 1} days as period days for you.</span>
            </motion.div>
          )}
          {data.period_day_type === "last" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-xs text-rose-600 flex items-start gap-2"
            >
              <span>✨</span>
              <span>
                {settings?.last_period_start
                  ? `We'll fill in all days from your period start to today.`
                  : "Log this as your last period day."}
              </span>
            </motion.div>
          )}

          <FlowPicker
            selected={data.flow_intensity}
            onChange={(v) => setData({ ...data, flow_intensity: v })}
          />
        </div>
      ),
    },
    symptoms: {
      title: "Symptoms",
      icon: Brain,
      color: "text-amber-500",
      content: (
        <SymptomPicker
          selected={data.symptoms}
          onChange={(v) => setData({ ...data, symptoms: v })}
        />
      ),
    },
    mood: {
      title: "Mood",
      icon: Heart,
      color: "text-violet-500",
      content: (
        <MoodPicker
          selected={data.moods}
          onChange={(v) => setData({ ...data, moods: v })}
        />
      ),
    },
    lifestyle: {
      title: "Lifestyle",
      icon: Dumbbell,
      color: "text-emerald-500",
      content: (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-purple-50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-indigo-50 w-9 h-9 rounded-xl flex items-center justify-center">
                <Moon className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Sleep</span>
            </div>
            <Input
              type="number"
              placeholder="Hours (e.g. 7.5)"
              value={data.sleep_hours}
              onChange={(e) => setData({ ...data, sleep_hours: e.target.value })}
              className="rounded-xl border-purple-100 mb-3"
            />
            <p className="text-xs text-slate-400 mb-2">Sleep quality</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setData({ ...data, sleep_quality: v })}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    data.sleep_quality === v
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-slate-100 text-slate-400 hover:border-slate-200"
                  }`}
                >
                  {v === 1 ? "😴" : v === 2 ? "😕" : v === 3 ? "😐" : v === 4 ? "🙂" : "😄"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-purple-50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-emerald-50 w-9 h-9 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Exercise</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "none",     label: "None",     emoji: "🛋️" },
                { id: "light",    label: "Light",    emoji: "🚶" },
                { id: "moderate", label: "Moderate", emoji: "🏃" },
                { id: "intense",  label: "Intense",  emoji: "🏋️" },
              ].map((e) => (
                <button
                  key={e.id}
                  onClick={() => setData({ ...data, exercise_type: e.id, exercise: e.id !== "none" })}
                  className={`flex flex-col items-center py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                    data.exercise_type === e.id
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 text-slate-500 hover:border-slate-200"
                  }`}
                >
                  <span className="text-lg mb-0.5">{e.emoji}</span>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-purple-50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-rose-50 w-9 h-9 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Stress level</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setData({ ...data, stress_level: v })}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    data.stress_level === v
                      ? v <= 2
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : v === 3
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-slate-100 text-slate-400 hover:border-slate-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-300 mt-1 px-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-purple-50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-50 w-9 h-9 rounded-xl flex items-center justify-center">
                <GlassWater className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Water (glasses)</span>
            </div>
            <Input
              type="number"
              placeholder="e.g. 8"
              value={data.water_intake}
              onChange={(e) => setData({ ...data, water_intake: e.target.value })}
              className="rounded-xl border-purple-100"
            />
          </div>
        </div>
      ),
    },
    notes: {
      title: "Notes",
      icon: Pencil,
      color: "text-slate-500",
      content: (
        <Textarea
          placeholder="Anything else you'd like to note..."
          value={data.notes}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
          className="min-h-[150px] rounded-2xl border-purple-100 resize-none"
        />
      ),
    },
  };

  const current = stepContent[STEPS[step]];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen px-4 pt-10 pb-8 max-w-lg mx-auto" style={{ background: "linear-gradient(160deg, #faf5ff 0%, #fff0f8 100%)" }}>
      <div className="flex items-center justify-between mb-6">
        <Link to={createPageUrl("Home")} className="p-2 -ml-2 rounded-xl hover:bg-purple-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        {/* Tappable date — shows native date picker on tap */}
        <div className="relative flex items-center gap-1 cursor-pointer">
          <p className="text-sm font-semibold text-slate-600">
            {format(logDate, "EEEE, MMMM d")}
          </p>
          <span className="text-[9px] text-violet-400 font-normal">tap to change</span>
          <input
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            value={format(logDate, "yyyy-MM-dd")}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => {
              if (e.target.value) setLogDate(new Date(e.target.value + "T12:00:00"));
            }}
          />
        </div>
        <div className="w-9" />
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? "bg-gradient-to-r from-violet-500 to-pink-400" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <current.icon className={`w-5 h-5 ${current.color}`} />
            <h2 className="text-lg font-bold text-slate-800">{current.title}</h2>
          </div>
          {current.content}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 rounded-2xl h-12 border-purple-100"
          >
            Back
          </Button>
        )}
        {isLast ? (
          <Button
            onClick={() => createLog.mutate()}
            disabled={createLog.isPending}
            className="flex-1 rounded-2xl h-12 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-lg shadow-violet-200"
          >
            {createLog.isPending ? (
              "Saving..."
            ) : (
              <><Check className="w-4 h-4 mr-2" /> Save Log</>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setStep(step + 1)}
            className="flex-1 rounded-2xl h-12 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-lg shadow-violet-200"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
