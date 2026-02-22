import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Save, Check, LogOut } from "lucide-react";
import { toast } from "sonner";
import RemindersSection from "@/components/settings/RemindersSection";

export default function Settings() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["cycleSettings"],
    queryFn: async () => {
      const list = await base44.entities.CycleSettings.list();
      return list[0] || null;
    },
  });

  const [form, setForm] = useState({
    average_cycle_length: 28,
    average_period_length: 5,
    last_period_start: "",
    notifications_enabled: true,
    birth_year: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        average_cycle_length: settings.average_cycle_length || 28,
        average_period_length: settings.average_period_length || 5,
        last_period_start: settings.last_period_start || "",
        notifications_enabled: settings.notifications_enabled !== false,
        birth_year: settings.birth_year || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        average_cycle_length: parseInt(form.average_cycle_length),
        average_period_length: parseInt(form.average_period_length),
        birth_year: form.birth_year ? parseInt(form.birth_year) : undefined,
      };

      if (settings) {
        await base44.entities.CycleSettings.update(settings.id, data);
      } else {
        await base44.entities.CycleSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycleSettings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-bold text-slate-800 mb-6"
      >
        Settings
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-700">Cycle Settings</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Average Cycle Length (days)</Label>
            <Input
              type="number"
              value={form.average_cycle_length}
              onChange={(e) => setForm({ ...form, average_cycle_length: e.target.value })}
              className="rounded-xl"
              min={20}
              max={45}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Average Period Length (days)</Label>
            <Input
              type="number"
              value={form.average_period_length}
              onChange={(e) => setForm({ ...form, average_period_length: e.target.value })}
              className="rounded-xl"
              min={1}
              max={10}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Last Period Start Date</Label>
            <Input
              type="date"
              value={form.last_period_start}
              onChange={(e) => setForm({ ...form, last_period_start: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Birth Year</Label>
            <Input
              type="number"
              value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              className="rounded-xl"
              placeholder="e.g. 1995"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label className="text-sm text-slate-600">Notifications</Label>
            <Switch
              checked={form.notifications_enabled}
              onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })}
            />
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full rounded-xl h-12 bg-gradient-to-r from-violet-500 to-rose-500 hover:from-violet-600 hover:to-rose-600 text-white"
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
          onClick={handleLogout}
          className="w-full rounded-xl h-12 text-slate-500 border-slate-200"
        >
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </motion.div>
    </div>
  );
}