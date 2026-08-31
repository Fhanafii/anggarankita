// Shared API response shapes.

export interface MapApiResponse {
  year: number;
  years: number[];
  metric: string;
  unit: "rupiah" | "percent";
  values: Record<string, number | null>;
  regions: { code: string; name: string; type: string; province_code: string }[];
}
