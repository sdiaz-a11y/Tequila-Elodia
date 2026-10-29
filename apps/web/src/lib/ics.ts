/** Minimal iCalendar (RFC 5545) writer for a read-only subscription feed. */
export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  /** Moment in time, or a plain date (YYYY-MM-DD) for an all-day event. */
  start: string;
  allDay?: boolean;
  minutes?: number;
}

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines over 75 octets are folded with CRLF + space. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

const utc = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const day = (s: string) => s.replace(/-/g, '');

export function buildIcs(name: string, events: IcsEvent[], now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ELODIA OS//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(name)}`,
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@elodia-os`, `DTSTAMP:${utc(now)}`);
    if (e.allDay) {
      const next = new Date(`${e.start}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(
        `DTSTART;VALUE=DATE:${day(e.start)}`,
        `DTEND;VALUE=DATE:${day(next.toISOString().slice(0, 10))}`,
      );
    } else {
      const s = new Date(e.start);
      lines.push(
        `DTSTART:${utc(s)}`,
        `DTEND:${utc(new Date(s.getTime() + (e.minutes ?? 30) * 60000))}`,
      );
    }
    lines.push(`SUMMARY:${esc(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
