"use client";
// Data-fetching hooks for the explorer: geo layers + per-year metric values.

import { useEffect, useState } from "react";
import type { FeatureCollection } from "@/lib/map/geo";
import type { MapApiResponse } from "@/lib/api";

/** Province polygons (required) + district polygons (progressive, may lag). */
export function useGeoLayers() {
  const [provinces, setProvinces] = useState<FeatureCollection | null>(null);
  const [districts, setDistricts] = useState<FeatureCollection | null>(null);
  const [provincesFailed, setProvincesFailed] = useState(false);
  const [districtsFailed, setDistrictsFailed] = useState(false);

  useEffect(() => {
    fetch("/geo/provinces.geo.json")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setProvinces)
      .catch(() => setProvincesFailed(true));
  }, []);

  useEffect(() => {
    if (districts || districtsFailed) return;
    fetch("/geo/districts.geo.json")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setDistricts)
      .catch(() => setDistrictsFailed(true));
  }, [districts, districtsFailed]);

  return { provinces, districts, provincesFailed, districtsFailed };
}

/** Choropleth values for year+metric; exposes retry. */
export function useMapValues(year: number | null, metric: string) {
  const [data, setData] = useState<MapApiResponse | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!year) return;
    let cancelled = false;
    fetch(`/api/map?year=${year}&metric=${metric}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d: MapApiResponse) => { if (!cancelled) { setData(d); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [year, metric, reload]);

  return { data, error, retry: () => setReload((n) => n + 1) };
}
