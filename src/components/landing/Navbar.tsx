"use client";
// Landing navbar: sticky, translucent; mobile menu toggle (§6).

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { href: "/#tentang", label: "Tentang" },
  { href: "/#data", label: "Data" },
  { href: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4" aria-label="Navigasi utama">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
          <Image src="/logo/logo-ak.svg" alt="Logo Anggaran Kita" width={34} height={24} priority />
          Anggaran Kita
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/explore" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Jelajahi
          </Link>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              {l.label}
            </a>
          ))}
          <Link
            href="/explore"
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Mulai Jelajah
          </Link>
        </div>
        <button
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden className="text-lg leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </nav>
      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <Link href="/explore" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              Jelajahi
            </Link>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                {l.label}
              </a>
            ))}
            <Link href="/explore" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-white">
              Mulai Jelajah
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
