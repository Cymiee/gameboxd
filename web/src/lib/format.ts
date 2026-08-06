/** Compact playtime label from minutes: "45m", "2.5h", "128h". */
export function formatPlaytime(min: number): string {
  if (min <= 0) return "0h";
  if (min < 60) return `${min}m`;
  const h = min / 60;
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
}
