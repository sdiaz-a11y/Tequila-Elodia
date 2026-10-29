import { describe, expect, it } from 'vitest';
import { buildIcs } from './ics';
import { trackingUrl } from './tracking';
import { whatsappUrl } from './contact-links';

describe('whatsappUrl', () => {
  it('normalises Mexican numbers', () => {
    expect(whatsappUrl('33 1234 5678')).toBe('https://wa.me/523312345678');
    expect(whatsappUrl('+52 1 33 1234 5678')).toBe('https://wa.me/523312345678');
    expect(whatsappUrl('+52 33 1234 5678', 'Hola & gracias')).toBe(
      'https://wa.me/523312345678?text=Hola%20%26%20gracias',
    );
    expect(whatsappUrl('+1 415 555 0100')).toBe('https://wa.me/14155550100');
  });
  it('rejects what is not a phone', () => {
    expect(whatsappUrl('')).toBeNull();
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl('123')).toBeNull();
  });
});

describe('trackingUrl', () => {
  it('links the known carriers and nothing else', () => {
    expect(trackingUrl('DHL Express', '123 456')).toContain('tracking-id=123%20456');
    expect(trackingUrl('fedex', 'A1')).toContain('trknbr=A1');
    expect(trackingUrl('Estafeta', '999')).toBeNull();
    expect(trackingUrl('DHL', '')).toBeNull();
  });
});

describe('buildIcs', () => {
  const now = new Date('2026-10-29T12:00:00Z');
  it('writes timed and all-day events, escaped', () => {
    const ics = buildIcs(
      'ELODIA',
      [
        {
          uid: 'a1',
          summary: 'Llamar, a Juan; urgente',
          start: '2026-11-02T16:00:00Z',
          description: 'línea1\nlínea2',
        },
        { uid: 't1', summary: 'Tarea', start: '2026-11-30', allDay: true },
      ],
      now,
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Llamar\\, a Juan\\; urgente');
    expect(ics).toContain('DTSTART:20261102T160000Z');
    expect(ics).toContain('DTEND:20261102T163000Z');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261130');
    expect(ics).toContain('DTEND;VALUE=DATE:20261201');
    expect(ics).toContain('DESCRIPTION:línea1\\nlínea2');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('folds long lines', () => {
    const ics = buildIcs(
      'x',
      [{ uid: 'u', summary: 'a'.repeat(200), start: '2026-11-02T16:00:00Z' }],
      now,
    );
    expect(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
  });
});
