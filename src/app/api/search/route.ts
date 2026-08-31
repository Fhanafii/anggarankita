import { NextRequest } from "next/server";
import { getRegions } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/search?q=bandung — region search by name (§17)
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return Response.json({ results: [] });
  const regions = await getRegions();
  const provinces = new Map(regions.filter((r) => r.type === "province").map((r) => [r.province_code, r.name]));
  const words = q.split(/\s+/);
  const scored = regions
    .map((r) => {
      const n = r.name.toLowerCase();
      let score = 0;
      if (n.startsWith(q)) score = 100;
      else if (n.includes(q)) score = 60;
      else if (words.every((w) => n.includes(w))) score = 30;
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name))
    .slice(0, 12)
    .map(({ r, score }) => ({
      code: r.code,
      name: r.name,
      type: r.type,
      province: provinces.get(r.province_code) || null,
      centroid: r.centroid_lat !== null && r.centroid_lng !== null ? [r.centroid_lng, r.centroid_lat] : null,
      score,
    }));
  return Response.json({ results: scored });
}
