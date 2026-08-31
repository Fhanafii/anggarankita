// DJPK SIKD APBD ingestion (requirement §31-§38).
// Fetches the POSTUR APBD HTML table per region/year, parses the account
// hierarchy from text-indent levels, converts "NN.NNN,NN M" -> BIGINT rupiah,
// assigns account groups, preserves source metadata, and upserts into
// Supabase when configured (otherwise writes data/apbd-<year>.json).
//
// Usage: node --experimental-strip-types scripts/import-djpk-apbd.ts [years...]
//   e.g. node scripts/import-djpk-apbd.ts 2024 2025 2026
import fs from "fs";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";
// Load .env.local / .env (Node >=20.6 supports --env-file; run via npm scripts below)
// Node 24 happy-eyeballs stalls against djpk.kemenkeu.go.id on this host
net.setDefaultAutoSelectFamily?.(false);

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://djpk.kemenkeu.go.id/portal";
const UA = { "User-Agent": "Mozilla/5.0 (APBD-Tracker ingestion)" };
// (source URL is built per-region below)
const SOURCE_NAME = "DJPK SIKD";
const YEARS = (process.argv.length > 2 ? process.argv.slice(2) : ["2024", "2025", "2026"]).map(Number);

type AccountGroup = "revenue" | "expenditure" | "financing";

interface ApbdRecord {
  region_id: string; // DJPK code "PP.DD"
  year: number;
  account_code: string; // deterministic path slug
  account_name: string; // original source name
  account_group: AccountGroup;
  parent_account_code: string | null;
  level: number;
  budget: number | null; // rupiah (BIGINT)
  realization: number | null; // rupiah
  realization_percentage: number | null;
  source_url: string;
  source_name: string;
  source_updated_at: string | null; // from "data diterima SIKD per ..."
  source_note: string | null; // full keterangan line
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getText(url: string, tries = 4): Promise<string> {
  for (let a = 1; ; a++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (a >= tries) throw e;
      await sleep(a * 2000);
    }
  }
}

// "27.230,14 M" -> 27230140000 ; "-" / "" / "n/a" -> null
function parseMillions(raw: string): number | null {
  const t = raw.replace(/&nbsp;/g, " ").replace(/\s*M\s*$/i, "").trim();
  if (!t || t === "-" || /n\/?a/i.test(t)) return null;
  const grouped = /^-?\d{1,3}(?:\.\d{3})*,\d+$/.test(t);
  const numStr = grouped
    ? t.replace(/\./g, "").replace(",", ".")
    : t.replace(/[^\d,.-]/g, "").replace(",", ".");
  const v = Number(numStr);
  if (!Number.isFinite(v)) return null; // invalid parsing -> null, logged by caller
  return Math.round(v * 1e6); // DJPK displays million Rupiah
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

interface Row { level: number; name: string; budget: number | null; realization: number | null; pct: number | null; rawBudget: string; rawReal: string; }

function parsePosturTable(html: string): { rows: Row[]; keterangan: string | null; wilayah: string | null } {
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  const rows: Row[] = [];
  if (tbody) {
    // DJPK closes rows with malformed <tr/> — split on <tr instead.
    const chunks = tbody[1].split(/<tr(?=[\s>])/).slice(1);
    for (const inner0 of chunks) {
      const inner = inner0.replace(/<\/?tr\/?>/g, "");
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const tds: { style: string; text: string }[] = [];
      let td;
      while ((td = tdRe.exec(inner))) {
        tds.push({ style: td[0], text: td[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() });
      }
      if (tds.length < 5) continue;
      const indent = tds[1].style.match(/text-indent:\s*([\d.]+)em/);
      const level = indent ? Math.round(parseFloat(indent[1]) / 2) : 0;
      const name = tds[1].text.replace(/\s+/g, " ").trim();
      if (!name) continue;
      const budget = parseMillions(tds[2].text);
      const realization = parseMillions(tds[3].text);
      const pct = Number(tds[4].text.replace(",", "."));
      rows.push({ level, name, budget, realization, pct: Number.isFinite(pct) ? pct : null, rawBudget: tds[2].text, rawReal: tds[3].text });
    }
  }
  const ket = html.match(/id="keterangan"[^>]*>([\s\S]*?)<\/label>/);
  const wil = html.match(/id="wilayah"[^>]*>([\s\S]*?)<\/label>/);
  return {
    rows,
    keterangan: ket ? ket[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : null,
    wilayah: wil ? wil[1].trim() : null,
  };
}

function groupFor(topName: string): AccountGroup | null {
  const n = slug(topName);
  if (n.startsWith("pendapatan")) return "revenue";
  if (n.startsWith("belanja")) return "expenditure";
  if (n.startsWith("pembiayaan")) return "financing";
  return null;
}

function toRecords(regionId: string, year: number, rows: Row[], url: string, keterangan: string | null): ApbdRecord[] {
  const out: ApbdRecord[] = [];
  const stack: { level: number; code: string }[] = [];
  let currentGroup: AccountGroup | null = null;
  const seen = new Map<string, number>();
  const updatedMatch = keterangan?.match(/diterima\s+SIKD\s+per\s+(.+?)$/i);
  const sourceUpdatedAt = updatedMatch ? updatedMatch[1].trim() : null;

  for (const r of rows) {
    while (stack.length && stack[stack.length - 1].level >= r.level) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].code : null;
    if (r.level === 0) currentGroup = groupFor(r.name);
    let code = `${parent ? parent + "/" : ""}${slug(r.name)}`;
    // duplicate name under same parent (e.g. repeated Belanja Pegawai rows):
    // keep first occurrence, skip exact duplicate values
    const dupN = seen.get(code) || 0;
    seen.set(code, dupN + 1);
    if (dupN > 0) code = `${code}__${dupN + 1}`;
    stack.push({ level: r.level, code });
    if (!currentGroup) continue; // unknown top-level section: skip, do not fabricate group
    out.push({
      region_id: regionId,
      year,
      account_code: code,
      account_name: r.name,
      account_group: currentGroup,
      parent_account_code: parent,
      level: r.level,
      budget: r.budget,
      realization: r.realization,
      realization_percentage: r.pct,
      source_url: url,
      source_name: SOURCE_NAME,
      source_updated_at: sourceUpdatedAt,
      source_note: keterangan,
    });
  }
  return out;
}

async function main() {
  const regions = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "regions.json"), "utf8")) as {
    code: string; djpk: { provinsi: string; pemda: string }; name: string; type: string;
  }[];

  let supabase: any = null;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    console.log("Supabase configured -> upsert mode");
    // apbd_records has FK to regions; ensure regions are loaded first.
    const { count } = await supabase.from("regions").select("code", { count: "exact", head: true });
    if (!count) {
      console.error("regions table is EMPTY — run `npm run import:regions` first (apbd_records FK depends on it). Aborting.");
      process.exit(1);
    }
  } else {
    console.log("Supabase not configured -> writing JSON files (data/apbd-<year>.json)");
  }

  const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0, accounts: 0, regionsOk: 0 };
  const errors: string[] = [];

  for (const year of YEARS) {
    const allRecords: ApbdRecord[] = [];
    let i = 0;
    const CONC = 6;
    async function worker() {
      while (i < regions.length) {
        const reg = regions[i++];
        const url = `${BASE}/data/apbd?tahun=${year}&provinsi=${reg.djpk.provinsi}&pemda=${reg.djpk.pemda}`;
        try {
          const html = await getText(url);
          const { rows, keterangan } = parsePosturTable(html);
          if (!rows.length) {
            stats.skipped++;
            errors.push(`NO_ROWS ${reg.code} ${year}`);
            continue;
          }
          const recs = toRecords(reg.code, year, rows, url, keterangan);
          for (const r of recs) {
            // validation (§33): unparsable numerics are stored as null and logged,
            // legitimate negative values are kept as-is.
            if (r.budget === null || r.realization === null) {
              errors.push(`NULLVAL ${reg.code} ${year} ${r.account_code}`);
            }
            stats.accounts++;
          }
          allRecords.push(...recs);
          stats.regionsOk++;
        } catch (e: any) {
          stats.errors++;
          errors.push(`FAIL ${reg.code} ${year}: ${e.message}`);
        }
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));

    console.log(`\nDJPK APBD Import\n\nYear: ${year}\nRegions processed: ${stats.regionsOk}\nAccounts processed: ${stats.accounts}`);

    if (supabase) {
      const BATCH = 500;
      for (let b = 0; b < allRecords.length; b += BATCH) {
        const chunk = allRecords.slice(b, b + BATCH);
        const { error } = await supabase
          .from("apbd_records")
          .upsert(chunk, { onConflict: "region_id,year,account_code" });
        if (error) { stats.errors++; errors.push(`SB: ${error.message}`); }
        else stats.inserted += chunk.length;
        await sleep(150);
      }
    } else {
      const dest = path.join(ROOT, "data", `apbd-${year}.json`);
      fs.writeFileSync(dest, JSON.stringify(allRecords));
      console.log(`wrote ${dest} (${allRecords.length} records)`);
    }
  }

  console.log(`\nInserted: ${stats.inserted}\nUpdated: ${stats.updated}\nSkipped: ${stats.skipped}\nErrors: ${stats.errors}`);
  if (errors.length) {
    fs.writeFileSync(path.join(ROOT, "data", "import-errors.log"), errors.join("\n"));
    console.log(`${errors.length} errors logged to data/import-errors.log (first 10):`);
    for (const e of errors.slice(0, 10)) console.log("  !", e);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
