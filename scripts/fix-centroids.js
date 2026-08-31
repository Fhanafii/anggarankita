#!/usr/bin/env node
// Recompute centroid_lat/lng for all regions from the final geo layers.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

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

const byCode = new Map();
for (const layer of ["provinces", "districts"]) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "geo", `${layer}.geo.json`), "utf8"));
  for (const f of d.features) {
    const c = centroidOf(f.geometry);
    if (c) byCode.set(f.properties.code, c);
  }
}

const regions = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "regions.json"), "utf8"));
let fixed = 0, missing = [];
for (const r of regions) {
  const c = byCode.get(r.code);
  if (c) { r.centroid_lng = +c[0].toFixed(4); r.centroid_lat = +c[1].toFixed(4); fixed++; }
  else missing.push(r.code + " " + r.name);
}
fs.writeFileSync(path.join(ROOT, "data", "regions.json"), JSON.stringify(regions, null, 1));
console.log(`centroids set: ${fixed}/${regions.length}`);
console.log(`missing: ${missing.length}`, missing.slice(0, 20));
