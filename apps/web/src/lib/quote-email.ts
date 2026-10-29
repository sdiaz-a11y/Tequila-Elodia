const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (n: number, currency: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n);

export interface QuoteEmailData {
  number: string;
  accountName: string;
  validUntil: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  notes: string | null;
  lines: {
    description: string;
    quantity: number;
    unit_price: number;
    discount_pct: number;
    line_total: number;
  }[];
}

/** Plain, inline-styled HTML (email clients ignore stylesheets). Every value is escaped. */
export function quoteEmailHtml(q: QuoteEmailData, message: string): string {
  const cell = 'padding:8px 10px;border-bottom:1px solid #e5e0d6;font-size:14px;';
  const rows = q.lines
    .map(
      (l) =>
        `<tr><td style="${cell}">${esc(l.description)}</td><td style="${cell}text-align:right">${l.quantity}</td>` +
        `<td style="${cell}text-align:right">${money(l.unit_price, q.currency)}</td>` +
        `<td style="${cell}text-align:right">${l.discount_pct ? `${l.discount_pct} %` : '—'}</td>` +
        `<td style="${cell}text-align:right">${money(l.line_total, q.currency)}</td></tr>`,
    )
    .join('');
  const total = (label: string, value: number, bold = false) =>
    `<tr><td colspan="4" style="padding:6px 10px;text-align:right;font-size:14px;${bold ? 'font-weight:700;' : ''}">${label}</td>` +
    `<td style="padding:6px 10px;text-align:right;font-size:14px;${bold ? 'font-weight:700;' : ''}">${money(value, q.currency)}</td></tr>`;
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:640px">` +
    `<h2 style="margin:0 0 4px">Cotización ${esc(q.number)}</h2>` +
    `<p style="margin:0 0 16px;color:#555">Para ${esc(q.accountName)}${q.validUntil ? ` · válida hasta ${esc(q.validUntil)}` : ''}</p>` +
    (message ? `<p style="white-space:pre-wrap">${esc(message)}</p>` : '') +
    `<table style="width:100%;border-collapse:collapse"><thead><tr>` +
    ['Concepto', 'Cant.', 'Precio', 'Desc.', 'Importe']
      .map(
        (h, i) =>
          `<th style="${cell}${i ? 'text-align:right;' : 'text-align:left;'}font-size:12px;color:#555">${h}</th>`,
      )
      .join('') +
    `</tr></thead><tbody>${rows}</tbody><tfoot>` +
    total('Subtotal', q.subtotal) +
    (q.discount_total ? total('Descuento', -q.discount_total) : '') +
    total('Impuestos', q.tax_total) +
    total('Total', q.total, true) +
    `</tfoot></table>` +
    (q.notes
      ? `<p style="white-space:pre-wrap;color:#555;font-size:13px">${esc(q.notes)}</p>`
      : '') +
    `<p style="margin-top:24px;color:#888;font-size:12px">ELODIA</p></div>`
  );
}
