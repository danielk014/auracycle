import React from "react";
import { Switch } from "@/components/ui/switch";
import { Bell, Droplets, Brain, Heart, Lightbulb } from "lucide-react";

const REMINDERS = [
  {
    key: "period",
    label: "Log Period",
    description: "Daily reminder to track your flow",
    icon: Droplets,
    color: "text-rose-500",
    bg: "bg-rose-50",
    defaultTime: "08:00",
  },
  {
    key: "symptoms",
    label: "Log Symptoms",
    description: "Evening check-in for how you feel",
    icon: Brain,
    color: "text-amber-500",
    bg: "bg-amber-50",
    defaultTime: "20:00",
  },
  {
    key: "mood",
    label: "Log Mood",
    description: "Nightly mood tracking prompt",
    icon: Heart,
    color: "text-violet-500",
    bg: "bg-violet-50",
    defaultTime: "21:00",
  },
  {
    key: "daily_tip",
    label: "Daily Tip",
    description: "Receive your personalized cycle tip",
    icon: Lightbulb,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    defaultTime: "09:00",
  },
];

export default function RemindersSection({ form, setForm }) {
  const masterEnabled = form.notifications_enabled;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-700">Reminders</h3>
        </div>
        <Switch
          checked={masterEnabled}
          onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })}
        />
      </div>

      {!masterEnabled && (
        <p className="text-xs text-slate-400 text-center py-2">
          Enable notifications to configure reminders
        </p>
      )}

      {masterEnabled && (
        <div className="space-y-3 pt-1">
          {REMINDERS.map(({ key, label, description, icon: Icon, color, bg, defaultTime }) => {
            const enabledKey = `reminder_${key}_enabled`;
            const timeKey = `reminder_${key}_time`;
            const isOn = !!form[enabledKey];
            const time = form[timeKey] || defaultTime;

            return (
              <div
                key={key}
                className={`rounded-xl border transition-all ${isOn ? "border-violet-100 bg-violet-50/30" : "border-slate-100 bg-slate-50/30"}`}
              >
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className={`${bg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400 truncate">{description}</p>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(v) =>
                      setForm({ ...form, [enabledKey]: v, [timeKey]: time })
                    }
                  />
                </div>

                {isOn && (
                  <div className="flex items-center gap-2 px-3 pb-3">
                    <span className="text-xs text-slate-500 flex-1">Remind me at</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setForm({ ...form, [timeKey]: e.target.value })}
                      className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-300"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}