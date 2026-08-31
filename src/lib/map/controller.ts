// Imperative MapLibre controller: keeps sources/layers in sync with React
// data. Extracted from the component so the component stays declarative.
//
// Race-safe by design: sync() may be called before the style finishes loading
// (MapLibre v5 keeps isStyleLoaded() false for remote styles), so every
// addSource/addLayer failure is retried on the next "styledata" event.

import type { LayerSpecification, Map as MLMap, GeoJSONSource, GeoJSONSourceSpecification } from "maplibre-gl";
import { colorScaleFor, type MetricUnit } from "./colors";
import { labelPoints, paintFeatures, type FeatureCollection } from "./geo";
import { APP_LABEL_LAYERS, appLayers, SOURCES } from "./style";

export interface MapData {
  provinceData: FeatureCollection;
  districtData: FeatureCollection | null;
  values: Record<string, number | null>;
  unit: MetricUnit;
  selectedCode: string | null;
}

/** Ensure a GeoJSON source exists and holds `data`. Returns false if the
 * style isn't ready yet (caller should retry on styledata). */
function ensureSource(map: MLMap, id: string, data: FeatureCollection): boolean {
  const existing = map.getSource(id) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data as unknown as GeoJSON.GeoJSON);
    return true;
  }
  try {
    const spec: GeoJSONSourceSpecification = { type: "geojson", data: data as unknown as GeoJSON.GeoJSON };
    map.addSource(id, spec);
    return true;
  } catch {
    return false; // style not ready
  }
}

function addLayerIfReady(map: MLMap, layer: LayerSpecification): boolean {
  if (map.getLayer(layer.id)) return true;
  if ("source" in layer && !map.getSource(layer.source)) return false;
  try {
    map.addLayer(layer);
    return true;
  } catch {
    return false;
  }
}

/** Push current data into the map: sources, layers, z-order, selection. */
export function syncMap(map: MLMap, data: MapData): boolean {
  const { provinceData, districtData, values, unit, selectedCode } = data;
  const colorer = colorScaleFor(Object.values(values).filter((v): v is number => v !== null), unit);

  const provPainted = paintFeatures(provinceData, values, colorer);
  const distPainted = districtData ? paintFeatures(districtData, values, colorer) : null;

  let ok = ensureSource(map, SOURCES.provinces, provPainted);
  ok = ensureSource(map, SOURCES.provinceLabels, labelPoints(provPainted, "name")) && ok;
  if (distPainted) {
    ok = ensureSource(map, SOURCES.districts, distPainted) && ok;
    ok = ensureSource(map, SOURCES.districtLabels, labelPoints(distPainted, "short")) && ok;
  }
  if (!ok) return false;

  for (const layer of appLayers()) {
    if (!addLayerIfReady(map, layer)) return false;
  }

  // fills below labels/highlight
  const anchor = map.getLayer("provinces-label") ? "provinces-label" : undefined;
  if (anchor) {
    for (const id of ["provinces-fill", "provinces-line", "districts-fill", "districts-line"]) {
      if (map.getLayer(id)) map.moveLayer(id, anchor);
    }
  }

  const isProvince = selectedCode?.endsWith(".00");
  map.setFilter("highlight", ["==", ["get", "code"], isProvince ? selectedCode || "" : ""]);
  map.setFilter("highlight-d", ["==", ["get", "code"], selectedCode && !isProvince ? selectedCode : ""]);
  return true;
}

/** Hide basemap's own place-name labels so only our labels show (§ map-first
 * UI): blanking text-field is cheaper and safer than removing layers. */
export function hideBasemapLabels(map: MLMap): void {
  for (const l of map.getStyle()?.layers || []) {
    if (l.type !== "symbol" || APP_LABEL_LAYERS.has(l.id)) continue;
    if (map.getLayoutProperty(l.id, "text-field") !== "") {
      try {
        map.setLayoutProperty(l.id, "text-field", "");
      } catch {
        /* layer may not support it */
      }
    }
  }
}

/** Fatal vs transient MapLibre errors: only style/glyph/WebGL failures should
 * surface the "Peta tidak dapat dimuat" UI. */
export function isFatalMapError(msg: string): boolean {
  if (/cannot be moved|does not exist in the map's style/i.test(msg)) return false;
  return /Failed to load|could not load|glyphs|WebGL|style data|parse/i.test(msg);
}
