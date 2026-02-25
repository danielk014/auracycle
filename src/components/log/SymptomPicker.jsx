import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SYMPTOMS = [
  { id: "cramps", emoji: "🤕", label: "Cramps" },
  { id: "headache", emoji: "🤯", label: "Headache" },
  { id: "bloating", emoji: "🎈", label: "Bloating" },
  { id: "fatigue", emoji: "😴", label: "Fatigue" },
  { id: "backache", emoji: "💆", label: "Backache" },
  { id: "nausea", emoji: "🤢", label: "Nausea" },
  { id: "breast_tenderness", emoji: "💗", label: "Breast Tender." },
  { id: "acne", emoji: "😣", label: "Acne" },
  { id: "cravings", emoji: "🍫", label: "Cravings" },
  { id: "insomnia", emoji: "🌙", label: "Insomnia" },
  { id: "hot_flashes", emoji: "🔥", label: "Hot Flashes" },
  { id: "dizziness", emoji: "💫", label: "Dizziness" },
  { id: "joint_pain", emoji: "🦴", label: "Joint Pain" },
  { id: "digestive", emoji: "🫃", label: "Digestive" },
  { id: "migraine", emoji: "⚡", label: "Migraine" },
];

const SEVERITY_LABELS = ["Mild", "Moderate", "Severe"];

// Stored as "id:severity" e.g. "cramps:2"
function parseSymptom(s) {
  const [id, sev] = s.split(":");
  return { id, severity: sev ? parseInt(sev) : 1 };
}

export default function SymptomPicker({ selected = [], onChange }) {
  const [severityTarget, setSeverityTarget] = useState(null);

  const selectedMap = {};
  selected.forEach((s) => {
    const { id, severity } = parseSymptom(s);
    selectedMap[id] = severity;
  });

  const toggle = (id) => {
    if (selectedMap[id] !== undefined) {
      // deselect
      onChange(selected.filter((s) => !s.startsWith(id + ":")));
      if (severityTarget === id) setSeverityTarget(null);
    } else {
      onChange([...selected, `${id}:1`]);
      setSeverityTarget(id);
    }
  };

  const setSeverity = (id, sev) => {
    onChange(selected.map((s) => s.startsWith(id + ":") ? `${id}:${sev}` : s));
    setSeverityTarget(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {SYMPTOMS.map((s, i) => {
          const isSelected = selectedMap[s.id] !== undefined;
          const severity = selectedMap[s.id];
          const severityColor = severity === 1 ? "border-amber-200 bg-amber-50" : severity === 2 ? "border-orange-300 bg-orange-50" : "border-rose-400 bg-rose-50";

          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => toggle(s.id)}
              className={`flex flex-col items-center py-3 px-2 rounded-2xl border-2 transition-all relative ${
                isSelected ? severityColor + " shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"
              }`}
            >
              <span className="text-xl mb-1">{s.emoji}</span>
              <span className="text-xs font-medium text-slate-600 text-center leading-tight">{s.label}</span>
              {isSelected && (
                <span className="absolute top-1 right-1.5 text-[9px] font-bold text-slate-500">
                  {severity === 1 ? "mild" : severity === 2 ? "mod" : "sev"}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Severity picker for last-selected symptom */}
      <AnimatePresence>
        {severityTarget && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              How severe is your {SYMPTOMS.find((s) => s.id === severityTarget)?.label}?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITY_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setSeverity(severityTarget, i + 1)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    selectedMap[severityTarget] === i + 1
                      ? i === 0 ? "border-amber-300 bg-amber-50 text-amber-700"
                        : i === 1 ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-slate-100 text-slate-500 hover:border-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selected.length > 0 && (
        <p className="text-xs text-slate-400 text-center">Tap a symptom again to deselect</p>
      )}
    </div>
  );
}