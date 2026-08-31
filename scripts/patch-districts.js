#!/usr/bin/env node
// Patch 5 unmatched districts (name-spelling variants) into districts.geo.json
// and recompute their centroids in regions.json.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");

const ms = (args) => execFileSync("npx", ["--yes", "mapshaper", ...args], { cwd: ROOT, stdio: "pipe", shell: process.platform === "win32", maxBuffer: 1 << 28 });

// code -> [rawFile, WADMKK]
const WANT = {
  "12.02": ["Daerah_Istimewa_Yogyakarta", "Gunungkidul"],
  "20.23": ["Sulawesi_Selatan", "Kota Parepare"],
  "06.13": ["Sumatera_Selatan", "Ogan Komering Ulu Timur"],
  "06.14": ["Sumatera_Selatan", "Ogan Komering Ulu Selatan"],
  "07.07": ["Bengkulu", "Muko Muko"],
};
const NAMES = {
  "12.02": "Kabupaten Gunung Kidul", "20.23": "Kota Pare-pare",
  "06.13": "Kabupaten OKU Timur", "06.14": "Kabupaten OKU Selatan", "07.07": "Kabupaten Mukomuko",
};
const TYPES = { "12.02": "regency", "20.23": "city", "06.13": "regency", "06.14": "regency", "07.07": "regency" };

const feats = [];
for (const [code, [file, wad]] of Object.entries(WANT)) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "geo-raw", `${file}.json`), "utf8"));
  const src = d.features.find((f) => f.properties.WADMKK === wad);
  if (!src) { console.error("NOT FOUND", code, wad); continue; }
  feats.push({
    type: "Feature",
    properties: { code, name: NAMES[code], type: TYPES[code], province_code: code.split(".")[0] },
    geometry: src.geometry,
  });
}
const tmp = path.join(ROOT, "data", "_patch.geojson");
fs.writeFileSync(tmp, JSON.stringify({ type: "FeatureCollection", features: feats }));
ms(["-i", tmp, "-simplify", "8%", "keep-shapes", "-o", tmp + ".smp.geojson", "format=GeoJSON"]);
const smp = JSON.parse(fs.readFileSync(tmp + ".smp.geojson", "utf8"));
const smpFeats = smp.type === "FeatureCollection" ? smp.features : [smp];

const dist = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "geo", "districts.geo.json"), "utf8"));
for (const f of smpFeats) {
  if (!dist.features.some((x) => x.properties.code === f.properties.code)) dist.features.push(f);
}
fs.writeFileSync(path.join(ROOT, "public", "geo", "districts.geo.json"), JSON.stringify(dist));

function centroidOf(geom) {
  let best = null, bestArea = 0;
  const rings = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
  for (const poly of rings) {
    const ring = poly[0];
    let a = 0, x = 0, y = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += f; x += (ring[j][0] + ring[i][0]) * f; y += (ring[j][1] + ring[i][1]) * f;
    }
    a /= 2;
    if (Math.abs(a) > bestArea) { bestArea = Math.abs(a); best = [x / (6 * a), y / (6 * a)]; }
  }
  return best;
}
const regions = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "regions.json"), "utf8"));
for (const f of smpFeats) {
  const r = regions.find((x) => x.code === f.properties.code);
  if (r) { const c = centroidOf(f.geometry); if (c) { r.centroid_lng = +c[0].toFixed(4); r.centroid_lat = +c[1].toFixed(4); } }
}
fs.writeFileSync(path.join(ROOT, "data", "regions.json"), JSON.stringify(regions, null, 1));
fs.rmSync(tmp); fs.rmSync(tmp + ".smp.geojson");
fs.rmSync(path.join(ROOT, "data", "geo-raw"), { recursive: true, force: true });
console.log("patched:", smpFeats.map((f) => f.properties.code).join(", "));
console.log("districts total:", dist.features.length);
