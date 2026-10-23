const TZ = 'America/Mexico_City';

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

/** `YYYY-MM-DD` (a calendar day, no zone): parsed at noon so no timezone can shift it a day. */
export function formatDay(day: string | null | undefined): string {
  if (!day) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${day.slice(0, 10)}T12:00:00`));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}

export function isOverdue(
  iso: string | null | undefined,
  doneAt: string | null | undefined,
): boolean {
  return Boolean(iso && !doneAt && new Date(iso).getTime() < Date.now());
}

/** Whole days from now until a calendar day (`YYYY-MM-DD`); negative when it already passed. */
export function daysUntil(day: string): number {
  return Math.ceil((new Date(`${day.slice(0, 10)}T12:00:00`).getTime() - Date.now()) / 86_400_000);
}

/** The calendar day (`YYYY-MM-DD`, UTC) that is `n` days from now. */
export function dayInDays(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}
