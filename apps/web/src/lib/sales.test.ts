import { describe, expect, it } from 'vitest';
import { docTotals, lineAmounts } from './sales';

describe('sales arithmetic', () => {
  it('prices a line with discount and VAT', () => {
    // 10 × $1,800 = $18,000; 10 % off = $16,200; 16 % VAT = $2,592; total $18,792
    const a = lineAmounts({ quantity: 10, unit_price: 1800, discount_pct: 10, tax_rate: 16 });
    expect(a).toEqual({ gross: 18000, discount: 1800, net: 16200, tax: 2592, total: 18792 });
  });

  it('keeps cents correct on awkward values', () => {
    const a = lineAmounts({ quantity: 3, unit_price: 33.33, discount_pct: 0, tax_rate: 16 });
    expect(a.gross).toBe(99.99);
    expect(a.tax).toBe(16);
    expect(a.total).toBe(115.99);
  });

  it('adds several lines into document totals', () => {
    const t = docTotals([
      { quantity: 2, unit_price: 1000, discount_pct: 0, tax_rate: 16 },
      { quantity: 1, unit_price: 500, discount_pct: 20, tax_rate: 0 },
    ]);
    expect(t).toEqual({ subtotal: 2500, discount: 100, tax: 320, total: 2720 });
  });

  it('is zero for an empty document and never negative', () => {
    expect(docTotals([])).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0 });
    const full = lineAmounts({ quantity: 1, unit_price: 100, discount_pct: 100, tax_rate: 16 });
    expect(full.total).toBe(0);
  });
});
