"use client";
// Region detail panel: Pendapatan / Belanja / Pembiayaan with account
// drill-down, budget vs realization, source attribution (§23-§26, §36, §38).

import { useEffect, useMemo, useState } from "react";
import type { ApbdRecord } from "@/lib/types";
import { formatRupiah, formatPercent } from "@/lib/format";

interface Props {
  code: string;
  name: string;
  type: string;
  year: number;
  onClose: () => void;
}

interface SourceMeta {
  source_name: string;
  source_url: string;
  source_updated_at: string | null;
  source_note: string | null;
}

const GROUP_LABEL: Record<string, string> = { revenue: "Pendapatan", expenditure: "Belanja", financing: "Pembiayaan" };

function ProgressBar({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Realisasi ${formatPercent(pct)}`}>
      <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${w}%` }} />
    </div>
  );
}

function AccountRow({ rec, children }: { rec: ApbdRecord; children?: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-700">{rec.account_name}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(rec.budget)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-slate-500">
        <span>Realisasi {formatRupiah(rec.realization)}</span>
        <span className="tabular-nums">{formatPercent(rec.realization_percentage)}</span>
      </div>
      <ProgressBar pct={rec.realization_percentage} />
      {children}
    </div>
  );
}

function TreeNode({ rec, all }: { rec: ApbdRecord; all: Map<string, ApbdRecord[]> }) {
  const kids = all.get(rec.account_code) || [];
  const [open, setOpen] = useState(false);
  if (!kids.length) return <AccountRow rec={rec} />;
  return (
    <div>
      <div className="border-b border-slate-50 last:border-0">
        <AccountRow rec={rec}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            <span aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
            {open ? "Sembunyikan rincian" : `Lihat rincian (${kids.length})`}
          </button>
        </AccountRow>
      </div>
      {open && (
        <div className="ml-3 border-l border-slate-200 pl-3">
          {kids.map((k) => <TreeNode key={k.account_code} rec={k} all={all} />)}
        </div>
      )}
    </div>
  );
}

export default function RegionPanel({ code, name, type, year, onClose }: Props) {
  // Remounted via key={code-year} from the parent, so state starts fresh.
  const [records, setRecords] = useState<ApbdRecord[] | null>(null);
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/apbd/${encodeURIComponent(code)}?year=${year}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => { if (!cancelled) { setRecords(d.records || []); setMeta(d.meta); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [code, year, reload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { groups, totals } = useMemo(() => {
    const g: Record<string, { roots: ApbdRecord[]; children: Map<string, ApbdRecord[]> }> = {
      revenue: { roots: [], children: new Map() },
      expenditure: { roots: [], children: new Map() },
      financing: { roots: [], children: new Map() },
    };
    const t: Record<string, ApbdRecord | undefined> = {};
    for (const r of records || []) {
      const grp = g[r.account_group];
      if (!grp) continue;
      if (r.level === 0) { grp.roots.push(r); t[r.account_group] = r; }
      else if (r.parent_account_code) {
        const list = grp.children.get(r.parent_account_code) || [];
        list.push(r);
        grp.children.set(r.parent_account_code, list);
      } else grp.roots.push(r);
    }
    for (const grp of Object.values(g)) {
      grp.roots.sort((a, b) => a.level - b.level || (b.budget || 0) - (a.budget || 0));
      for (const list of grp.children.values()) list.sort((a, b) => (b.budget || 0) - (a.budget || 0));
    }
    return { groups: g, totals: t };
  }, [records]);

  const belanjaPct = totals.expenditure?.realization_percentage ?? null;

  return (
    <aside
      role="dialog" aria-label={`Detail APBD ${name}`}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 flex max-h-[72vh] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:inset-x-auto md:bottom-4 md:right-4 md:top-24 md:max-h-none md:w-[400px] md:rounded-2xl"
    >
      <header className="flex items-start justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{name}</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">{type === "province" ? "Provinsi" : type === "city" ? "Kota" : "Kabupaten"} · APBD {year}</p>
        </div>
        <button onClick={onClose} aria-label="Tutup panel (Esc)" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">✕</button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Gagal memuat data APBD.
            <button onClick={() => setReload((n) => n + 1)} className="ml-2 font-semibold underline">Coba lagi.</button>
          </div>
        )}
        {!error && !records && (
          <div className="space-y-3" aria-busy="true" aria-label="Memuat data">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        )}
        {!error && records && records.length === 0 && (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold">Data belum tersedia</p>
            <p>Data APBD untuk wilayah/tahun ini belum tersedia pada dataset yang digunakan.</p>
          </div>
        )}
        {!error && records && records.length > 0 && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["revenue", "expenditure", "financing"] as const).map((k) => (
                <div key={k} className={`rounded-xl bg-slate-50 p-3 ${k === "financing" ? "col-span-2" : ""}`}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{GROUP_LABEL[k]}</p>
                  <p className="text-base font-bold tabular-nums text-slate-900">{totals[k] ? formatRupiah(totals[k]!.budget) : "—"}</p>
                  {k === "expenditure" && <p className="text-[11px] text-slate-500">Realisasi {formatPercent(belanjaPct)}</p>}
                </div>
              ))}
            </div>
            {(["revenue", "expenditure", "financing"] as const).map((k) => {
              const grp = groups[k];
              if (!grp.roots.length) return null;
              const top = grp.roots[0];
              const rest = grp.roots.slice(1);
              return (
                <section key={k} className="mb-5">
                  <h3 className="mb-1 border-b border-slate-200 pb-1 text-sm font-bold text-slate-900">{GROUP_LABEL[k]}</h3>
                  {top && <TreeNode rec={top} all={grp.children} />}
                  {rest.map((r) => <TreeNode key={r.account_code} rec={r} all={grp.children} />)}
                </section>
              );
            })}
            <footer className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Sumber Data</p>
              <p>{meta?.source_name || "DJPK"} — Portal Data SIKD</p>
              <p>APBD {year}{meta?.source_note ? ` · ${meta.source_note}` : ""}</p>
              {meta?.source_updated_at && <p>Data diterima: {meta.source_updated_at}</p>}
              <a href={meta?.source_url || "https://djpk.kemenkeu.go.id/portal/data/apbd"} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-medium text-sky-700 hover:underline">
                Lihat sumber →
              </a>
            </footer>
          </>
        )}
      </div>
    </aside>
  );
}
