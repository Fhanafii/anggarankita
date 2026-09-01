import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Anggaran Kita — Jelajahi APBD Indonesia melalui Peta",
    template: "%s | Anggaran Kita",
  },
  description:
    "Jelajahi anggaran daerah Indonesia melalui peta interaktif. Lihat pendapatan, belanja, pembiayaan, anggaran, dan realisasi APBD berdasarkan data publik DJPK.",
  keywords: [
    "APBD Indonesia", "APBD daerah", "anggaran daerah", "data APBD", "APBD 2026",
    "realisasi APBD", "DJPK", "anggaran provinsi", "anggaran kabupaten", "anggaran kota",
  ],
  openGraph: {
    title: "Anggaran Kita — Ke mana anggaran daerah pergi?",
    description: "Jelajahi APBD Indonesia melalui peta interaktif.",
  },
  icons: { icon: "/logo/logo-ak.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-white font-sans text-slate-900">{children}</body>
    </html>
  );
}
