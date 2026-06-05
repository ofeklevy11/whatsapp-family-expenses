"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

/**
 * Lightweight checkbox-popover multi-select (no external dependency).
 * Shows a trigger button with the active count; opens a panel of checkboxes.
 */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const count = selected.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm transition",
          count
            ? "border-brand bg-brand/5 text-slate-800"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
        )}
      >
        <span>
          {label}
          {count > 0 && (
            <span className="mr-1 rounded-full bg-brand px-1.5 text-xs text-white">
              {count}
            </span>
          )}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-56 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-slate-400">אין אפשרויות</p>
          ) : (
            <>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="mb-1 w-full rounded-md px-2 py-1 text-right text-xs text-slate-500 hover:bg-slate-50"
                >
                  נקה בחירה
                </button>
              )}
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="accent-brand"
                  />
                  <span className="text-slate-700">{opt.label}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
