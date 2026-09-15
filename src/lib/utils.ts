/** Small shared helpers: ids, numbers, dates, formatting. */

export function uid(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Average of a list, or null when there is nothing to average. */
export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/* ---------------------------------- dates --------------------------------- */

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses YYYY-MM-DD as a local (not UTC) date so week maths never drifts. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = fromISODate(iso);
  return !Number.isNaN(d.getTime()) && toISODate(d) === iso;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(d: Date, weekStartsOn: 'mon' | 'sun' = 'mon'): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 = Sunday
  const offset = weekStartsOn === 'mon' ? (day + 6) % 7 : day;
  return addDays(date, -offset);
}

/** Whole days from `iso` until today (negative = in the past). */
export function daysUntil(iso: string): number {
  const target = fromISODate(iso).getTime();
  const now = fromISODate(todayISO()).getTime();
  return Math.round((target - now) / 86_400_000);
}

export function formatDate(iso: string): string {
  if (!isValidISODate(iso)) return '—';
  return fromISODate(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  if (!isValidISODate(iso)) return '—';
  return fromISODate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/* -------------------------------- formatting ------------------------------- */

/** 872 -> "14h 32m", 45 -> "45m", 0 -> "0m" */
export function formatMinutes(total: number): string {
  const mins = Math.max(0, Math.round(total));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatSignedMinutes(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${formatMinutes(Math.abs(delta))}`;
}

export function formatPercent(value: number | null, decimals = 0): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `${round(value, decimals)}%`;
}

/** Turns "82" / "82.5" / "" into a number or null, never NaN. */
export function parseNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}
