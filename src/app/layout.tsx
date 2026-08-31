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
  title: "APBD Tracker — Jelajahi Anggaran Daerah Indonesia",
  description:
    "Jelajahi dan bandingkan data APBD daerah Indonesia melalui peta interaktif berdasarkan data publik DJPK Kementerian Keuangan.",
  openGraph: {
    title: "APBD Tracker — Jelajahi Anggaran Daerah Indonesia",
    description:
      "Jelajahi APBD Indonesia melalui peta interaktif. Lihat anggaran, realisasi, pendapatan, belanja, dan pembiayaan setiap daerah berdasarkan data publik DJPK.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-white font-sans text-slate-900">{children}</body>
    </html>
  );
}
