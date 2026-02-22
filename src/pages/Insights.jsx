import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Droplets, Brain, Heart } from "lucide-react";

export default function Insights() {
  const { data: logs } = useQuery({
    queryKey: ["cycleLogs"],
    queryFn: () => base44.entities.CycleLog.list("-date", 200),
    initialData: [],
  });

  // Symptom frequency
  const symptomFreq = {};
  logs.forEach((l) => {
    l.symptoms?.forEach((s) => {
      symptomFreq[s] = (symptomFreq[s] || 0) + 1;
    });
  });
  const symptomData = Object.entries(symptomFreq)
    .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Mood frequency
  const moodFreq = {};
  logs.forEach((l) => {
    l.moods?.forEach((m) => {
      moodFreq[m] = (moodFreq[m] || 0) + 1;
    });
  });
  const moodData = Object.entries(moodFreq)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#34D399", "#3B82F6", "#EF4444"];

  // Flow distribution
  const flowDist = { spotting: 0, light: 0, medium: 0, heavy: 0 };
  logs.filter((l) => l.flow_intensity).forEach((l) => {
    flowDist[l.flow_intensity] = (flowDist[l.flow_intensity] || 0) + 1;
  });
  const flowData = Object.entries(flowDist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const totalLogs = logs.length;
  const periodDays = logs.filter((l) => l.log_type === "period").length;

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-bold text-slate-800 mb-5"
      >
        Insights
      </motion.h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: TrendingUp, label: "Total Logs", value: totalLogs, bg: "bg-violet-50", color: "text-violet-500" },
          { icon: Droplets, label: "Period Days", value: periodDays, bg: "bg-rose-50", color: "text-rose-500" },
          { icon: Brain, label: "Symptoms", value: Object.keys(symptomFreq).length, bg: "bg-amber-50", color: "text-amber-500" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-4 border border-slate-100 text-center"
          >
            <div className={`${card.bg} w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-400">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Symptom Chart */}
      {symptomData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 mb-5"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Symptoms</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={symptomData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: "#64748B" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#EC4899" radius={[0, 8, 8, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Mood Chart */}
      {moodData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 mb-5"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Mood Distribution</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={moodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {moodData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {moodData.map((m, i) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-slate-500 capitalize">{m.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Flow Distribution */}
      {flowData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-5 border border-slate-100"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Flow Distribution</h3>
          <div className="space-y-3">
            {flowData.map((f) => {
              const maxVal = Math.max(...flowData.map((d) => d.value));
              const pct = (f.value / maxVal) * 100;
              return (
                <div key={f.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16 capitalize">{f.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-rose-300 to-rose-500 rounded-full"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 w-6 text-right">{f.value}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {totalLogs === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-600 mb-1">No data yet</h3>
          <p className="text-sm text-slate-400">Start logging to see your insights here.</p>
        </motion.div>
      )}
    </div>
  );
}