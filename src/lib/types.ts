// Shared types for the app.

export type RegionType = "province" | "regency" | "city";
export type AccountGroup = "revenue" | "expenditure" | "financing";

export interface Region {
  code: string;
  name: string;
  type: RegionType;
  parent_code: string | null;
  province_code: string;
  centroid_lat: number | null;
  centroid_lng: number | null;
}

export interface ApbdRecord {
  region_id: string;
  year: number;
  account_code: string;
  account_name: string;
  account_group: AccountGroup;
  parent_account_code: string | null;
  level: number;
  budget: number | null; // rupiah, null = not available
  realization: number | null;
  realization_percentage: number | null;
  source_url: string;
  source_name: string;
  source_updated_at: string | null;
  source_note: string | null;
}

export interface MetricDef {
  id: string;
  label: string;
  // account_code suffix to match (last path segment), e.g. "belanja_daerah"
  accountSuffix: string;
  field: "budget" | "realization" | "realization_percentage";
  unit: "rupiah" | "percent";
}

export const METRICS: MetricDef[] = [
  { id: "belanja", label: "Total Belanja", accountSuffix: "belanja_daerah", field: "budget", unit: "rupiah" },
  { id: "pendapatan", label: "Total Pendapatan", accountSuffix: "pendapatan_daerah", field: "budget", unit: "rupiah" },
  { id: "belanja_modal", label: "Belanja Modal", accountSuffix: "belanja_modal", field: "budget", unit: "rupiah" },
  { id: "belanja_pegawai", label: "Belanja Pegawai", accountSuffix: "belanja_pegawai", field: "budget", unit: "rupiah" },
  { id: "belanja_bj", label: "Belanja Barang & Jasa", accountSuffix: "belanja_barang_dan_jasa", field: "budget", unit: "rupiah" },
  { id: "realisasi_belanja", label: "Realisasi Belanja", accountSuffix: "belanja_daerah", field: "realization", unit: "rupiah" },
  { id: "realisasi_pct", label: "Realisasi %", accountSuffix: "belanja_daerah", field: "realization_percentage", unit: "percent" },
];

export const FILTERS: { id: string; label: string; metric: string }[] = [
  { id: "semua", label: "Semua", metric: "belanja" },
  { id: "apbd_terbesar", label: "APBD Terbesar", metric: "belanja" },
  { id: "belanja_terbesar", label: "Belanja Terbesar", metric: "belanja" },
  { id: "realisasi_tertinggi", label: "Realisasi Tertinggi", metric: "realisasi_pct" },
  { id: "modal_terbesar", label: "Belanja Modal Terbesar", metric: "belanja_modal" },
  { id: "pegawai_terbesar", label: "Belanja Pegawai Terbesar", metric: "belanja_pegawai" },
];
