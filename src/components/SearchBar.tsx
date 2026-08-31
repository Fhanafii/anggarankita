"use client";
// Region search with keyboard-accessible suggestions (§17, §18, §51).

import { useEffect, useRef, useState } from "react";

export interface SearchResult {
  code: string;
  name: string;
  type: "province" | "regency" | "city";
  province: string | null;
  centroid: [number, number] | null;
}

const TYPE_LABEL: Record<string, string> = { province: "Provinsi", regency: "Kabupaten", city: "Kota" };

export default function SearchBar({ onPick }: { onPick: (r: SearchResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const onChange = (value: string) => {
    setQ(value);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
    }
  };

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
        setActive(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (r: SearchResult) => { onPick(r); setOpen(false); setQ(r.name); };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-listbox"
          aria-activedescendant={active >= 0 ? `search-opt-${active}` : undefined}
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && active >= 0 && results[active]) pick(results[active]);
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Cari daerah... (mis. Bandung)"
          className="w-full rounded-xl border border-slate-200 bg-white/95 py-2.5 pl-9 pr-9 text-sm shadow-sm outline-none backdrop-blur placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse text-xs text-slate-400">…</span>}
      </div>
      {open && (
        <ul id="search-listbox" role="listbox" className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Daerah tidak ditemukan.</li>}
          {results.map((r, i) => (
            <li
              key={r.code}
              id={`search-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(r)}
              className={`flex cursor-pointer items-baseline gap-2 px-4 py-2.5 text-sm ${i === active ? "bg-sky-50" : ""}`}
            >
              <span aria-hidden>📍</span>
              <span className="font-medium text-slate-800">{r.name}</span>
              <span className="text-xs text-slate-500">{TYPE_LABEL[r.type]}{r.province ? ` · ${r.province}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
