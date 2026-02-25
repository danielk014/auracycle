import React from "react";
import { motion } from "framer-motion";

const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "energetic", emoji: "⚡", label: "Energetic" },
  { id: "confident", emoji: "💪", label: "Confident" },
  { id: "grateful", emoji: "🙏", label: "Grateful" },
  { id: "focused", emoji: "🎯", label: "Focused" },
  { id: "anxious", emoji: "😰", label: "Anxious" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "irritable", emoji: "😤", label: "Irritable" },
  { id: "mood_swings", emoji: "🎭", label: "Mood Swings" },
  { id: "sensitive", emoji: "🥺", label: "Sensitive" },
  { id: "overwhelmed", emoji: "🌊", label: "Overwhelmed" },
  { id: "lonely", emoji: "🌧️", label: "Lonely" },
  { id: "frustrated", emoji: "😩", label: "Frustrated" },
  { id: "unmotivated", emoji: "😶", label: "Unmotivated" },
  { id: "foggy", emoji: "🌫️", label: "Brain Fog" },
  { id: "restless", emoji: "🦋", label: "Restless" },
  { id: "tender", emoji: "💜", label: "Tender" },
];

export default function MoodPicker({ selected = [], onChange }) {
  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {MOODS.map((m, i) => (
          <motion.button
            key={m.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => toggle(m.id)}
            className={`flex flex-col items-center py-3 px-2 rounded-2xl border-2 transition-all ${
              selected.includes(m.id)
                ? "border-violet-300 bg-violet-50 shadow-sm"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <span className="text-xl mb-1">{m.emoji}</span>
            <span className="text-xs font-medium text-slate-600 text-center leading-tight">{m.label}</span>
          </motion.button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-slate-400 text-center">Tap to deselect</p>
      )}
    </div>
  );
}