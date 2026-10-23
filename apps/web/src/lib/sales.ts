import type { Option } from '@/lib/entities';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export const QUOTE_STATUS: readonly (Option & {
  tone: 'neutral' | 'warning' | 'success' | 'danger' | 'gold';
})[] = [
  { value: 'draft', label: 'Borrador', tone: 'neutral' },
  { value: 'sent', label: 'Enviada', tone: 'warning' },
  { value: 'accepted', label: 'Aceptada', tone: 'success' },
  { value: 'rejected', label: 'Rechazada', tone: 'danger' },
];

export const ORDER_STATUS: readonly (Option & {
  tone: 'neutral' | 'warning' | 'success' | 'danger' | 'gold';
})[] = [
  { value: 'pending', label: 'Pendiente', tone: 'neutral' },
  { value: 'confirmed', label: 'Confirmado', tone: 'warning' },
  { value: 'shipped', label: 'Enviado', tone: 'gold' },
  { value: 'delivered', label: 'Entregado', tone: 'success' },
  { value: 'cancelled', label: 'Cancelado', tone: 'danger' },
];

export const PAY_METHODS: readonly Option[] = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

/** Discounts above this need a commercial manager (the database enforces it too). */
export const FREE_DISCOUNT_PCT = 10;
export const DEFAULT_TAX_RATE = 16;

export interface Line {
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_rate: number;
}

const round2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

/** Same arithmetic as the database (generated columns), used only for the live preview in the form. */
export function lineAmounts(l: Line) {
  const gross = round2(l.quantity * l.unit_price);
  const net = round2(l.quantity * l.unit_price * (1 - l.discount_pct / 100));
  const tax = round2((net * l.tax_rate) / 100);
  return { gross, discount: round2(gross - net), net, tax, total: round2(net + tax) };
}

export function docTotals(lines: Line[]) {
  const parts = lines.map(lineAmounts);
  const subtotal = round2(parts.reduce((t, p) => t + p.gross, 0));
  const discount = round2(parts.reduce((t, p) => t + p.discount, 0));
  const tax = round2(parts.reduce((t, p) => t + p.tax, 0));
  return { subtotal, discount, tax, total: round2(subtotal - discount + tax) };
}

export interface DocLine extends Line {
  id: string;
  variant_id: string | null;
  description: string;
  line_total: number;
  tax_amount: number;
}

export interface VariantChoice {
  id: string;
  sku: string;
  presentation: string;
  price: number | null;
  product: string;
}
