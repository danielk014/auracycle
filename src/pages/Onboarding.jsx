import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { upsertProfile, upsertCycleSettings } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { requestNotificationPermission } from "@/lib/notifications";
import { format, subDays } from "date-fns";
import { Sparkles, ChevronRight, Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/DatePicker";

const STEPS = ["welcome", "period", "reminders", "done"];

export default function Onboarding() {
  const { refreshProfile } = useAuth();
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    last_period_start: format(subDays(new Date(), 14), "yyyy-MM-dd"),
    average_cycle_length: 28,
    average_period_length: 5,
    notifications_enabled: false,
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const finish = async () => {
    setSaving(true);
    try {
      await upsertProfile({
        display_name: form.display_name || "Friend",
        onboarding_completed: true,
      });
      await upsertCycleSettings({
        last_period_start: form.last_period_start,
        average_cycle_length: Number(form.average_cycle_length),
        average_period_length: Number(form.average_period_length),
        notifications_enabled: form.notifications_enabled,
      });
      await refreshProfile();
    } catch (err) {
      console.error("Onboarding save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setForm((f) => ({ ...f, notifications_enabled: granted }));
  };

  const steps = [
    // Step 0: Welcome
    {
      title: "Welcome to AuraCycle! 🌙",
      subtitle: "Your private, smart cycle companion",
      content: (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
            <p className="text-sm text-slate-600 leading-relaxed">
              AuraCycle helps you track your cycle, understand your body, and get personalised AI insights — all completely private to you.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              What should we call you?
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Your first name"
              className="w-full px-4 py-3 bg-slate-50 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
            />
          </div>
        </div>
      ),
      cta: "Get Started",
    },

    // Step 1: Period setup
    {
      title: "Your Cycle",
      subtitle: "Help us understand your rhythm",
      content: (
        <div className="space-y-5">
          <DatePicker
            label="When did your last period start?"
            value={form.last_period_start}
            onChange={(v) => setForm((f) => ({ ...f, last_period_start: v }))}
            maxDate={new Date()}
            placeholder="Pick a date"
          />

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Average cycle length
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={20}
                max={45}
                value={form.average_cycle_length}
                onChange={(e) => setForm((f) => ({ ...f, average_cycle_length: e.target.value }))}
                className="flex-1 accent-violet-500"
              />
              <span className="text-lg font-bold text-violet-600 w-14 text-center bg-violet-50 rounded-xl py-1">
                {form.average_cycle_length}d
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Most cycles are 21–35 days. Average is 28 days.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Average period length
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={10}
                value={form.average_period_length}
                onChange={(e) => setForm((f) => ({ ...f, average_period_length: e.target.value }))}
                className="flex-1 accent-rose-400"
              />
              <span className="text-lg font-bold text-rose-500 w-14 text-center bg-rose-50 rounded-xl py-1">
                {form.average_period_length}d
              </span>
            </div>
          </div>
        </div>
      ),
      cta: "Continue",
    },

    // Step 2: Notifications
    {
      title: "Stay in Sync",
      subtitle: "Get notified before your period",
      content: (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Period Reminders</p>
                <p className="text-xs text-slate-400">Get notified 2 days before your period</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleEnableNotifications}
              variant={form.notifications_enabled ? "default" : "outline"}
              className={`w-full rounded-xl mt-2 ${
                form.notifications_enabled
                  ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0"
                  : "border-amber-200 text-amber-700 hover:bg-amber-50"
              }`}
            >
              {form.notifications_enabled ? (
                <><Check className="w-4 h-4 mr-2" /> Notifications enabled!</>
              ) : (
                "Enable Notifications"
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 text-center">
            You can change this anytime in Settings. Notifications only work while the app is open in your browser.
          </p>
        </div>
      ),
      cta: "Almost done!",
    },

    // Step 3: Done
    {
      title: `You're all set${form.display_name ? `, ${form.display_name}` : ""}! 🎉`,
      subtitle: "Your cycle tracking journey starts now",
      content: (
        <div className="space-y-3">
          {[
            { emoji: "📅", text: "Track your period start & end dates" },
            { emoji: "🔮", text: "AI-powered cycle predictions" },
            { emoji: "💬", text: "Chat with Luna AI for health insights" },
            { emoji: "📊", text: "See patterns in your symptoms & mood" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-purple-50 shadow-sm">
              <span className="text-xl">{item.emoji}</span>
              <p className="text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      ),
      cta: "Start Tracking",
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-5 py-10" style={{ background: "linear-gradient(160deg, #faf5ff 0%, #fff0f8 100%)" }}>
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i <= step ? "bg-gradient-to-r from-violet-500 to-pink-400" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-200">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{current.title}</h2>
          <p className="text-sm text-slate-400">{current.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="flex-1"
        >
          {current.content}
        </motion.div>
      </AnimatePresence>

      {/* CTA */}
      <div className="mt-8">
        <Button
          onClick={step === STEPS.length - 1 ? finish : next}
          disabled={saving}
          className="w-full h-13 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold text-sm shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
          style={{ height: 52 }}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {current.cta}
              {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </>
          )}
        </Button>

        {step > 0 && step < STEPS.length - 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
