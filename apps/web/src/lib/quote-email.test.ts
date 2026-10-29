import { describe, expect, it } from 'vitest';
import { quoteEmailHtml } from './quote-email';

describe('quoteEmailHtml', () => {
  const base = {
    number: 'COT-00001',
    accountName: 'Bar <b>Luna</b>',
    validUntil: '2026-12-01',
    currency: 'MXN',
    subtotal: 1000,
    discount_total: 100,
    tax_total: 144,
    total: 1044,
    notes: null,
    lines: [
      {
        description: 'Elodia "Blanco" <script>',
        quantity: 2,
        unit_price: 500,
        discount_pct: 10,
        line_total: 900,
      },
    ],
  };
  it('escapes every user-provided value', () => {
    const html = quoteEmailHtml(base, 'Hola <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('Bar &lt;b&gt;Luna&lt;/b&gt;');
    expect(html).toContain('Elodia &quot;Blanco&quot; &lt;script&gt;');
  });
  it('shows the totals and the discount only when there is one', () => {
    const html = quoteEmailHtml(base, '');
    expect(html).toContain('COT-00001');
    expect(html).toContain('Descuento');
    expect(quoteEmailHtml({ ...base, discount_total: 0 }, '')).not.toContain('Descuento');
  });
});
