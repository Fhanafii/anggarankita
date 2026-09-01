// MapLibre style + layer definitions for the choropleth.

import type { LayerSpecification } from "maplibre-gl";

// Default basemap: OpenFreeMap "liberty" — free vector tiles, no API key, no
// watermark (CARTO public tiles now stamp "API KEY REQUIRED"). Override with
// NEXT_PUBLIC_MAP_STYLE_URL, or set NEXT_PUBLIC_MAPTILER_KEY for MapTiler.
export function resolveStyleUrl(): string {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (custom) return custom;
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (maptilerKey) {
    return "https://api.maptiler.com/maps/bright-v4/style.json?key=" + encodeURIComponent(maptilerKey);
  }
  return "https://tiles.openfreemap.org/styles/liberty";
}

export const MAP_CENTER: [number, number] = [113.5, -2.5];
export const MAP_ZOOM = 4.4;

export const SOURCES = {
  provinces: "provinces",
  districts: "districts",
  provinceLabels: "provinces-labels",
  districtLabels: "districts-labels",
} as const;

const LABEL_FONT = ["Noto Sans Regular"];

/** All app layers, in paint order (fills first, labels/highlight on top). */
export function appLayers(): LayerSpecification[] {
  return [
    { id: "provinces-fill", type: "fill", source: SOURCES.provinces, paint: { "fill-color": ["get", "color"], "fill-opacity": 1 } },
    { id: "provinces-line", type: "line", source: SOURCES.provinces, paint: { "line-color": "#ffffff", "line-width": 1 } },
    { id: "districts-fill", type: "fill", source: SOURCES.districts, minzoom: 5.5, paint: { "fill-color": ["get", "color"], "fill-opacity": 1 } },
    { id: "districts-line", type: "line", source: SOURCES.districts, minzoom: 5.5, paint: { "line-color": "#ffffff", "line-width": 0.8 } },
    {
      id: "provinces-label", type: "symbol", source: SOURCES.provinceLabels, minzoom: 4,
      layout: { "text-field": ["get", "text"], "text-size": 11, "text-font": LABEL_FONT, "text-allow-overlap": false },
      paint: { "text-color": "#172033", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    },
    {
      id: "districts-label", type: "symbol", source: SOURCES.districtLabels, minzoom: 6.5,
      layout: { "text-field": ["get", "text"], "text-size": 10, "text-font": LABEL_FONT, "text-allow-overlap": false },
      paint: { "text-color": "#3b465c", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
    },
    { id: "highlight", type: "line", source: SOURCES.provinces, paint: { "line-color": "#172033", "line-width": 2.5 }, filter: ["==", ["get", "code"], ""] },
    { id: "highlight-d", type: "line", source: SOURCES.districts, minzoom: 5.5, paint: { "line-color": "#172033", "line-width": 2.5 }, filter: ["==", ["get", "code"], ""] },
  ];
}

/** Layers whose click/hover selects a region. */
export const CLICKABLE_LAYERS = ["provinces-fill", "districts-fill"];

/** Our own label layers (everything else with a symbol layer is basemap noise). */
export const APP_LABEL_LAYERS = new Set(["provinces-label", "districts-label"]);
