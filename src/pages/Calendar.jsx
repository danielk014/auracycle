import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import CycleCalendar from "@/components/calendar/CycleCalendar";
import { format, isSameDay, differenceInDays, parseISO } from "date-fns";
import { Droplets, Brain, Heart, Pencil, Plus, Moon, Dumbbell, Droplet, Activity, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getCycleLogs, getCycleSettings, deleteCycleLog } from "@/lib/db";
import { buildCycles, computeCycleStats, predictNextPeriod, getFertileWindow } from "@/lib/cycleStats";
import { toast } from "sonner";

const LOG_TYPES = [
  { key: "all", label: "All" },
  { key: "period",  label: "Period",   color: "bg-rose-50 text-rose-600 border-rose-200" },
  { key: "symptom", label: "Symptoms", color: "bg-amber-50 text-amber-600 border-amber-200" },
  { key: "mood",    label: "Mood",     color: "bg-violet-50 text-violet-600 border-violet-200" },
  { key: "note",    label: "Notes",    color: "bg-slate-50 text-slate-600 border-slate-200" },
];

const TYPE_META = {
  period:  { icon: Droplets, color: "text-rose-500",   bg: "bg-rose-50",   border: "border-rose-100",   label: "Period" },
  symptom: { icon: Brain,    color: "text-amber-500",  bg: "bg-amber-50",  border: "border-amber-100",  label: "Symptoms" },
  mood:    { icon: Heart,    color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-100", label: "Mood" },
  note:    { icon: Pencil,   color: "text-slate-500",  bg: "bg-slate-50",  border: "border-slate-100",  label: "Note" },
};

const PHASE_INFO = {
  period:     { label: "Menstrual Phase",  color: "text-rose-600",   bg: "bg-rose-50",   desc: "Your period is here. Rest and stay hydrated." },
  follicular: { label: "Follicular Phase", color: "text-emerald-600",bg: "bg-emerald-50",desc: "Energy rising! Great time for new starts." },
  fertile:    { label: "Fertile Window 💗", color: "text-pink-600",   bg: "bg-pink-50",   desc: "Peak fertility! Your body is primed for conception." },
  luteal:     { label: "Luteal Phase",     color: "text-yellow-700", bg: "bg-yellow-50", desc: "Wind down and prepare for self-care." },
};

function getDayPhase(day, settings) {
  if (!settings?.last_period_start) return null;
  const cycleLength  = settings.average_cycle_length  || 28;
  const periodLength = settings.average_period_length || 5;
  const daysSince = differenceInDays(day, new Date(settings.last_period_start));
  if (daysSince < 0) return null;
  const cycleDay = (daysSince % cycleLength) + 1;
  if (cycleDay <= periodLength)                                       return "period";
  if (cycleDay >= cycleLength - 16 && cycleDay <= cycleLength - 11)  return "fertile";
  if (cycleDay > cycleLength - 11)                                    return "luteal";
  return "follicular";
}

export default function Calendar() {
  const [selectedDay,   setSelectedDay]   = useState(null);
  const [activeFilter,  setActiveFilter]  = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null); // log id to confirm
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => getCycleLogs(200),
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
  });

  // Compute prediction + fertile window from logged data
  const cycles     = buildCycles(logs);
  const cycleStats = computeCycleStats(cycles);
  const prediction = predictNextPeriod(cycles, settings);
  const avgLen     = cycleStats.avg || settings?.average_cycle_length || 28;
  // Only show the "next cycle" fertile window when a prediction exists (it would be in a future month).
  // Without prediction data, getDayPhase already handles the current cycle's fertile window.
  const fertile    = prediction?.predicted_date
    ? getFertileWindow(prediction.predicted_date, avgLen)
    : null;

  const deleteLog = useMutation({
    mutationFn: (id) => deleteCycleLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycleLogs"] });
      queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
      setConfirmDelete(null);
      toast.success("Log deleted");
    },
    onError: () => toast.error("Failed to delete log"),
  });

  // Use parseISO to avoid timezone-off-by-one issues with YYYY-MM-DD strings
  const selectedLogs = selectedDay
    ? logs.filter((l) => isSameDay(parseISO(l.date), selectedDay))
    : [];

  const filteredLogs = selectedLogs.filter((l) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "symptom") return l.symptoms?.length > 0;
    if (activeFilter === "mood")    return l.moods?.length > 0;
    return l.log_type === activeFilter;
  });

  const phase = selectedDay ? getDayPhase(selectedDay, settings) : null;
  const phaseInfo = phase ? PHASE_INFO[phase] : null;

  const now = new Date();
  const thisMonthLogs = logs.filter((l) => {
    const d = parseISO(l.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const periodDays = thisMonthLogs.filter((l) => l.log_type === "period").length;
  const loggedDays = new Set(thisMonthLogs.map((l) => l.date)).size;

  return (
    <div className="pb-28 px-4 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
        <p className="text-sm text-slate-400 mt-0.5">Track your cycle day by day</p>
      </motion.div>

      {/* Monthly mini stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3 mb-4"
      >
        <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-purple-50 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Period Days</p>
          <p className="text-2xl font-bold text-rose-500">{periodDays}</p>
          <p className="text-[10px] text-slate-400">this month</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-purple-50 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Days Logged</p>
          <p className="text-2xl font-bold text-violet-500">{loggedDays}</p>
          <p className="text-[10px] text-slate-400">this month</p>
        </div>
        <Link
          to={selectedDay
            ? `${createPageUrl("LogEntry")}?date=${format(selectedDay, "yyyy-MM-dd")}`
            : createPageUrl("LogEntry")}
          className="flex-shrink-0 w-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-md shadow-violet-200 hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5 text-white" />
          <span className="text-[9px] font-bold text-white/90">Log</span>
        </Link>
      </motion.div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-4"
      >
        <CycleCalendar
          logs={logs}
          settings={settings}
          prediction={prediction}
          fertileWindow={fertile}
          onDayClick={setSelectedDay}
          selectedDay={selectedDay}
        />
      </motion.div>

      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">{format(selectedDay, "EEEE")}</h3>
                <p className="text-sm text-slate-400">{format(selectedDay, "MMMM d, yyyy")}</p>
              </div>
              <Link
                to={`${createPageUrl("LogEntry")}?date=${format(selectedDay, "yyyy-MM-dd")}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:scale-105 transition-transform"
              >
                <Plus className="w-3.5 h-3.5" />
                Log this day
              </Link>
            </div>

            {phaseInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`${phaseInfo.bg} rounded-2xl px-4 py-3 mb-3 border border-white/80`}
              >
                <p className={`text-xs font-bold uppercase tracking-wider ${phaseInfo.color} mb-0.5`}>
                  {phaseInfo.label}
                </p>
                <p className="text-sm text-slate-600">{phaseInfo.desc}</p>
              </motion.div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
              {LOG_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveFilter(t.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeFilter === t.key
                      ? t.color || "bg-violet-100 text-violet-700 border-violet-200"
                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {filteredLogs.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-purple-50 text-center shadow-sm">
                <p className="text-sm text-slate-400">
                  {selectedLogs.length === 0 ? "No data logged for this day." : "No entries match this filter."}
                </p>
                <Link
                  to={`${createPageUrl("LogEntry")}?date=${format(selectedDay, "yyyy-MM-dd")}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-violet-500 font-medium hover:text-violet-600"
                >
                  <Plus className="w-4 h-4" /> Add a log entry
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const t = TYPE_META[log.log_type] || TYPE_META.note;
                  const isConfirming = confirmDelete === log.id;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-2xl p-4 border ${t.border} shadow-sm`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`${t.bg} w-8 h-8 rounded-xl flex items-center justify-center`}>
                          <t.icon className={`w-4 h-4 ${t.color}`} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{t.label}</span>
                        {log.flow_intensity && (
                          <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-semibold border border-rose-100">
                            {log.flow_intensity}
                          </span>
                        )}
                        {log.is_period_end && (
                          <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-semibold border border-pink-100">
                            ended
                          </span>
                        )}
                        {/* Delete button */}
                        <div className="ml-auto flex items-center gap-1.5">
                          {isConfirming ? (
                            <>
                              <button
                                onClick={() => deleteLog.mutate(log.id)}
                                disabled={deleteLog.isPending}
                                className="text-[11px] font-semibold text-white bg-rose-500 px-2.5 py-1 rounded-lg hover:bg-rose-600 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(log.id)}
                              className="p-1.5 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {log.symptoms?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Symptoms</p>
                          <div className="flex flex-wrap gap-1.5">
                            {log.symptoms.map((s) => (
                              <span key={s} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100 font-medium">
                                {s.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.moods?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Mood</p>
                          <div className="flex flex-wrap gap-1.5">
                            {log.moods.map((m) => (
                              <span key={m} className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-100 font-medium">
                                {m.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(log.sleep_hours || log.stress_level || log.exercise_type || log.water_intake) && (
                        <div className="mt-2 pt-2 border-t border-slate-50">
                          <div className="grid grid-cols-2 gap-2">
                            {log.sleep_hours && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                {log.sleep_hours}h sleep
                              </div>
                            )}
                            {log.stress_level && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Activity className="w-3.5 h-3.5 text-orange-400" />
                                Stress {log.stress_level}/5
                              </div>
                            )}
                            {log.water_intake && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Droplet className="w-3.5 h-3.5 text-blue-400" />
                                {log.water_intake} glasses
                              </div>
                            )}
                            {log.exercise_type && log.exercise_type !== "none" && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                                {log.exercise_type.replace(/_/g, " ")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {log.notes && (
                        <p className="text-sm text-slate-500 mt-2 pt-2 border-t border-slate-50 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedDay && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center py-8">
          <p className="text-sm text-slate-400">Tap a day to see your logs</p>
        </motion.div>
      )}
    </div>
  );
}
