"use client";
// URL state sync (§30): year/region/metric/filter live in the query string so
// map state is shareable.

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type UrlStatePatch = Partial<{ year: string | null; region: string | null; metric: string | null; filter: string | null }>;

export function useUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const syncUrl = useCallback(
    (patch: UrlStatePatch) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      router.replace(p.toString() ? `/?${p.toString()}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  return { syncUrl, param: (k: string) => searchParams.get(k) };
}
