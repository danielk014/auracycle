import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, Check, ChevronRight, Droplets, Heart, Brain, Pencil, Dumbbell, Moon, GlassWater } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FlowPicker from "@/components/log/FlowPicker";
import SymptomPicker from "@/components/log/SymptomPicker";
import MoodPicker from "@/components/log/MoodPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const STEPS = ["flow", "symptoms", "mood", "lifestyle", "notes"];

export default function LogEntry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [date] = useState(new Date());
  const [data, setData] = useState({
    flow_intensity: null,
    symptoms: [],
    moods: [],
    notes: "",
    sleep_hours: "",
    water_intake: "",
    exercise: false,
  });

  const { data: settings } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: async () => {
      const list = await base44.entities.CycleSettings.list();
      return list[0] || null;
    },
  });

  const createLog = useMutation({
    mutationFn: async () => {
      const logs = [];
      if (data.flow_intensity) {
        logs.push({
          date: format(date, "yyyy-MM-dd"),
          log_type: "period",
          flow_intensity: data.flow_intensity,
          symptoms: data.symptoms,
          moods: data.moods,
          notes: data.notes,
          sleep_hours: data.sleep_hours ? parseFloat(data.sleep_hours) : undefined,
          water_intake: data.water_intake ? parseInt(data.water_intake) : undefined,
          exercise: data.exercise,
        });

        // Update last_period_start in settings if this is a period log
        if (settings) {
          await base44.entities.CycleSettings.update(settings.id, {
            last_period_start: format(date, "yyyy-MM-dd"),
          });
        } else {
          await base44.entities.CycleSettings.create({
            last_period_start: format(date, "yyyy-MM-dd"),
            average_cycle_length: 28,
            average_period_length: 5,
          });
        }
      } else {
        logs.push({
          date: format(date, "yyyy-MM-dd"),
          log_type: data.symptoms.length > 0 ? "symptom" : data.moods.length > 0 ? "mood" : "note",
          symptoms: data.symptoms,
          moods: data.moods,
          notes: data.notes,
          sleep_hours: data.sleep_hours ? parseFloat(data.sleep_hours) : undefined,
          water_intake: data.water_intake ? parseInt(data.water_intake) : undefined,
          exercise: data.exercise,
        });
      }

      for (const log of logs) {
        await base44.entities.CycleLog.create(log);
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
        <FlowPicker
          selected={data.flow_intensity}
          onChange={(v) => setData({ ...data, flow_intensity: v })}
        />
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
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-indigo-50 w-9 h-9 rounded-xl flex items-center justify-center">
                <Moon className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Sleep (hours)</span>
            </div>
            <Input
              type="number"
              placeholder="e.g. 7.5"
              value={data.sleep_hours}
              onChange={(e) => setData({ ...data, sleep_hours: e.target.value })}
              className="rounded-xl border-slate-200"
            />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
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
              className="rounded-xl border-slate-200"
            />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 w-9 h-9 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">Exercised today?</span>
            </div>
            <Switch
              checked={data.exercise}
              onCheckedChange={(v) => setData({ ...data, exercise: v })}
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
          className="min-h-[150px] rounded-2xl border-slate-200 resize-none"
        />
      ),
    },
  };

  const current = stepContent[STEPS[step]];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 pt-4 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link to={createPageUrl("Home")} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <p className="text-sm font-medium text-slate-500">
          {format(date, "EEEE, MMMM d")}
        </p>
        <div className="w-9" />
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? "bg-rose-400" : "bg-slate-200"
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
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <current.icon className={`w-5 h-5 ${current.color}`} />
            <h2 className="text-lg font-semibold text-slate-800">{current.title}</h2>
          </div>
          {current.content}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 rounded-xl h-12"
          >
            Back
          </Button>
        )}
        {isLast ? (
          <Button
            onClick={() => createLog.mutate()}
            disabled={createLog.isPending}
            className="flex-1 rounded-xl h-12 bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white"
          >
            {createLog.isPending ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>⏳</motion.div>
            ) : (
              <><Check className="w-4 h-4 mr-2" /> Save Log</>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setStep(step + 1)}
            className="flex-1 rounded-xl h-12 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}