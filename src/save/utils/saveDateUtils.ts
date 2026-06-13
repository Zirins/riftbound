// src/save/utils/saveDateUtils.ts
// Shared date/week helpers for V2 save defaults, resets, and migration.

/** UTC date string — legacy V1.1 helpers still use this in a few places. */
export function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Local calendar date — YYYY-MM-DD at device local midnight boundary. */
export function getLocalDateKey(now = new Date()): string {
  const local = startOfLocalDay(now);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Monday-start ISO-style week key from local calendar — e.g. 2026-W24. */
export function getLocalWeekKey(now = new Date()): string {
  const date = startOfLocalDay(now);
  const dayNum = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - dayNum);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** @deprecated Use getLocalWeekKey — kept for migration defaults written before Phase 4. */
export function getIsoWeekKey(timestamp = Date.now()): string {
  return getLocalWeekKey(new Date(timestamp));
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getSeasonDay(seasonStartDate: string, now = new Date()): number {
  const start = parseLocalDateKey(seasonStartDate);
  const current = startOfLocalDay(now);
  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

export function isSeasonExpired(seasonEndDate: string, now = new Date()): boolean {
  const end = parseLocalDateKey(seasonEndDate);
  const current = startOfLocalDay(now);
  return current.getTime() > end.getTime();
}
