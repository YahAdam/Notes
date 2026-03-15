export function formatEpochDate(ms: number): string {
  return new Date(ms).toLocaleString();
}
