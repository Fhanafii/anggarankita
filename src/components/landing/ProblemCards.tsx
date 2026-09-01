"use client";
// Problem-section comparison cards (§10): default state highlights "Anggarin".
// Hovering either card swaps the highlight to the hovered one — a playful way
// to invite comparing both flows. Reduced-motion friendly (color transitions
// only, 200ms).

import { useState } from "react";

const TRADITIONAL = ["Buka portal", "Cari daerah", "Cari kategori", "Bandingkan angka", "Interpretasi sendiri"];
const ANGGARIN = ["Peta Indonesia", "Pilih daerah", "Lihat APBD", "Bandingkan"];

interface CardProps {
  label: string;
  steps: string[];
  highlighted: boolean;
  onEnter: () => void;
}

function CompareCard({ label, steps, highlighted, onEnter }: CardProps) {
  return (
    <div
      onMouseEnter={onEnter}
      className={`rounded-2xl border p-5 transition-all duration-200 motion-reduce:transition-none ${
        highlighted
          ? "-translate-y-1 border-sky-200 bg-sky-50/70 shadow-lg motion-reduce:translate-y-0"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-wider transition-colors duration-200 motion-reduce:transition-none ${highlighted ? "text-sky-700" : "text-slate-400"}`}>
        {label}
      </p>
      <ol className={`mt-3 space-y-2 text-sm transition-colors duration-200 motion-reduce:transition-none ${highlighted ? "text-slate-700" : "text-slate-600"}`}>
        {steps.map((s, i) => (
          <li key={s}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ProblemCards() {
  // "anggarin" (default) or "traditional" — which card currently holds the highlight
  const [active, setActive] = useState<"anggarin" | "traditional">("anggarin");

  return (
    <div
      className="grid gap-4 sm:grid-cols-2"
      onMouseLeave={() => setActive("anggarin")} // back to default when pointer leaves
    >
      <CompareCard
        label="Podium tabel"
        steps={TRADITIONAL}
        highlighted={active === "traditional"}
        onEnter={() => setActive("traditional")}
      />
      <CompareCard
        label="Anggarin"
        steps={ANGGARIN}
        highlighted={active === "anggarin"}
        onEnter={() => setActive("anggarin")}
      />
    </div>
  );
}
