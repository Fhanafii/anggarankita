"use client";
// Main map-first explorer: composes search + filters + year/metric controls +
// choropleth + detail panel, all synced with URL state (§16, §19-§22, §27,
// §29, §30). Data fetching lives in hooks (lib/hooks), map rendering in
// components/ApbdMap + lib/map/*.

import { useCallback, useMemo, useRef, useState } from "react";
import ApbdMap from "./ApbdMap";
import SearchBar, { type SearchResult } from "./SearchBar";
import RegionPanel from "./RegionPanel";
import FilterChips from "./FilterChips";
import MapControls from "./MapControls";
import { METRICS, FILTERS } from "@/lib/types";
import { useGeoLayers, useMapValues } from "@/lib/hooks/useMapData";
import { useUrlState } from "@/lib/hooks/useUrlState";
import { largestPolygonCentroid } from "@/lib/map/geo";

interface Props {
  initialRegion: string | null;
  initialYear: number | null;
  initialMetric: string | null;
}

export default function Explorer({ initialRegion, initialYear, initialMetric }: Props) {
  const { syncUrl, param } = useUrlState();

  const { provinces, districts, provincesFailed, districtsFailed } = useGeoLayers();
  const [year, setYear] = useState<number | null>(initialYear);
  const [metric, setMetric] = useState(
    initialMetric && METRICS.some((m) => m.id === initialMetric) ? initialMetric : "belanja",
  );
  const { data: mapData, error: mapError, retry } = useMapValues(year, metric);

  const [filter, setFilter] = useState(param("filter") || "semua");
  const [selected, setSelected] = useState<string | null>(initialRegion);
  const [focus, setFocus] = useState<{ center: [number, number]; zoom: number; key: number } | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const focusKey = useRef(0);

  // Default year from the dataset when the URL doesn't carry one (§27).
  const activeYear = year ?? mapData?.years?.[0] ?? null;

  const regionByCode = useMemo(() => new Map((mapData?.regions || []).map((r) => [r.code, r])), [mapData]);
  const selectedName = selected ? regionByCode.get(selected)?.name || selected : null;
  const selectedType = selected ? regionByCode.get(selected)?.type || null : null;

  const selectRegion = useCallback(
    (code: string) => {
      setSelected(code);
      syncUrl({ region: code });
      const feat = provinces?.features.find((f) => f.properties.code === code) || districts?.features.find((f) => f.properties.code === code);
      const c = feat && largestPolygonCentroid(feat.geometry);
      if (c) setFocus({ center: c, zoom: code.endsWith(".00") ? 6 : 7.5, key: ++focusKey.current });
    },
    [provinces, districts, syncUrl],
  );

  const applyFilter = (id: string) => {
    setFilter(id);
    syncUrl({ filter: id === "semua" ? null : id });
    const f = FILTERS.find((x) => x.id === id);
    if (f && f.metric !== metric) setMetric(f.metric);
  };

  const changeYear = (y: number) => { setYear(y); syncUrl({ year: String(y) }); };
  const changeMetric = (m: string) => { setMetric(m); syncUrl({ metric: m }); };

  const activeMetric = METRICS.find((m) => m.id === metric) || METRICS[0];
  const legend = useMemo(() => {
    const vals = Object.values(mapData?.values || {}).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [mapData]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {provinces ? (
        <>
          <ApbdMap
            provinceData={provinces}
            districtData={districts}
            values={mapData?.values || {}}
            unit={mapData?.unit || "rupiah"}
            selectedCode={selected}
            onSelect={selectRegion}
            onError={() => setMapFailed(true)}
            focus={focus}
          />
          {mapFailed && (
            <div className="absolute inset-0 z-[5] flex items-center justify-center bg-sky-50/90">
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-lg">
                <p className="text-sm font-semibold text-slate-800">Peta tidak dapat dimuat.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Browser gagal menginisialisasi WebGL/peta. Coba refresh, nonaktifkan ad-blocker, atau perbarui driver GPU browser.
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-sky-50">
          {provincesFailed ? (
            <p className="text-sm text-slate-600">Peta tidak dapat dimuat.</p>
          ) : (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" aria-label="Memuat peta" />
          )}
        </div>
      )}

      {/* top overlay: title + search + filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 px-3 pt-3 md:pt-5">
        <h1 className="pointer-events-auto rounded-full bg-white/90 px-4 py-1 text-sm font-bold tracking-tight text-slate-900 shadow-sm backdrop-blur">
          APBD Tracker
        </h1>
        <div className="pointer-events-auto w-full max-w-md">
          <SearchBar onPick={(r: SearchResult) => selectRegion(r.code)} />
        </div>
        <FilterChips active={filter} onPick={applyFilter} />
      </div>

      {/* bottom-left controls: year + metric + legend */}
      <div className="absolute bottom-4 left-3 z-10 md:left-4">
        {mapError && (
          <div className="pointer-events-auto mb-2 rounded-xl border border-rose-200 bg-white/95 p-3 text-sm text-rose-700 shadow backdrop-blur">
            Gagal memuat data APBD.
            <button onClick={retry} className="ml-1 font-semibold underline">Coba lagi.</button>
          </div>
        )}
        <MapControls
          year={activeYear}
          years={mapData?.years || (activeYear ? [activeYear] : [])}
          metric={activeMetric}
          legend={legend}
          districtsLoading={!districts && !districtsFailed}
          onYear={changeYear}
          onMetric={changeMetric}
        />
      </div>

      {selected && selectedName && (
        <RegionPanel
          key={`${selected}-${activeYear || 2026}`}
          code={selected}
          name={selectedName}
          type={selectedType || "region"}
          year={activeYear || 2026}
          onClose={() => { setSelected(null); syncUrl({ region: null }); }}
        />
      )}
    </div>
  );
}
