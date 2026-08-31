// Data access layer: Supabase when configured, local JSON snapshots otherwise.
// Both paths serve REAL DJPK data only — never fabricated values (§37).
import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Region, ApbdRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

let regionCache: Region[] | null = null;

export async function getRegions(): Promise<Region[]> {
  if (regionCache) return regionCache;
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb
      .from("regions")
      .select("code,name,type,parent_code,province_code,centroid_lat,centroid_lng")
      .order("code");
    if (!error && data) {
      regionCache = data as Region[];
      return regionCache;
    }
    console.error("supabase regions failed, falling back to snapshot:", error?.message);
  }
  const rows = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "regions.json"), "utf8")) as Region[];
  regionCache = rows;
  return rows;
}

export async function getYears(): Promise<number[]> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb.from("apbd_records").select("year").not("year", "is", null);
    if (!error && data?.length) return [...new Set(data.map((r: { year: number }) => r.year))].sort((a, b) => b - a);
  }
  const years: number[] = [];
  if (fs.existsSync(DATA_DIR)) {
    for (const f of fs.readdirSync(DATA_DIR)) {
      const m = f.match(/^apbd-(\d{4})\.json$/);
      if (m) years.push(Number(m[1]));
    }
  }
  return years.sort((a, b) => b - a);
}

const apbdCache = new Map<number, ApbdRecord[]>();

export async function getApbdForYear(year: number): Promise<ApbdRecord[]> {
  if (apbdCache.has(year)) return apbdCache.get(year)!;
  let recs: ApbdRecord[] = [];
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb
      .from("apbd_records")
      .select("region_id,year,account_code,account_name,account_group,parent_account_code,level,budget,realization,realization_percentage,source_url,source_name,source_updated_at,source_note")
      .eq("year", year);
    if (!error && data) recs = data as ApbdRecord[];
  } else {
    const fp = path.join(DATA_DIR, `apbd-${year}.json`);
    if (fs.existsSync(fp)) recs = JSON.parse(fs.readFileSync(fp, "utf8"));
  }
  apbdCache.set(year, recs);
  return recs;
}

export async function getRegionDetail(code: string, year: number): Promise<ApbdRecord[]> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb
      .from("apbd_records")
      .select("region_id,year,account_code,account_name,account_group,parent_account_code,level,budget,realization,realization_percentage,source_url,source_name,source_updated_at,source_note")
      .eq("region_id", code)
      .eq("year", year);
    if (!error && data) return data as ApbdRecord[];
  }
  const all = await getApbdForYear(year);
  return all.filter((r) => r.region_id === code);
}
