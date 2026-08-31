// Presentation-time formatting (§13: store rupiah, format at display).

export function formatRupiah(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

export function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

export function formatNumber(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("id-ID");
}
