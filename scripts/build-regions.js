#!/usr/bin/env node
// Build region master + simplified GeoJSON layers from:
//  - data/djpk-regions.json  (DJPK province/pemda codes & names)
//  - data/geo-raw/*.json     (BIG administrative boundaries via dmxsan/indonesia-admin-boundaries)
// Outputs:
//  - data/regions.json               region master (code, name, type, parent, centroid)
//  - public/geo/provinces.geo.json   simplified province polygons
//  - public/geo/districts.geo.json   simplified regency/city polygons
// Stages are resumable via data/_tmp artifacts; raw files are deleted after matching.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "djpk-regions.json"), "utf8"));
const GEORAW = path.join(ROOT, "data", "geo-raw");
const TMP = path.join(ROOT, "data", "_tmp");
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.join(ROOT, "public", "geo"), { recursive: true });

const YEARS = Object.keys(REG).sort();
const master = REG[YEARS[YEARS.length - 1]];

// DJPK province code -> geo-raw file slug (BIG province names)
const PROV_FILES = {
  "01": "Aceh", "02": "Sumatera_Utara", "03": "Sumatera_Barat", "04": "Riau", "05": "Jambi",
  "06": "Sumatera_Selatan", "07": "Bengkulu", "08": "Lampung", "09": "DKI_Jakarta",
  "10": "Jawa_Barat", "11": "Jawa_Tengah", "12": "Daerah_Istimewa_Yogyakarta", "13": "Jawa_Timur",
  "14": "Kalimantan_Barat", "15": "Kalimantan_Tengah", "16": "Kalimantan_Selatan",
  "17": "Kalimantan_Timur", "18": "Sulawesi_Utara", "19": "Sulawesi_Tengah", "20": "Sulawesi_Selatan",
  "21": "Sulawesi_Tenggara", "22": "Bali", "23": "Nusa_Tenggara_Barat", "24": "Nusa_Tenggara_Timur",
  "25": "Maluku", "26": "Papua", "27": "Maluku_Utara", "28": "Banten",
  "29": "Kepulauan_Bangka_Belitung", "30": "Gorontalo", "31": "Kepulauan_Riau", "32": "Papua_Barat",
  "33": "Sulawesi_Barat", "34": "Kalimantan_Utara", "35": "Papua_Selatan", "36": "Papua_Tengah",
  "37": "Papua_Pegunungan", "38": "Papua_Barat_Daya",
};

const norm = (s) =>
  String(s || "").toUpperCase().replace(/\./g, "").replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function bareName(name) {
  return norm(name).replace(/^KAB /, "").replace(/^KABUPATEN /, "").replace(/^KOTA /, "");
}

function centroidOf(geom) {
  let best = null, bestArea = -1;
  const rings = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
  for (const poly of rings) {
    const ring = poly[0];
    let a = 0, x = 0, y = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += f; x += (ring[j][0] + ring[i][0]) * f; y += (ring[j][1] + ring[i][1]) * f;
    }
    a /= 2;
    if (Math.abs(a) > Math.abs(bestArea)) { bestArea = a; best = [x / (6 * a), y / (6 * a)]; }
  }
  return best || [0, 0];
}

const DIST_OVERRIDES = {
  "09.05": "KOTA ADM JAKARTA PUSAT", "09.06": "KOTA ADM JAKARTA UTARA", "09.07": "KOTA ADM JAKARTA BARAT",
  "09.08": "KOTA ADM JAKARTA SELATAN", "09.09": "KOTA ADM JAKARTA TIMUR", "09.98": "KAB ADM KEP SERIBU",
  "12.75": "KAB SLEMAN", "12.76": "KAB BANTUL", "12.77": "KAB GUNUNGKIDUL", "12.78": "KOTA YOGYAKARTA", "12.79": "KAB KULON PROGO",
};

const ms = (args) =>
  execFileSync("npx", ["--yes", "mapshaper", ...args], {
    cwd: ROOT, stdio: "pipe", shell: process.platform === "win32", maxBuffer: 1 << 28,
  });

const unmatched = [];

// ---------- Stage 1: match districts per province (raw -> batch_XX.geojson + rows_XX.json)
for (const pc of Object.keys(master)) {
  const batchF = path.join(TMP, `batch_${pc}.geojson`);
  const rowsF = path.join(TMP, `rows_${pc}.json`);
  if (fs.existsSync(batchF) && fs.existsSync(rowsF)) continue; // already matched
  const rawF = path.join(GEORAW, `dist_${PROV_FILES[pc]}.json`);
  if (!fs.existsSync(rawF)) { unmatched.push(`NORAW ${pc} ${PROV_FILES[pc]}`); continue; }
  const features = JSON.parse(fs.readFileSync(rawF, "utf8")).features;
  const rows = [];
  const batch = [];
  const used = new Set();
  for (const [dc, dname] of Object.entries(master[pc].pemda)) {
    if (dc === "00") continue;
    const full = `${pc}.${dc}`;
    const bare = bareName(dname);
    const isKota = /\bKOTA\b/.test(norm(dname)) && !/\bKAB/.test(norm(dname));
    let feat = features.find((x) => !used.has(x) && bareName(x.properties.WADMKK) === bare);
    if (!feat && DIST_OVERRIDES[full]) {
      const want = norm(DIST_OVERRIDES[full]);
      feat = features.find((x) => !used.has(x) && norm(x.properties.WADMKK) === want);
    }
    if (!feat) {
      feat = features.find((x) => {
        if (used.has(x)) return false;
        const b = bareName(x.properties.WADMKK);
        return b === bare || (b.length > 4 && b.includes(bare)) || (bare.length > 4 && bare.includes(b));
      });
    }
    if (feat) used.add(feat);
    const [clng, clat] = feat ? centroidOf(feat.geometry) : [null, null];
    rows.push({
      code: full, djpk: { provinsi: pc, pemda: dc },
      name: dname.replace(/^Kab\.\s*/i, "Kabupaten ").trim(),
      type: isKota ? "city" : "regency",
      parent_code: `${pc}.00`, province_code: pc,
      centroid_lat: clat && +clat.toFixed(4), centroid_lng: clng && +clng.toFixed(4),
    });
    if (feat) {
      batch.push({
        type: "Feature",
        properties: { code: full, name: dname, type: isKota ? "city" : "regency", province_code: pc },
        geometry: feat.geometry,
      });
    } else unmatched.push(`DIST ${full} ${dname}`);
  }
  fs.writeFileSync(batchF, JSON.stringify({ type: "FeatureCollection", features: batch }));
  fs.writeFileSync(rowsF, JSON.stringify(rows));
  fs.rmSync(rawF);
  process.stdout.write(`m${pc}`);
}

// ---------- Stage 2: simplify each batch -> smp_XX.geojson (keep batch until smp exists)
for (const pc of Object.keys(master)) {
  const batchF = path.join(TMP, `batch_${pc}.geojson`);
  const smpF = path.join(TMP, `smp_${pc}.geojson`);
  if (fs.existsSync(smpF)) { if (fs.existsSync(batchF)) fs.rmSync(batchF); continue; }
  if (!fs.existsSync(batchF)) continue;
  ms(["-i", batchF, "-simplify", "8%", "keep-shapes", "-o", smpF, "format=GeoJSON"]);
  fs.rmSync(batchF);
  process.stdout.write(`s${pc}`);
}

// ---------- Stage 3: provinces (small; match by WADMPR name)
const provRows = [];
const provFeatures = [];
for (const pc of Object.keys(master)) {
  const name = master[pc].name.replace(/^Provinsi\s+/i, "");
  const rawF = path.join(GEORAW, `prov_${PROV_FILES[pc]}.json`);
  let feat = null;
  if (fs.existsSync(rawF)) {
    feat = JSON.parse(fs.readFileSync(rawF, "utf8")).features[0] || null;
    fs.rmSync(rawF);
  }
  const [clng, clat] = feat ? centroidOf(feat.geometry) : [null, null];
  provRows.push({
    code: `${pc}.00`, djpk: { provinsi: pc, pemda: "00" },
    name, type: "province", parent_code: null, province_code: pc,
    centroid_lat: clat && +clat.toFixed(4), centroid_lng: clng && +clng.toFixed(4),
  });
  if (feat) {
    provFeatures.push({
      type: "Feature",
      properties: { code: `${pc}.00`, name, type: "province", province_code: pc },
      geometry: feat.geometry,
    });
  } else unmatched.push(`PROV ${pc} ${name}`);
}
const provSmp = path.join(TMP, "prov_smp.geojson");
if (provFeatures.length) {
  const src = path.join(TMP, "prov_src.geojson");
  fs.writeFileSync(src, JSON.stringify({ type: "FeatureCollection", features: provFeatures }));
  ms(["-i", src, "-simplify", "5%", "keep-shapes", "-o", provSmp, "format=GeoJSON"]);
  fs.rmSync(src);
}

// ---------- Stage 4: merge -> final outputs
const allRows = [...provRows];
for (const pc of Object.keys(master)) {
  const rowsF = path.join(TMP, `rows_${pc}.json`);
  if (fs.existsSync(rowsF)) allRows.push(...JSON.parse(fs.readFileSync(rowsF, "utf8")));
}
fs.writeFileSync(path.join(ROOT, "data", "regions.json"), JSON.stringify(allRows, null, 1));

const merged = { type: "FeatureCollection", features: [] };
for (const pc of Object.keys(master)) {
  const smpF = path.join(TMP, `smp_${pc}.geojson`);
  if (!fs.existsSync(smpF)) continue;
  const d = JSON.parse(fs.readFileSync(smpF, "utf8"));
  const feats = d.type === "FeatureCollection" ? d.features : d.type === "Feature" ? [d] : [];
  merged.features.push(...feats);
}
fs.writeFileSync(path.join(ROOT, "public", "geo", "districts.geo.json"), JSON.stringify(merged));
if (fs.existsSync(provSmp)) {
  fs.copyFileSync(provSmp, path.join(ROOT, "public", "geo", "provinces.geo.json"));
} else {
  fs.writeFileSync(path.join(ROOT, "public", "geo", "provinces.geo.json"), JSON.stringify({ type: "FeatureCollection", features: [] }));
}

console.log(`\nregions: ${allRows.length} (provinces ${provRows.length}, districts ${merged.features.length})`);
console.log(`unmatched: ${unmatched.length}`);
for (const u of unmatched.slice(0, 60)) console.log("  !", u);
