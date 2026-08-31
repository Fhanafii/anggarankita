"use client";
// Bottom-left map controls: year selector, metric selector, legend (§20, §27, §46).

import { useState } from "react";
import { METRICS, type MetricDef } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { CHOROPLETH_COLORS } from "@/lib/map/colors";

interface Props {
  year: number | null;
  years: number[];
  metric: MetricDef;
  legend: { min: number; max: number } | null;
  districtsLoading: boolean;
  onYear: (y: number) => void;
  onMetric: (id: string) => void;
}

export default function MapControls({ year, years, metric, legend, districtsLoading, onYear, onMetric }: Props) {
  const [open, setOpen] = useState(false);
  const fmt = (v: number) => (metric.unit === "percent" ? `${Math.round(v)}%` : formatRupiah(v));
  const gradient = `linear-gradient(to right,${CHOROPLETH_COLORS.join(",")})`;

  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor="year" className="rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow backdrop-blur">
          Tahun
        </label>
        <select
          id="year"
          value={year ?? ""}
          onChange={(e) => onYear(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-sm font-semibold shadow backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-sm font-medium shadow backdrop-blur hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            🗺 {metric.label} <span aria-hidden>▾</span>
          </button>
          {open && (
            <div role="menu" className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Map value</p>
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  role="menuitemradio"
                  aria-checked={metric.id === m.id}
                  onClick={() => { onMetric(m.id); setOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sky-50 ${metric.id === m.id ? "font-semibold text-sky-700" : "text-slate-700"}`}
                >
                  <span aria-hidden>{metric.id === m.id ? "●" : "○"}</span> {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {legend && (
        <div className="rounded-lg bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow backdrop-blur">
          <p className="mb-1 font-medium">{metric.label} {year ? `· ${year}` : ""}</p>
          <div className="flex items-center gap-1.5">
            <span>{fmt(legend.min)}</span>
            <span className="h-2 w-28 rounded-full" style={{ background: gradient }} aria-hidden />
            <span>{fmt(legend.max)}</span>
          </div>
          {districtsLoading && <p className="mt-1 text-slate-400">Memuat batas kabupaten/kota…</p>}
        </div>
      )}
    </div>
  );
}
