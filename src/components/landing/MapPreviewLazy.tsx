"use client";
// Client wrapper so the interactive preview can be code-split with
// ssr:false (not allowed directly from a Server Component in Next 16).

import dynamic from "next/dynamic";

const MapPreview = dynamic(() => import("./MapPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-sky-100 sm:h-[420px]" aria-busy="true">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600 motion-reduce:animate-none" />
      <span className="sr-only">Memuat pratinjau peta…</span>
    </div>
  ),
});

export default function MapPreviewLazy() {
  return <MapPreview />;
}
