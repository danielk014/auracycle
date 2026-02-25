import React from "react";
import { motion } from "framer-motion";
import { Droplets } from "lucide-react";

const FLOWS = [
  { id: "spotting", label: "Spotting", drops: 1, color: "text-rose-300" },
  { id: "light", label: "Light", drops: 2, color: "text-rose-400" },
  { id: "medium", label: "Medium", drops: 3, color: "text-rose-500" },
  { id: "heavy", label: "Heavy", drops: 4, color: "text-rose-600" },
];

export default function FlowPicker({ selected, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FLOWS.map((f, i) => (
        <motion.button
          key={f.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onChange(selected === f.id ? null : f.id)}
          className={`flex flex-col items-center py-4 rounded-2xl border-2 transition-all ${
            selected === f.id
              ? "border-rose-300 bg-rose-50 shadow-sm"
              : "border-slate-100 bg-white hover:border-slate-200"
          }`}
        >
          <div className="flex gap-0.5 mb-2">
            {Array.from({ length: f.drops }).map((_, j) => (
              <Droplets key={j} className={`w-3.5 h-3.5 ${selected === f.id ? f.color : "text-slate-300"}`} />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-600">{f.label}</span>
        </motion.button>
      ))}
    </div>
  );
}