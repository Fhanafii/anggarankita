"use client";
// Filter chips row (§19): each chip maps to a metric for the selected year.

import { FILTERS } from "@/lib/types";

export default function FilterChips({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  return (
    <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onPick(f.id)}
          aria-pressed={active === f.id}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${
            active === f.id
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white/90 text-slate-700 backdrop-blur hover:border-slate-300"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
