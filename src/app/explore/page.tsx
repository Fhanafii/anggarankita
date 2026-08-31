import { Suspense } from "react";
import type { Metadata } from "next";
import Explorer from "@/components/Explorer";
import { getYears } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "APBD Tracker",
  description:
    "Jelajahi dan bandingkan data APBD daerah Indonesia melalui peta interaktif berdasarkan data publik DJPK Kementerian Keuangan.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const years = await getYears();
  const region = typeof sp.region === "string" ? sp.region : null;
  const year = typeof sp.year === "string" && /^\d{4}$/.test(sp.year) ? Number(sp.year) : years[0] || null;
  const metric = typeof sp.metric === "string" ? sp.metric : null;

  return (
    <main className="h-dvh w-full">
      <Suspense fallback={<div className="flex h-full items-center justify-center bg-sky-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" /></div>}>
        <Explorer initialRegion={region} initialYear={year} initialMetric={metric} />
      </Suspense>
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center pb-1">
        <p className="rounded-t bg-white/70 px-2 py-0.5 text-[10px] text-slate-500 backdrop-blur">
          Anggarin adalah proyek visualisasi independen, bukan aplikasi resmi pemerintah. Sumber data: DJPK — Portal Data SIKD, Kemenkeu RI.
        </p>
      </footer>
    </main>
  );
}
