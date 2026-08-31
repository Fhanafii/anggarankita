// Choropleth color scales (§21, §46): one scale per metric unit, never reused
// across unrelated metrics.

export const CHOROPLETH_COLORS = ["#eef4fb", "#cfe0f3", "#a3c4e8", "#6b9fd6", "#3d78bd", "#1f5496", "#123a6e"];
export const NO_DATA_COLOR = "#e5e7eb";

export type MetricUnit = "rupiah" | "percent";

/**
 * Build a value->color function.
 * - percent: linear 0..max(100, max)
 * - rupiah: log10 scale over the observed min..max (heavy-tailed amounts)
 */
export function colorScaleFor(values: number[], unit: MetricUnit): (v: number | null) => string {
  if (!values.length) return () => NO_DATA_COLOR;
  const steps = CHOROPLETH_COLORS.length;
  const pick = (t: number) => CHOROPLETH_COLORS[Math.min(steps - 1, Math.floor(t * steps))];

  if (unit === "percent") {
    const max = Math.max(100, ...values);
    return (v) => (v === null ? NO_DATA_COLOR : pick(v / max));
  }
  const logs = values.map((v) => Math.log10(Math.max(1, v)));
  const min = Math.min(...logs);
  const max = Math.max(...logs);
  return (v) => {
    if (v === null) return NO_DATA_COLOR;
    const t = max === min ? 0.5 : (Math.log10(Math.max(1, v)) - min) / (max - min);
    return pick(t);
  };
}
