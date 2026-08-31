import { NextRequest } from "next/server";
import { getRegionDetail, getYears } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/apbd/[regionCode]?year=2026 — full account tree for one region/year
export async function GET(req: NextRequest, { params }: { params: Promise<{ regionCode: string }> }) {
  const { regionCode } = await params;
  const years = await getYears();
  const year = Number(req.nextUrl.searchParams.get("year")) || years[0] || 2026;
  const code = decodeURIComponent(regionCode);
  const records = await getRegionDetail(code, year);
  const meta = records[0]
    ? { source_name: records[0].source_name, source_url: records[0].source_url, source_updated_at: records[0].source_updated_at, source_note: records[0].source_note }
    : null;
  return Response.json({ region: code, year, count: records.length, records, meta });
}
