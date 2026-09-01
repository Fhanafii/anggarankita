// Choropleth color scales (§21, §46): one scale per metric unit, never reused
// across unrelated metrics.

export const CHOROPLETH_COLORS = ["#eff5fe", "#dce8fd", "#b9d1fb", "#7fa8f7", "#4287f5", "#155eef", "#0c40a3"];
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
