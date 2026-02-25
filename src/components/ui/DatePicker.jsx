import React, { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  maxDate,
  minDate,
  label,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedDate = (() => {
    if (!value) return undefined;
    const d = typeof value === "string" ? parseISO(value) : value;
    return isValid(d) ? d : undefined;
  })();

  const handleSelect = (date) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          {label}
        </p>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-purple-100 rounded-2xl text-sm hover:border-violet-300 hover:bg-violet-50/30 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
      >
        <CalendarDays className="w-4 h-4 text-violet-400 flex-shrink-0" />
        <span className={`flex-1 text-left ${selectedDate ? "font-semibold text-slate-700" : "text-slate-400"}`}>
          {selectedDate ? format(selectedDate, "MMMM d, yyyy") : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Calendar popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-2 bg-white rounded-3xl shadow-2xl shadow-violet-100 border border-purple-50 p-4"
            style={{ top: "100%" }}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              toDate={maxDate}
              fromDate={minDate}
              showOutsideDays={false}
              classNames={{
                root: "w-full",
                months: "w-full",
                month: "w-full",
                caption: "flex justify-between items-center mb-3",
                caption_label: "text-sm font-bold text-slate-800 capitalize",
                nav: "flex gap-1",
                nav_button:
                  "w-8 h-8 rounded-xl hover:bg-purple-50 flex items-center justify-center text-slate-400 hover:text-violet-600 transition-all",
                nav_button_previous: "",
                nav_button_next: "",
                table: "w-full border-collapse",
                head_row: "flex w-full justify-between mb-1",
                head_cell:
                  "text-[10px] font-bold text-slate-400 uppercase w-9 text-center tracking-wide",
                row: "flex w-full justify-between mt-1",
                cell: "w-9 h-9 text-center p-0",
                day: "w-9 h-9 rounded-2xl text-sm font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition-all flex items-center justify-center mx-auto",
                day_selected:
                  "bg-gradient-to-br from-violet-500 to-purple-700 !text-white shadow-md shadow-violet-200 hover:from-violet-600 hover:to-purple-800 font-bold",
                day_today:
                  "ring-2 ring-violet-300 text-violet-700 font-bold",
                day_outside: "opacity-30 cursor-default",
                day_disabled: "opacity-20 cursor-not-allowed",
              }}
              components={{
                IconLeft: () => <ChevronLeft className="w-4 h-4" />,
                IconRight: () => <ChevronRight className="w-4 h-4" />,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
