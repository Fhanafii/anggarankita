import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Map, Search, Wallet } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import MapPreviewLazy from "@/components/landing/MapPreviewLazy";
import TileShuffle from "@/components/landing/TileShuffle";

export const metadata: Metadata = {
  title: "Anggarin — Jelajahi APBD Indonesia melalui Peta",
  description:
    "Jelajahi anggaran daerah Indonesia melalui peta interaktif. Lihat pendapatan, belanja, pembiayaan, anggaran, dan realisasi APBD berdasarkan data publik DJPK.",
};

const FEATURES = [
  {
    icon: Map,
    title: "Jelajahi lewat peta",
    text: "Lihat seluruh Indonesia dan pilih provinsi, kabupaten, atau kota langsung dari peta.",
  },
  {
    icon: Wallet,
    title: "Pahami struktur anggaran",
    text: "Lihat bagaimana pendapatan, belanja, dan pembiayaan daerah tersusun.",
  },
  {
    icon: BarChart3,
    title: "Lihat anggaran dan realisasi",
    text: "Bandingkan nilai yang dianggarkan dengan realisasi yang tersedia pada data sumber.",
  },
  {
    icon: Search,
    title: "Temukan daerah lebih cepat",
    text: "Cari daerah atau gunakan filter untuk menemukan wilayah berdasarkan metrik anggaran tertentu.",
  },
];

const STEPS = [
  { n: "01", title: "Pilih daerah", text: "Cari daerah atau klik langsung pada peta." },
  { n: "02", title: "Lihat anggaran", text: "Pelajari pendapatan, belanja, pembiayaan, dan realisasi." },
  { n: "03", title: "Bandingkan", text: "Gunakan filter dan metrik untuk melihat perbedaan antarwilayah." },
];

const FAQS = [
  {
    q: "Apa itu Anggarin?",
    a: "Anggarin adalah platform independen untuk menjelajahi data APBD Indonesia melalui peta interaktif.",
  },
  {
    q: "Apakah Anggarin adalah website pemerintah?",
    a: "Bukan. Anggarin merupakan proyek independen yang menggunakan dan memvisualisasikan data publik pemerintah.",
  },
  {
    q: "Dari mana data APBD berasal?",
    a: "Sumber utama Anggarin adalah Portal Data SIKD dari Direktorat Jenderal Perimbangan Keuangan (DJPK), Kementerian Keuangan Republik Indonesia.",
  },
  {
    q: "Apakah Anggarin menunjukkan semua proyek pemerintah?",
    a: "Tidak. Data utama Anggarin berfokus pada struktur APBD, termasuk pendapatan, belanja, pembiayaan, anggaran/pagu, dan realisasi. Detail proyek hanya dapat ditampilkan jika tersedia dari sumber data yang relevan.",
  },
  {
    q: "Apakah data Anggarin real-time?",
    a: "Tidak selalu. Anggarin mengikuti ketersediaan dan pembaruan data pada sumber yang digunakan.",
  },
  {
    q: "Mengapa ada daerah yang datanya tidak lengkap?",
    a: "Struktur dan ketersediaan data dapat berbeda berdasarkan tahun dan wilayah. Anggarin tidak mengisi data yang tidak tersedia dengan estimasi.",
  },
  {
    q: "Apakah saya boleh menggunakan datanya?",
    a: "Untuk penggunaan data, pengguna harus mengacu pada ketentuan dan lisensi dari sumber data masing-masing.",
  },
];

const AVAILABLE = [
  "Pendapatan", "Belanja", "Pembiayaan", "Anggaran / Pagu", "Realisasi", "Persentase realisasi", "Data berdasarkan daerah",
];
const NOT_AVAILABLE = [
  "Detail setiap proyek", "Koordinat proyek", "Kontraktor", "Progress fisik", "Program/kegiatan jika tidak tersedia pada sumber",
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <Navbar />

      {/* ============ HERO ============ */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 text-center md:pt-20">
        <p className="mx-auto mb-4 w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Data publik · DJPK Kementerian Keuangan RI
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Ke mana anggaran daerah pergi?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
          Anggarin membantu kamu menjelajahi APBD Indonesia melalui peta interaktif. Pilih daerah, lihat
          anggarannya, dan pahami bagaimana pendapatan, belanja, serta realisasi APBD berubah dari waktu ke waktu.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/explore"
            className="rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:bg-slate-700 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Jelajahi APBD
          </Link>
          <a
            href="#cara"
            className="rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Cara Kerjanya ↓
          </a>
        </div>
        <p className="mt-4 text-xs font-medium text-slate-600">Menggunakan data publik DJPK Kementerian Keuangan RI</p>

        <div className="mt-12">
          <MapPreviewLazy />
        </div>
      </section>

      {/* ============ PROBLEM ============ */}
      <section id="tentang" className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Data anggaran ada. Tapi tidak selalu mudah dipahami.
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Data APBD tersedia untuk publik, tetapi informasi anggaran sering kali tersebar dalam tabel dan
              portal yang membutuhkan waktu untuk dipahami.
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              Anggarin mencoba membuat data tersebut lebih mudah dijelajahi dengan menggunakan peta sebagai
              titik awal — data tersedia, dan visualisasi dapat membuatnya lebih mudah dieksplorasi.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Podium tabel</p>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Buka portal</li>
                <li>2. Cari daerah</li>
                <li>3. Cari kategori</li>
                <li>4. Bandingkan angka</li>
                <li>5. Interpretasi sendiri</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Anggarin</p>
              <ol className="mt-3 space-y-2 text-sm text-slate-700">
                <li>1. Peta Indonesia</li>
                <li>2. Pilih daerah</li>
                <li>3. Lihat APBD</li>
                <li>4. Bandingkan</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY MAP + HOW IT WORKS ============ */}
      <section id="cara" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Kenapa menggunakan peta?</h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Anggaran daerah memiliki dimensi geografis. Setiap angka APBD melekat pada sebuah daerah,
              sehingga peta dapat menjadi cara yang lebih intuitif untuk melihat perbedaan anggaran
              antarwilayah.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-2 text-sm text-slate-700">
              {["Lihat perbedaan antarwilayah", "Temukan daerah dengan cepat", "Bandingkan metrik", "Eksplorasi berdasarkan lokasi"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-sky-600">✓</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-8 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:order-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Indonesia</p>
            <TileShuffle />
            <p className="mt-5 text-sm text-slate-600">Klik daerah → lihat APBD-nya</p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Satu peta untuk menjelajahi APBD Indonesia.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Mulai dari peta Indonesia, pilih daerah yang ingin kamu ketahui, lalu lihat ringkasan APBD dan
            rincian pendapatan, belanja, serta pembiayaannya.
          </p>
          <div className="mt-10 grid gap-6 text-left md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <p className="text-3xl font-extrabold text-sky-200 transition-colors duration-200 group-hover:text-sky-300 motion-reduce:transition-none">{s.n}</p>
                <h3 className="mt-2 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Apa yang bisa kamu jelajahi?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-colors duration-200 group-hover:bg-sky-100 motion-reduce:transition-none" aria-hidden>
                  <f.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/explore" className="text-sm font-semibold text-sky-700 hover:underline">
              Coba langsung di APBD Explorer →
            </Link>
          </div>
        </div>
      </section>

      {/* ============ DATA SOURCE & TRANSPARENCY ============ */}
      <section id="data" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Dari mana datanya berasal?</h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Anggarin menggunakan data publik APBD yang tersedia melalui Portal Data SIKD DJPK sebagai
              sumber utama untuk data anggaran daerah.
            </p>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sumber utama</p>
              <p className="mt-2 font-bold">Direktorat Jenderal Perimbangan Keuangan (DJPK)</p>
              <p className="text-sm text-slate-600">Kementerian Keuangan Republik Indonesia</p>
              <p className="mt-3 text-sm text-slate-500">
                Format data: APBD · Anggaran/Pagu · Realisasi · %
              </p>
              <a
                href="https://djpk.kemenkeu.go.id/portal/data/apbd"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              >
                Lihat sumber data →
              </a>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Kami ingin kamu tahu dari mana setiap angka berasal.
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Anggarin bukan sumber data resmi pemerintah. Anggarin adalah proyek independen yang
              memvisualisasikan data publik agar lebih mudah dijelajahi. Setiap halaman detail daerah
              menyediakan referensi sumber, tahun, periode data, dan tanggal penerimaan data.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[
                ["SOURCE", "DJPK"],
                ["YEAR", "2022–2026"],
                ["DATA PERIOD", "Sesuai ketersediaan sumber"],
                ["LAST UPDATED", "Sesuai metadata sumber"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p>
                  <p className="mt-1 font-semibold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ LIMITATIONS + PHILOSOPHY ============ */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            Apa yang belum bisa ditunjukkan Anggarin?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-slate-600">
            Data APBD tidak selalu menyediakan detail sampai ke tingkat proyek individual. Karena itu,
            Anggarin tidak mengklaim dapat menunjukkan setiap proyek pembangunan atau ke mana setiap rupiah
            digunakan secara spesifik.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white p-6">
              <p className="text-sm font-bold text-emerald-700">Yang tersedia</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                {AVAILABLE.map((t) => <li key={t}>✓ {t}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-bold text-slate-500">Belum menjadi bagian dari data utama</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
                {NOT_AVAILABLE.map((t) => <li key={t}>× {t}</li>)}
              </ul>
              <p className="mt-3 text-xs text-slate-400">
                Belum tersedia pada sumber data yang digunakan.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-2xl rounded-2xl bg-slate-900 p-8 text-center text-white">
            <h3 className="text-xl font-bold">Tidak mengarang angka.</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Jika data tidak tersedia, Anggarin tidak akan mengisinya dengan estimasi. Data yang tersedia
              ditampilkan berdasarkan sumber yang digunakan. Data yang tidak tersedia akan ditandai sebagai
              tidak tersedia.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Pertanyaan yang sering muncul</h2>
        <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="text-slate-400 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">＋</span>
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="border-t border-slate-100 bg-sky-50/50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Penasaran dengan anggaran daerahmu?</h2>
          <p className="mt-3 text-slate-600">
            Mulai dari satu daerah. Bandingkan dengan daerah lain. Jelajahi APBD Indonesia melalui peta.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/explore" className="rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:bg-slate-700 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              Jelajahi APBD
            </Link>
            <a href="#data" className="rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400">
              Lihat Data &amp; Sumber
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <p className="text-lg font-extrabold tracking-tight">Anggarin</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
              Jelajahi anggaran daerah Indonesia melalui peta interaktif.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Produk</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/explore" className="text-slate-600 hover:text-slate-900">Jelajahi APBD</Link></li>
              <li><Link href="/#tentang" className="text-slate-600 hover:text-slate-900">Tentang</Link></li>
              <li><Link href="/#faq" className="text-slate-600 hover:text-slate-900">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Data</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="https://djpk.kemenkeu.go.id/portal/data/apbd" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900">
                  Sumber Data (DJPK SIKD)
                </a>
              </li>
              <li><Link href="/#data" className="text-slate-600 hover:text-slate-900">Metodologi</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 md:flex-row">
            <p>Anggarin adalah proyek independen. Bukan layanan resmi pemerintah.</p>
            <p>© {new Date().getFullYear()} Anggarin</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
