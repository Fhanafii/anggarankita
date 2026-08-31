"use client";
// MapLibre choropleth component: thin React wrapper around the imperative
// map controller (src/lib/map/*). Province + regency/city layers,
// click-to-select, dynamic color scale per metric (§20-§22, §46).

import { useCallback, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { hideBasemapLabels, isFatalMapError, syncMap, type MapData } from "@/lib/map/controller";
import { CLICKABLE_LAYERS, MAP_CENTER, MAP_ZOOM, resolveStyleUrl } from "@/lib/map/style";
import type { MetricUnit } from "@/lib/map/colors";
import type { FeatureCollection } from "@/lib/map/geo";

interface Props {
  provinceData: FeatureCollection;
  districtData: FeatureCollection | null;
  values: Record<string, number | null>;
  unit: MetricUnit;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onError?: (msg: string) => void;
  focus: { center: [number, number]; zoom: number; key: number } | null;
}

export default function ApbdMap({ provinceData, districtData, values, unit, selectedCode, onSelect, onError, focus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Latest props/callbacks in refs so the one-time init effect can use them.
  const dataRef = useRef<MapData>({ provinceData, districtData, values, unit, selectedCode });
  const onSelectRef = useRef(onSelect);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    dataRef.current = { provinceData, districtData, values, unit, selectedCode };
    onSelectRef.current = onSelect;
    onErrorRef.current = onError;
  });

  const sync = useCallback(() => {
    const map = mapRef.current;
    if (!map || syncMap(map, dataRef.current)) return;
    const retry = () => { if (!syncMap(map, dataRef.current)) map.once("styledata", retry); };
    map.once("styledata", retry);
  }, []);

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: el,
        style: resolveStyleUrl(),
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        minZoom: 3,
        maxZoom: 12,
        attributionControl: { compact: true },
      });
    } catch (e) {
      console.error("[map] init failed", e);
      onErrorRef.current?.(String(e));
      return;
    }
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("error", (e) => {
      const msg = String(e.error?.message || e.toString?.() || "map error");
      if (isFatalMapError(msg)) {
        console.error("[map]", msg);
        onErrorRef.current?.(msg);
      } else {
        console.warn("[map]", msg);
      }
    });
    map.on("load", () => {
      try { map.resize(); } catch { /* ignore */ }
      hideBasemapLabels(map);
      map.on("styledata", () => hideBasemapLabels(map));
      for (const layer of CLICKABLE_LAYERS) {
        map.on("click", layer, (e: maplibregl.MapLayerMouseEvent) => {
          const code = e.features?.[0]?.properties?.code as string | undefined;
          if (code) onSelectRef.current(code);
        });
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
      sync();
    });

    // Guard: if the container had 0 size at creation (layout/font timing),
    // MapLibre keeps a 0x0 canvas forever -> controls visible, map blank.
    const ro = new ResizeObserver(() => { try { map.resize(); } catch { /* ignore */ } });
    ro.observe(el);
    const t = setTimeout(() => { try { map.resize(); } catch { /* ignore */ } }, 300);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [sync]);

  // Data updates.
  useEffect(() => { sync(); }, [sync, provinceData, districtData, values, unit, selectedCode]);

  // Camera focus (search / drill-down).
  useEffect(() => {
    const map = mapRef.current;
    if (map && focus) map.easeTo({ center: focus.center, zoom: focus.zoom, duration: 900 });
  }, [focus]);

  // NOTE: maplibre-gl.css forces `position: relative` on the container
  // (.maplibregl-map), which would defeat `absolute inset-0` and collapse the
  // height to 0. Wrap it: outer div handles positioning, inner fills it.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full bg-sky-100" role="application" aria-label="Peta APBD Indonesia" />
    </div>
  );
}
