#!/usr/bin/env node
// Fetch DJPK region lists (provinces + regencies/cities) for a set of years.
// Output: data/djpk-regions.json  { year: { provCode: { name, pemda: { code: name } } } }
const fs = require("fs");
const path = require("path");
const net = require("net");
// Workaround: Node 24 Happy-Eyeballs/IPv6 stalls against djpk.kemenkeu.go.id
net.setDefaultAutoSelectFamily?.(false);

const BASE = "https://djpk.kemenkeu.go.id/portal";
const UA = { "User-Agent": "Mozilla/5.0 (APBD-Tracker ingestion)" };
const YEARS = (process.argv[2] || "2024,2025,2026").split(",").map(Number);

async function getJson(url, tries = 3) {
  for (let a = 1; ; a++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (a >= tries) throw e;
      await new Promise((r) => setTimeout(r, a * 1500));
    }
  }
}

async function main() {
  const out = {};
  for (const year of YEARS) {
    const provinces = await getJson(`${BASE}/provinsi/${year}`);
    out[year] = {};
    const codes = Object.keys(provinces);
    let i = 0;
    async function worker() {
      while (i < codes.length) {
        const pc = codes[i++];
        try {
          const pemda = await getJson(`${BASE}/pemda/${pc}/${year}`);
          out[year][pc] = { name: provinces[pc], pemda };
          process.stdout.write(`.`);
        } catch (e) {
          console.error(`\nFAIL ${year}/${pc}: ${e.message}`);
          out[year][pc] = { name: provinces[pc], pemda: {}, error: e.message };
        }
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    const total = codes.reduce((s, pc) => s + Object.keys(out[year][pc].pemda).length, 0);
    console.log(`\nyear ${year}: ${codes.length} provinces, ${total} pemda entries`);
  }
  const dest = path.join(__dirname, "..", "data", "djpk-regions.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(out, null, 1));
  console.log("wrote", dest);
}
main().catch((e) => { console.error(e); process.exit(1); });
