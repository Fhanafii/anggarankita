// Pure GeoJSON helpers for the map layer (no MapLibre imports -> testable).

export type Ring = [number, number][];
export type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] }
  | { type: "Point"; coordinates: [number, number] };

export interface GeoFeature {
  type: "Feature";
  properties: Record<string, string | number | null>;
  geometry: Geometry;
}
export interface FeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

/** Area-weighted centroid of the largest ring across a (Multi)Polygon. */
export function largestPolygonCentroid(geometry: Geometry | undefined | null): [number, number] | null {
  const rings: Ring[][] =
    geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  let best: [number, number] | null = null;
  let bestArea = 0;
  for (const poly of rings) {
    const ring = poly[0];
    let a = 0, x = 0, y = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cr = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += cr;
      x += (ring[j][0] + ring[i][0]) * cr;
      y += (ring[j][1] + ring[i][1]) * cr;
    }
    a /= 2;
    if (Math.abs(a) > bestArea) {
      bestArea = Math.abs(a);
      best = [x / (6 * a), y / (6 * a)];
    }
  }
  return best;
}

/** "Kab. Bandung" / "Kota Bandung" -> "Bandung" (compact district labels). */
export function shortRegionName(name: string): string {
  return String(name || "").replace(/^(Kab\.|Kabupaten|Kota)\s+/i, "");
}

/** Attach per-feature choropleth color + short label. */
export function paintFeatures(
  fc: FeatureCollection,
  values: Record<string, number | null>,
  colorer: (v: number | null) => string,
): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        color: colorer(values[String(f.properties.code)] ?? null),
        short: shortRegionName(String(f.properties.name ?? "")),
      },
    })),
  };
}

/** One Point feature per region at its label anchor (avoids duplicate labels
 * on multipolygon islands). */
export function labelPoints(fc: FeatureCollection, field: "name" | "short"): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => ({
      type: "Feature" as const,
      properties: { text: String(field === "short" ? f.properties.short : f.properties.name ?? "") },
      geometry: { type: "Point" as const, coordinates: largestPolygonCentroid(f.geometry) || ([0, 0] as [number, number]) },
    })),
  };
}
