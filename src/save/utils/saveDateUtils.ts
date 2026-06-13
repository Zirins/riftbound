// src/save/utils/saveDateUtils.ts
// Shared date/week helpers for V2 save defaults and migration.

export function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** ISO week key — e.g. 2026-W24 */
export function getIsoWeekKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
