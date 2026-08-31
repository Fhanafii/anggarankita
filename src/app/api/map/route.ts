import { NextRequest } from "next/server";
import { getRegions, getYears, getApbdForYear } from "@/lib/data";
import { METRICS } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/map?year=2026&metric=belanja
// Returns per-region metric values for the choropleth + available years.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const years = await getYears();
  const year = Number(sp.get("year")) || years[0] || 2026;
  const metricId = sp.get("metric") || "belanja";
  const metric = METRICS.find((m) => m.id === metricId) || METRICS[0];

  const [regions, records] = await Promise.all([getRegions(), getApbdForYear(year)]);

  // top-level account per region for this metric (match by account_code suffix)
  const values: Record<string, number | null> = {};
  for (const r of records) {
    if (!r.account_code.endsWith(metric.accountSuffix)) continue;
    const v = r[metric.field];
    if (v !== null && v !== undefined) values[r.region_id] = v;
  }

  return Response.json({
    year,
    years,
    metric: metric.id,
    unit: metric.unit,
    values,
    regions: regions.map((g) => ({ code: g.code, name: g.name, type: g.type, province_code: g.province_code })),
  });
}
