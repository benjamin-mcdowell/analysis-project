export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function roundToCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function aggregateStats(values: number[]) {
  const nonZeroValues = values.filter((value) => value > 0);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const avg = nonZeroValues.length
    ? nonZeroValues.reduce((sum, value) => sum + value, 0) / nonZeroValues.length
    : 0;
  return { min: roundToCents(min), max: roundToCents(max), avg: roundToCents(avg) };
}
