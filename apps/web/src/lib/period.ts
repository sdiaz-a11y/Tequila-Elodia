export const PERIODS = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'trimestre', label: 'Este trimestre' },
  { key: 'anio', label: 'Este año' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];
export const DEFAULT_PERIOD: PeriodKey = 'mes';

export function parsePeriod(value: string | null | undefined): PeriodKey {
  return PERIODS.some((p) => p.key === value) ? (value as PeriodKey) : DEFAULT_PERIOD;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Inclusive date range for a preset, in the user's local calendar. */
export function periodRange(key: PeriodKey, now: Date = new Date()): { from: Date; to: Date } {
  const today = startOfDay(now);
  switch (key) {
    case 'hoy':
      return { from: today, to: today };
    case '7d':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
        to: today,
      };
    case '30d':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29),
        to: today,
      };
    case 'mes':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    case 'trimestre':
      return {
        from: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
        to: today,
      };
    case 'anio':
      return { from: new Date(today.getFullYear(), 0, 1), to: today };
  }
}

export function formatRange({ from, to }: { from: Date; to: Date }): string {
  const day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
  const full = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (from.getTime() === to.getTime()) return full.format(to);
  return from.getFullYear() === to.getFullYear()
    ? `${day.format(from)} – ${full.format(to)}`
    : `${full.format(from)} – ${full.format(to)}`;
}
