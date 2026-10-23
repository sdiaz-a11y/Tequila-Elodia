const TZ = 'America/Mexico_City';

/** `YYYY-MM` → `{ year, month }` (month 1-12). Anything invalid falls back to the current month in Mexico City. */
export function parseMonth(
  value: string | null | undefined,
  now: Date = new Date(),
): { year: number; month: number } {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? '');
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const today = dayKey(now.toISOString());
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

export const monthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** The calendar day (`YYYY-MM-DD`) of an instant, as seen in Mexico City. */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** The 6 weeks (42 days, Monday first) that cover a month, as `YYYY-MM-DD` keys. */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, 1 - mondayOffset + i));
    return d.toISOString().slice(0, 10);
  });
}

/** Instants (UTC) that bound a list of grid days in Mexico City time (UTC-6, no daylight saving since 2022). */
export function gridRange(days: string[]): { from: string; to: string } {
  const last = new Date(`${days[days.length - 1]}T00:00:00-06:00`);
  last.setUTCDate(last.getUTCDate() + 1);
  return { from: new Date(`${days[0]}T00:00:00-06:00`).toISOString(), to: last.toISOString() };
}

export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
