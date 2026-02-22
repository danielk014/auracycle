import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CycleCalendar from "../components/calendar/CycleCalendar";
import { format, isSameDay } from "date-fns";
import { Droplets, Brain, Heart, Pencil } from "lucide-react";

export default function Calendar() {
  const [selectedDay, setSelectedDay] = React.useState(null);

  const { data: logs } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => base44.entities.CycleLog.list("-date", 200),
    initialData: [],
  });

  const selectedLogs = selectedDay
    ? logs.filter((l) => isSameDay(new Date(l.date), selectedDay))
    : [];

  const typeIcons = {
    period: { icon: Droplets, color: "text-rose-500", bg: "bg-rose-50" },
    symptom: { icon: Brain, color: "text-amber-500", bg: "bg-amber-50" },
    mood: { icon: Heart, color: "text-violet-500", bg: "bg-violet-50" },
    note: { icon: Pencil, color: "text-slate-500", bg: "bg-slate-50" },
  };

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-bold text-slate-800 mb-5"
      >
        Calendar
      </motion.h1>

      <CycleCalendar logs={logs} onDayClick={setSelectedDay} />

      {selectedDay && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5"
        >
          <h3 className="text-sm font-semibold text-slate-600 mb-3">
            {format(selectedDay, "EEEE, MMMM d")}
          </h3>
          {selectedLogs.length === 0 ? (
            <p className="text-sm text-slate-400 bg-white rounded-2xl p-4 border border-slate-100">
              No logs for this day.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedLogs.map((log) => {
                const t = typeIcons[log.log_type] || typeIcons.note;
                return (
                  <div key={log.id} className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`${t.bg} w-7 h-7 rounded-lg flex items-center justify-center`}>
                        <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {log.log_type}
                      </span>
                      {log.flow_intensity && (
                        <span className="text-xs bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full font-medium">
                          {log.flow_intensity}
                        </span>
                      )}
                    </div>
                    {log.symptoms?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {log.symptoms.map((s) => (
                          <span key={s} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                            {s.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {log.moods?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {log.moods.map((m) => (
                          <span key={m} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                            {m.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {log.notes && <p className="text-sm text-slate-500 mt-1">{log.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}