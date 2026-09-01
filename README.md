# Anggaran Kita (APBD Tracker)

**Jelajahi Anggaran Pendapatan dan Belanja Daerah (APBD) Indonesia melalui peta interaktif.**

Lihat anggaran, realisasi, pendapatan, belanja, dan pembiayaan setiap provinsi,
kabupaten, dan kota — berdasarkan data publik **DJPK — Portal Data SIKD,
Kementerian Keuangan RI** ([djpk.kemenkeu.go.id/portal/data/apbd](https://djpk.kemenkeu.go.id/portal/data/apbd)).

> **Disclaimer:** APBD Tracker adalah proyek visualisasi independen dan bukan
> aplikasi resmi pemerintah.

---

## Daftar isi

- [Fitur](#fitur)
- [Tech stack](#tech-stack)
- [Prasyarat](#prasyarat)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Konfigurasi environment](#konfigurasi-environment)
- [Pipeline data](#pipeline-data)
- [Arsitektur](#arsitektur)
- [Struktur project](#struktur-project)
- [Model data](#model-data)
- [API reference](#api-reference)
- [Peta & choropleth](#peta--choropleth)
- [Supabase (produksi)](#supabase-produksi)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Konvensi & aturan data](#konvensi--aturan-data)
- [Troubleshooting](#troubleshooting)

---

## Fitur

| | |
|---|---|
| 🗺️ **Peta choropleth interaktif** | Batas 38 provinsi + 515 kabupaten/kota; drill-down provinsi → kabupaten/kota; klik daerah membuka panel detail |
| 🔍 **Pencarian daerah** | Cari provinsi/kabupaten/kota (mis. "Bandung"), hasil men-zoom peta dan membuka detail |
| 📅 **Pemilih tahun** | 2022–2026, diambil dinamis dari dataset; mengganti tahun memperbarui peta, metrik, filter, dan detail |
| 🎯 **Pemilih metrik peta** | Total Belanja (default), Total Pendapatan, Belanja Modal, Belanja Pegawai, Belanja Barang & Jasa, Realisasi Belanja, Realisasi % — skala warna dibuat dinamis per metrik |
| 🏷️ **Filter chips** | Semua, APBD Terbesar, Belanja Terbesar, Realisasi Tertinggi, Belanja Modal/Pegawai Terbesar |
| 📋 **Panel detail daerah** | Pendapatan / Belanja / Pembiayaan dengan hierarki akun (drill-down), anggaran vs realisasi + progress bar, metadata kebaruan data, link sumber |
| 🔗 **URL state** | `/?year=2026&region=63.00&metric=belanja_modal&filter=...` — state peta dapat dibagikan |
| 📱 **Responsif** | Panel samping di desktop, bottom sheet di mobile; peta tetap elemen dominan |
| ♿ **Aksesibilitas** | Search keyboard-accessible (combobox + panah + Enter), fokus terlihat, panel bisa ditutup dengan Esc, informasi tidak hanya lewat warna |
| 🌐 **SEO & bahasa** | Metadata lengkap, seluruh copy publik berbahasa Indonesia |

**Non-goals MVP** (by design): tidak melacak proyek individual, kontraktor,
progress fisik, koordinat pembangunan, program/kegiatan, akun pengguna, atau AI.

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS 4** (utilitas UI; tidak perlu component library untuk MVP)
- **MapLibre GL JS 5** — WebGL map, tanpa API key
- **Supabase / PostgreSQL + PostGIS** — opsional (lihat [mode data](#mode-data))
- **mapshaper** — simplifikasi GeoJSON saat build
- Deploy target: **Vercel** + **Supabase** (tanpa server backend terpisah)

---

## Prasyarat

- Node.js ≥ 20.6 (dipakai untuk `--env-file`; project dikembangkan di Node 24)
- npm
- (Opsional) project Supabase — aplikasi tetap jalan tanpanya

---

## Menjalankan aplikasi

```bash
npm install

# development (hot reload)
npm run dev            # http://localhost:3000

# production
npm run build
npm run start
```

Aplikasi **langsung jalan tanpa konfigurasi apa pun**: data APBD 2022–2026
sudah dibundel sebagai snapshot JSON di `data/`, dan layer peta di
`public/geo/`.

### Mode data

| Kondisi | Sumber baca app | Sumber tulis skrip import |
|---|---|---|
| `.env.local` tanpa kredensial Supabase | snapshot `data/apbd-<tahun>.json` | menulis snapshot JSON |
| `.env.local` terisi (URL + anon key) | Supabase (anon, read-only via RLS); fallback ke snapshot bila query gagal | upsert ke Supabase (service role) |

---

## Konfigurasi environment

Salin `.env.example` menjadi `.env.local` (file ini di-gitignore):

```bash
cp .env.example .env.local
```

| Variabel | Untuk apa | Wajib? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase (Settings → API Keys) | hanya jika pakai Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key — dibaca browser, dibatasi RLS read-only | hanya jika pakai Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **hanya** untuk skrip import di server/CLI. Jangan pernah diekspos ke browser atau di-commit | hanya jika pakai Supabase |
| `NEXT_PUBLIC_MAPTILER_KEY` | Basemap vektor alternatif MapTiler (free tier) | tidak — default OpenFreeMap |
| `NEXT_PUBLIC_MAP_STYLE_URL` | URL style MapLibre kustom (mis. CARTO berbayar / style sendiri) | tidak |

> Catatan: `npm run import:apbd` dan `npm run import:regions` sudah memuat
> `.env.local` otomatis (`node --env-file-if-exists`). Menjalankan skrip
> langsung dengan `node scripts/...` polos **tidak** memuat file env.

---

## Pipeline data

Semua data berasal dari DJPK; browser tidak pernah scraping DJPK langsung.

```
DJPK SIKD ──► scripts ──► data/*.json + public/geo/*.geo.json ──► Supabase ──► Next.js ──► MapLibre
```

### 1. `npm run fetch:regions` — `scripts/fetch-djpk-regions.js`

Mengambil daftar resmi provinsi & pemda per tahun dari API DJPK
(`/portal/provinsi/{tahun}`, `/portal/pemda/{prov}/{tahun}`) →
`data/djpk-regions.json`. Kode wilayah DJPK (2 digit provinsi + 2 digit pemda)
menjadi kode resmi region — pencarian/pencocokan tidak pernah mengandalkan nama.

### 2. `npm run build:geo` — `scripts/build-regions.js`

Mencocokkan daftar DJPK dengan batas administratif BIG
(sumber: `dmxsan/indonesia-admin-boundaries`, shapefile resmi Badan Informasi
Geospasial) berdasarkan nama + override eksplisit, lalu menyederhanakan
geometri dengan mapshaper. Output:

- `data/regions.json` — master 546 region (kode, nama, tipe, parent, centroid)
- `public/geo/provinces.geo.json` (±1,4 MB) dan `public/geo/districts.geo.json` (±7,8 MB)

Butuh koneksi internet (unduh ±1 GB raw GeoJSON sementara). Tahap ini jarang
perlu diulang — hanya jika ada perubahan batas wilayah atau kode daerah.

### 3. `npm run import:apbd -- 2022 2023 2024 2025 2026` — `scripts/import-djpk-apbd.ts`

Ingestion postur APBD per daerah/tahun:

1. Fetch halaman tabel POSTUR APBD DJPK per region (6 request paralel, retry).
2. Parse tabel + hierarki akun (indentasi `text-indent` → level 0/1/2).
3. Normalisasi angka: `"27.230,14 M"` → `27230140000` (rupiah, integer).
4. Kelompokkan akun: `revenue` / `expenditure` / `financing`.
5. Bangun `account_code` deterministik (slug path parent→anak) — bukan nama.
6. Simpan metadata sumber per record (`source_url`, `source_name`,
   `source_updated_at`, `source_note`).
7. Upsert ke Supabase (`region_id, year, account_code`) atau tulis snapshot JSON.
8. Laporkan: regions processed, accounts, inserted/updated/skipped/errors;
   error dirinci ke `data/import-errors.log` (tidak ada record rusak yang
   diabaikan diam-diam).

Prasyarat mode Supabase: tabel `regions` harus sudah terisi (skrip menolak
jalan dan memberi tahu jika kosong).

### 4. `npm run import:regions` — `scripts/load-regions-supabase.js`

Memuat `data/regions.json` + geometri dari layer GeoJSON ke tabel `regions`
(geometry sebagai GeoJSON → kolom `geometry(Geometry,4326)` PostGIS).

### Skrip pendukung

- `scripts/fix-centroids.js` — hitung ulang centroid dari layer geo final.
- `scripts/patch-districts.js` — tambal daerah yang nama BIG-nya beda ejaan
  (Gunungkidul, Parepare, OKU Timur/Selatan, Mukomuko).

### Refresh data berkala

DJPK memperbarui realisasi sepanjang tahun. Untuk menyegarkan:

```bash
npm run import:apbd -- 2026          # upsert ulang tahun berjalan
npm run import:regions               # hanya jika regions berubah
```

---

## Arsitektur

```
                    DJPK SIKD (sumber kebenaran)
                          │
                 scripts/ (ingestion, offline)
                          │
              ┌───────────┴───────────┐
              │ Supabase / PostgreSQL │  ← produksi (opsional)
              │  + PostGIS, RLS       │
              └───────────┬───────────┘
                          │  anon key (read-only)
              src/lib/data.ts  ← fallback: snapshot data/*.json
                          │
              Route Handlers (server-side querying)
                /api/map  /api/apbd/[code]  /api/search
                          │
                    React client (Explorer)
                          │
                   MapLibre GL (choropleth)
```

Prinsip:

- **Browser tidak pernah menyentuh DJPK.** Semua parsing/normalisasi terjadi
  di skrip offline; app hanya membaca hasil yang sudah bersih.
- **Query minimal ke klien** (§47): peta awal hanya meminta
  `region + metric + value` per tahun (`/api/map`); akun detail di-fetch saat
  satu daerah dipilih (`/api/apbd/[code]`).
- **Pemisahan UI vs logika peta**: `src/lib/map/*` adalah modul murni
  (skala warna, helper geo, definisi style, controller imperatif);
  `ApbdMap.tsx` hanya wrapper React.

---

## Struktur project

```
apbd-tracker/
├── src/
│   ├── app/
│   │   ├── page.tsx              halaman utama (server component, baca URL state)
│   │   ├── layout.tsx            metadata SEO, font, lang="id"
│   │   └── api/
│   │       ├── map/route.ts      choropleth values per year+metric
│   │       ├── apbd/[regionCode]/route.ts   pohon akun satu daerah/tahun
│   │       └── search/route.ts   pencarian daerah by name
│   ├── components/
│   │   ├── Explorer.tsx          komposisi utama (state, URL sync, layout)
│   │   ├── ApbdMap.tsx           wrapper React MapLibre (init, events, resize)
│   │   ├── RegionPanel.tsx       detail daerah + drill-down akun + sumber
│   │   ├── SearchBar.tsx         combobox pencarian (a11y)
│   │   ├── FilterChips.tsx       chips filter
│   │   └── MapControls.tsx       tahun + metrik + legenda
│   └── lib/
│       ├── data.ts               akses data: Supabase atau snapshot JSON
│       ├── types.ts              tipe domain + definisi METRICS & FILTERS
│       ├── api.ts                tipe respons API
│       ├── format.ts             format rupiah (T/M/jt) & persen (id-ID)
│       ├── hooks/
│       │   ├── useMapData.ts     fetch geo layers + nilai metric
│       │   └── useUrlState.ts    sync state ↔ query string
│       └── map/
│           ├── colors.ts         skala warna choropleth (log/linear)
│           ├── geo.ts            centroid, label points, paint features
│           ├── style.ts          style URL, definisi layer & source
│           └── controller.ts     syncMap / hideBasemapLabels / error fatal
├── scripts/                      pipeline data (lihat § Pipeline data)
├── supabase/schema.sql           DDL + RLS
├── public/geo/                   layer GeoJSON provinces + districts
├── data/                         snapshot regions + apbd-<tahun>.json
└── requirement/                  dokumen kebutuhan (di-gitignore, lokal saja)
```

---

## Model data

### `regions`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `code` | `text unique` | Kode resmi `"PP.DD"` (mis. `10.00` = Jawa Barat, `10.01` = Kab. Bandung) |
| `name` / `type` | `text` | `province` \| `regency` \| `city` |
| `parent_code` | FK → `regions.code` | NULL untuk provinsi |
| `province_code` | `text` | Kode provinsi 2 digit (dipakai semua anak) |
| `geometry` | `geometry(Geometry,4326)` | PostGIS (diisi via `import:regions`) |
| `centroid_lat/lng` | `double precision` | Untuk zoom target pencarian |

### `apbd_records`

Struktur **account-based ternormalisasi** — tidak ada kolom APBD yang
di-hardcode, karena setiap daerah/tahun bisa punya daftar akun berbeda:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `region_id` | FK → `regions.code` | |
| `year` | `int` | |
| `account_code` | `text` | Slug path deterministik, mis. `belanja_daerah/belanja_lainnya/belanja_hibah` |
| `account_name` | `text` | Nama asli dari sumber, dipertahankan |
| `account_group` | `text` | `revenue` \| `expenditure` \| `financing` |
| `parent_account_code` | `text` | Menjaga hierarki DJPK (level 0/1/2) |
| `budget`, `realization` | `bigint` | **Rupiah**; `NULL` = tidak tersedia (≠ nol) |
| `realization_percentage` | `numeric(8,2)` | Angka resmi sumber bila ada |
| `source_url/name/updated_at/note` | `text` | Transparansi & kebaruan sumber |
| **unique** | `(region_id, year, account_code)` | Duplicate handling tanpa memakai nama akun |

---

## API reference

Semua endpoint **dynamic** (tidak di-cache build) dan read-only.

### `GET /api/map?year=2026&metric=belanja`

Nilai satu metrik untuk seluruh region (bahan choropleth + ranking filter).

```jsonc
{
  "year": 2026,
  "years": [2026, 2025, 2024, 2023, 2022],   // daftar valid untuk year selector
  "metric": "belanja",
  "unit": "rupiah",                          // "rupiah" | "percent"
  "values": { "10.00": 36785160000, ... },   // region_id -> nilai (absen = tanpa data)
  "regions": [{ "code": "10.00", "name": "Jawa Barat", "type": "province", "province_code": "10" }]
}
```

`metric` ∈ `belanja` (default), `pendapatan`, `belanja_modal`,
`belanja_pegawai`, `belanja_bj`, `realisasi_belanja`, `realisasi_pct`.

### `GET /api/apbd/{regionCode}?year=2026`

Seluruh baris akun satu daerah/tahun (pohon hierarkis datar) + metadata sumber.

```jsonc
{
  "region": "10.01", "year": 2026, "count": 32,
  "records": [{
    "account_code": "pendapatan_daerah/pad/pajak_daerah",
    "account_name": "Pajak Daerah", "account_group": "revenue",
    "parent_account_code": "pendapatan_daerah/pad", "level": 2,
    "budget": 1229830000, "realization": 662690000, "realization_percentage": 53.88,
    "source_url": "https://djpk.kemenkeu.go.id/portal/data/apbd?tahun=2026&provinsi=10&pemda=01",
    "source_name": "DJPK SIKD", "source_updated_at": "30 Agustus 2026",
    "source_note": "Keterangan: Data APBD Murni, realisasi APBD s.d Agustus 2026, ..."
  }],
  "meta": { "source_name": "...", "source_url": "...", "source_updated_at": "...", "source_note": "..." }
}
```

### `GET /api/search?q=bandung`

```jsonc
{ "results": [
  { "code": "10.17", "name": "Kota Bandung", "type": "city",
    "province": "Jawa Barat", "centroid": [107.6087, -7.0976], "score": 60 }
]}
```

Skor: awalan nama (100) > mengandung frasa (60) > semua kata termuat (30);
maks 12 hasil.

---

## Peta & choropleth

- **Basemap default: [OpenFreeMap](https://openfreemap.org) "liberty"** —
  vektor gratis, tanpa API key, tanpa watermark. CARTO publik kini memberi
  watermark "API KEY REQUIRED", jadi bukan default; kalau punya key CARTO/
  MapTiler, isi `NEXT_PUBLIC_MAP_STYLE_URL` / `NEXT_PUBLIC_MAPTILER_KEY`.
- **Skala warna** dibuat per metrik (`lib/map/colors.ts`): rupiah pakai skala
  logaritmik (sebaran sangat berat-ekor), persen linear 0–100. Metrik berbeda
  tidak pernah memakai skala angka yang sama.
- **Label**: layer label basemap dibungkam otomatis; nama daerah digambar dari
  satu titik centroid polygon terbesar (anti label dobel di wilayah kepulauan).
- **Interaksi**: klik provinsi → zoom + tampilkan batas kab/kota (minzoom 5.5);
  klik kab/kota → panel detail; pencarian → easeTo + highlight garis tebal.
- **Race-safety**: `controller.syncMap()` idempoten dan dipanggil dari event
  `load`, perubahan props, dan `styledata` — selembar apa pun timing data vs
  style, polygon tetap tergambar. Container peta dibungkus div (maplibre CSS
  memaksa `position: relative` yang bisa meruntuhkan tinggi jadi 0).

---

## Supabase (produksi)

1. Buat project (region Singapore disarankan), buka **SQL Editor**, jalankan
   seluruh isi [`supabase/schema.sql`](supabase/schema.sql).
2. Ambil kredensial di **Project Settings → API Keys**; isi `.env.local`.
3. Muat wilayah: `npm run import:regions`
4. Muat APBD: `npm run import:apbd -- 2022 2023 2024 2025 2026`
5. Verifikasi: `SELECT count(*) FROM apbd_records;` (per 2026-08: 79.579 baris).

**Keamanan (RLS)** — sesuai requirement §49:

- `regions` & `apbd_records`: policy SELECT publik (read-only untuk anon key).
- Tidak ada policy INSERT/UPDATE/DELETE → anon key **tidak bisa menulis**.
- Menulis hanya via `SUPABASE_SERVICE_ROLE_KEY` (skrip import, server-side).
- Service role key tidak pernah dikirim ke browser dan tidak pernah di-commit
  (`.env*` di-gitignore).

---

## Deploy ke Vercel

1. Push repo ke GitHub, import di Vercel (framework terdeteksi: Next.js).
2. Set env vars **hanya** `NEXT_PUBLIC_SUPABASE_URL` +
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (atau kosongkan untuk mode snapshot).
3. Deploy. Tidak ada server terpisah; route handlers jalan serverless.
4. Refresh data berkala dilakukan lokal/CI dengan `npm run import:apbd`
   (butuh service role key — jangan pernah ditambahkan ke Vercel).

---

## Konvensi & aturan data

Aturan keras yang diimplementasikan dari dokumen requirement:

1. **Tidak ada data fabrikasi.** Nilai yang tidak ada di sumber tidak dibuat,
   tidak diestimasi, tidak diekstrapolasi. Mock data tidak dipakai di produksi.
2. **Missing ≠ zero.** `budget/realization = NULL` berarti "belum tersedia"
   (UI menampilkan "Data belum tersedia"), bukan `Rp 0`. `Rp 0` hanya muncul
   bila sumber memang melaporkan nol.
3. **Satuan internal = rupiah (BIGINT).** Format tampilan (T/M/jt) hanya di
   presentation layer (`lib/format.ts`, locale `id-ID`).
4. **Persentase sumber adalah otoritatif.** `realization_percentage` memakai
   angka DJPK; dihitung ulang hanya untuk validasi.
5. **Identitas akun = region + year + account_code**, bukan nama (nama bisa
   berulang di level berbeda). Nama asli sumber selalu dipertahankan.
6. **Pencocokan wilayah memakai kode resmi DJPK**, bukan `name.toLowerCase()`.
7. **Metadata kebaruan** (`keterangan`, tanggal terima SIKD) disimpan dan
   ditampilkan — realisasi selalu disertai periodenya bila diketahui.
8. **Posisi produk**: "cara yang lebih mudah untuk menjelajahi anggaran daerah
   Indonesia" — bukan portal resmi.

---

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Peta putih tanpa polygon | Cache build lama / service worker | Hard-refresh (Ctrl+Shift+R); pastikan `npm run build` terbaru |
| "Peta tidak dapat dimuat" | WebGL diblokir / ad-blocker memblokir `openfreemap.org` | Matikan ad-blocker untuk localhost, cek `chrome://gpu` |
| `supabase not configured` saat import | Menjalankan `node scripts/...` langsung | Pakai `npm run import:apbd` (memuat `.env.local`) |
| Import gagal FK `regions` | Tabel `regions` belum terisi | `npm run import:regions` dulu |
| `EADDRINUSE :3000` | Instance lama masih hidup | `netstat -ano \| findstr :3000` lalu `taskkill /PID <pid> /F`, atau `npm run dev -- -p 3001` |
| Node 24 timeout ke DJPK | Happy-Eyeballs/IPv6 di jaringan tertentu | Sudah diatasi skrip (`net.setDefaultAutoSelectFamily(false)`) |
| Daerah tertentu "Data belum tersedia" | DJPK memang belum menerbitkan data daerah/tahun itu | Bukan bug — cek link sumber di panel detail |

---

## Lisensi & atribusi

- Data anggaran: © DJPK — Portal Data SIKD, Kementerian Keuangan RI
  (data publik; tautan sumber per daerah tersedia di panel detail).
- Batas wilayah: Badan Informasi Geospasial (BIG) via
  [dmxsan/indonesia-admin-boundaries](https://github.com/dmxsan/indonesia-admin-boundaries).
- Basemap & geodata: © OpenStreetMap contributors, OpenMapTiles/OpenFreeMap.
- Kode: proyek independen, tanpa afiliasi pemerintah.
