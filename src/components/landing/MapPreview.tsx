"use client";
// Lightweight interactive map preview for the landing hero (§8, §25):
// provinces layer only, hover shows region + APBD, click goes to /explore.
// Lazy-loaded by the parent so the landing page stays light.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { colorScaleFor } from "@/lib/map/colors";
import { paintFeatures, type FeatureCollection } from "@/lib/map/geo";
import { MAP_CENTER, MAP_ZOOM, resolveStyleUrl } from "@/lib/map/style";
import { hideBasemapLabels } from "@/lib/map/controller";

interface Hover {
  name: string;
  value: number | null;
  x: number;
  y: number;
}

function fmt(v: number | null): string {
  if (v === null) return "Data belum tersedia";
  if (v >= 1e12) return `Rp ${(v / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (v >= 1e9) return `Rp ${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}

export default function MapPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let map: maplibregl.Map | null = null;
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    Promise.all([
      fetch("/geo/provinces.geo.json").then((r) => r.json()),
      fetch("/api/map?metric=belanja").then((r) => r.json()),
    ])
      .then(([geo, api]: [FeatureCollection, { year: number; values: Record<string, number | null> }]) => {
        if (cancelled || !containerRef.current) return;
        const values = api.values || {};
        const colorer = colorScaleFor(Object.values(values).filter((v): v is number => v !== null), "rupiah");
        const painted = paintFeatures(geo, values, colorer);

        map = new maplibregl.Map({
          container: el,
          style: resolveStyleUrl(),
          center: MAP_CENTER,
          zoom: MAP_ZOOM - 0.2,
          minZoom: 3,
          maxZoom: 8,
          interactive: false, // hover/click handled manually; no pan/zoom on landing
          attributionControl: false,
        });
        const m = map;
        m.on("load", () => {
          hideBasemapLabels(m);
          m.addSource("provinces", { type: "geojson", data: painted as never });
          m.addLayer({ id: "provinces-fill", type: "fill", source: "provinces", paint: { "fill-color": ["get", "color"], "fill-opacity": 1 } });
          m.addLayer({ id: "provinces-line", type: "line", source: "provinces", paint: { "line-color": "#ffffff", "line-width": 1 } });

          const onMove = (e: maplibregl.MapMouseEvent) => {
            const f = m.queryRenderedFeatures(e.point, { layers: ["provinces-fill"] })[0];
            if (f) {
              const rect = el.getBoundingClientRect();
              setHover({
                name: String(f.properties?.name ?? ""),
                value: values[String(f.properties?.code)] ?? null,
                x: e.point.x + rect.left,
                y: e.point.y + rect.top,
              });
              el.style.cursor = "pointer";
            } else {
              setHover(null);
              el.style.cursor = "";
            }
          };
          const onClick = (e: maplibregl.MapMouseEvent) => {
            const f = m.queryRenderedFeatures(e.point, { layers: ["provinces-fill"] })[0];
            const code = f?.properties?.code as string | undefined;
            if (code) router.push(`/explore?year=${api.year}&region=${encodeURIComponent(code)}&metric=belanja`);
          };
          m.on("mousemove", onMove);
          m.on("click", onClick);
          m.on("mouseleave", () => setHover(null));
          cleanups.push(() => m.off("mousemove", onMove));
          cleanups.push(() => m.off("click", onClick));
        });
        const ro = new ResizeObserver(() => { try { m.resize(); } catch { /* ignore */ } });
        ro.observe(el);
        cleanups.push(() => ro.disconnect());
        cleanups.push(() => m.remove());
      })
      .catch(() => { /* preview is decorative; explorer remains available */ });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  return (
    <div className="relative">
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-sky-100 shadow-inner sm:h-[420px]"
          role="img"
          aria-label="Pratinjau peta choropleth APBD provinsi Indonesia. Klik provinsi untuk membukanya di APBD Explorer."
        />
        {/* bottom fade so the crop reads as intentional */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-white/90 to-transparent" />
      </div>
      {/* CTA overlay */}
      <a
        href="/explore"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500/90 px-5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition-colors hover:bg-sky-600"
      >
        Buka peta penuh →
      </a>
      {hover && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <span className="font-semibold">{hover.name}</span>
          <span className="mx-1.5 text-slate-400">·</span>
          <span className="tabular-nums">{fmt(hover.value)}</span>
        </div>
      )}
    </div>
  );
}
