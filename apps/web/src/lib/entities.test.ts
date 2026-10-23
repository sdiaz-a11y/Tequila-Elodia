import { describe, expect, it } from 'vitest';
import { ENTITIES, getPath, localToIso, schemaFor } from './entities';

describe('schemaFor', () => {
  it('turns a blank number into the declared default instead of null (columns that cannot be null)', () => {
    const parsed = schemaFor(ENTITIES.campaigns).parse({
      name: 'Brindis',
      status: 'planned',
      budget: '',
      spent: '',
    });
    expect(parsed.budget).toBe(0);
    expect(parsed.spent).toBe(0);
    const opp = schemaFor(ENTITIES.opportunities).parse({
      title: 'Pedido',
      account_id: '0198f2a0-7c3e-7000-8000-000000000001',
      stage_id: '0198f2a0-7c3e-7000-8000-000000000002',
      amount: '',
    });
    expect(opp.amount).toBe(0);
  });

  it('requires the required fields and nulls the optional blanks', () => {
    const schema = schemaFor(ENTITIES.accounts);
    expect(schema.safeParse({ name: '  ', type: 'prospect', status: 'active' }).success).toBe(
      false,
    );
    const ok = schema.parse({
      name: 'Licores',
      type: 'prospect',
      status: 'active',
      email: '',
      phone: ' ',
    });
    expect(ok.email).toBeNull();
    expect(ok.phone).toBeNull();
  });

  it('rejects bad emails, negative numbers, fractional millilitres and an ABV over 100', () => {
    expect(
      schemaFor(ENTITIES.accounts).safeParse({
        name: 'X',
        type: 'prospect',
        status: 'active',
        email: 'nope',
      }).success,
    ).toBe(false);
    const variants = schemaFor(ENTITIES.variants);
    const base = {
      product_id: '0198f2a0-7c3e-7000-8000-000000000001',
      sku: 'S1',
      presentation: 'Botella',
      status: 'active',
    };
    expect(variants.safeParse({ ...base, volume_ml: '750' }).success).toBe(true);
    expect(variants.safeParse({ ...base, volume_ml: '750.5' }).success).toBe(false);
    expect(variants.safeParse({ ...base, abv: '150' }).success).toBe(false);
    expect(variants.safeParse({ ...base, price: '-1' }).success).toBe(false);
  });

  it('does not require identity fields when editing (lockOnEdit) and never lets an enum escape', () => {
    expect(schemaFor(ENTITIES.distributors, 'edit').safeParse({ status: 'active' }).success).toBe(
      true,
    );
    expect(schemaFor(ENTITIES.distributors).safeParse({ status: 'active' }).success).toBe(false);
    expect(
      schemaFor(ENTITIES.content_items).safeParse({
        title: 'T',
        channel: 'instagram',
        format: 'post',
        status: 'approved',
      }).success,
    ).toBe(false);
  });
});

describe('helpers', () => {
  it('reads nested paths safely', () => {
    expect(getPath({ owner: { name: 'Ana' } }, 'owner.name')).toBe('Ana');
    expect(getPath({ owner: null }, 'owner.name')).toBeUndefined();
  });

  it('reads a datetime-local value as Mexico City time (UTC-6)', () => {
    expect(localToIso('2026-10-28T10:00')).toBe('2026-10-28T16:00:00.000Z');
    expect(localToIso('')).toBeNull();
    expect(localToIso('basura')).toBeNull();
  });
});
