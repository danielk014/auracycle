import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save, Check, LogOut, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { getCycleSettings, upsertCycleSettings } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { requestNotificationPermission } from "@/lib/notifications";
import DatePicker from "@/components/ui/DatePicker";

export default function Settings() {
  const { user, profile, logout } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  // Only populate the form once — prevent re-fetch from overwriting unsaved edits
  const initialized = useRef(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: getCycleSettings,
  });

  const [form, setForm] = useState({
    average_cycle_length: 28,
    average_period_length: 5,
    last_period_start: "",
    last_period_end: "",
    notifications_enabled: false,
    reminder_period_before: 2,
    reminder_period_time: "08:00",
    reminder_symptoms_enabled: false,
    reminder_symptoms_time: "20:00",
    reminder_mood_enabled: false,
    reminder_mood_time: "21:00",
  });

  useEffect(() => {
    // Only initialise the form from the DB once — re-fetches must not wipe unsaved edits
    if (settings && !initialized.current) {
      initialized.current = true;
      setForm({
        average_cycle_length:      settings.average_cycle_length      || 28,
        average_period_length:     settings.average_period_length     || 5,
        last_period_start:         settings.last_period_start         || "",
        last_period_end:           settings.last_period_end           || "",
        notifications_enabled:     settings.notifications_enabled     ?? false,
        reminder_period_before:    settings.reminder_period_before    ?? 2,
        reminder_period_time:      settings.reminder_period_time      || "08:00",
        reminder_symptoms_enabled: settings.reminder_symptoms_enabled ?? false,
        reminder_symptoms_time:    settings.reminder_symptoms_time    || "20:00",
        reminder_mood_enabled:     settings.reminder_mood_enabled     ?? false,
        reminder_mood_time:        settings.reminder_mood_time        || "21:00",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertCycleSettings({
        ...form,
        average_cycle_length:   parseInt(form.average_cycle_length,  10),
        average_period_length:  parseInt(form.average_period_length, 10),
        reminder_period_before: parseInt(form.reminder_period_before, 10),
        // Empty strings are not valid dates for PostgreSQL — send null instead
        last_period_start: form.last_period_start || null,
        last_period_end:   form.last_period_end   || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycleSettings"] });
      // Allow the form to reinitialise from the saved data on the NEXT mount
      initialized.current = false;
      setSaved(true);
      toast.success("Settings saved!");
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => {
      console.error("Settings save error:", err);
      toast.error("Failed to save settings.");
    },
  });

  const handleToggleNotifications = async () => {
    if (!form.notifications_enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error("Please allow notifications in your browser settings.");
        return;
      }
    }
    setForm((f) => ({ ...f, notifications_enabled: !f.notifications_enabled }));
  };

  return (
    <div className="pb-28 px-4 pt-10 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        {user && <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Cycle Settings */}
        <div className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-700">Cycle Settings</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Average Cycle Length (days)</Label>
            <Input
              type="number"
              value={form.average_cycle_length}
              onChange={(e) => setForm({ ...form, average_cycle_length: e.target.value })}
              className="rounded-xl border-purple-100"
              min={20} max={45}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Average Period Length (days)</Label>
            <Input
              type="number"
              value={form.average_period_length}
              onChange={(e) => setForm({ ...form, average_period_length: e.target.value })}
              className="rounded-xl border-purple-100"
              min={1} max={10}
            />
          </div>

          <DatePicker
            label="Last Period Start Date"
            value={form.last_period_start}
            onChange={(v) => setForm({ ...form, last_period_start: v })}
            maxDate={new Date()}
            placeholder="Pick start date"
          />

          <div>
            <DatePicker
              label="Last Period End Date"
              value={form.last_period_end}
              onChange={(v) => setForm({ ...form, last_period_end: v })}
              maxDate={new Date()}
              placeholder="Pick end date"
            />
            <p className="text-xs text-slate-400 mt-2">Set this to track how long your period lasted</p>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {form.notifications_enabled
                ? <Bell className="w-4 h-4 text-violet-500" />
                : <BellOff className="w-4 h-4 text-slate-400" />
              }
              <h3 className="text-sm font-bold text-slate-700">Notifications</h3>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
                form.notifications_enabled ? "bg-violet-500" : "bg-slate-200"
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                form.notifications_enabled ? "translate-x-6" : "translate-x-0"
              }`} />
            </button>
          </div>

          {form.notifications_enabled && (
            <div className="space-y-4">
              <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                <p className="text-xs font-semibold text-violet-700 mb-2">Period Reminder</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Days before period</p>
                    <Input
                      type="number"
                      value={form.reminder_period_before}
                      onChange={(e) => setForm({ ...form, reminder_period_before: e.target.value })}
                      className="rounded-xl border-violet-200 h-8 text-sm"
                      min={1} max={7}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Notification time</p>
                    <Input
                      type="time"
                      value={form.reminder_period_time}
                      onChange={(e) => setForm({ ...form, reminder_period_time: e.target.value })}
                      className="rounded-xl border-violet-200 h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Browser notifications only appear when AuraCycle is open. For reliable reminders, check the calendar regularly.
              </p>
            </div>
          )}
        </div>

        {/* Save button */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full rounded-2xl h-12 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-lg shadow-violet-200"
        >
          {saved ? (
            <><Check className="w-4 h-4 mr-2" /> Saved!</>
          ) : saveMutation.isPending ? (
            "Saving..."
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Settings</>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={logout}
          className="w-full rounded-2xl h-12 text-slate-500 border-purple-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </motion.div>
    </div>
  );
}
