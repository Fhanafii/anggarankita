// Load regions master + geometry into Supabase (regions table).
// Usage: npm run import:regions   (reads .env.local via --env-file)
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Supabase env missing — run via: npm run import:regions"); process.exit(1); }

const regions = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "regions.json"), "utf8"));
const prov = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "geo", "provinces.geo.json"), "utf8"));
const dist = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "geo", "districts.geo.json"), "utf8"));
const geomByCode = new Map();
for (const f of [...prov.features, ...dist.features]) geomByCode.set(f.properties.code, f.geometry);

async function post(rows) {
  const res = await fetch(`${url}/rest/v1/regions`, {
    method: "POST",
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
}

(async () => {
  // provinces first (FK parent_code -> regions.code)
  const ordered = [...regions.filter((r) => r.type === "province"), ...regions.filter((r) => r.type !== "province")];
  const rows = ordered.map((r) => ({
    code: r.code, name: r.name, type: r.type,
    parent_code: r.parent_code, province_code: r.province_code,
    geometry: geomByCode.get(r.code) || null,
    centroid_lat: r.centroid_lat, centroid_lng: r.centroid_lng,
    updated_at: new Date().toISOString(),
  }));
  const BATCH = 25; // geometry payloads are big
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    await post(rows.slice(i, i + BATCH));
    done += Math.min(BATCH, rows.length - i);
    process.stdout.write(`\rregions upserted: ${done}/${rows.length}`);
  }
  console.log("\ndone");
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
