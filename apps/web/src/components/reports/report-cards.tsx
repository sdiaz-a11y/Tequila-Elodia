'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const dateClass = 'h-10 rounded-control border border-line bg-surface px-3 text-fg';

export function ReportCards({
  reports,
}: {
  reports: { kind: string; label: string; description: string }[];
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const suffix = qs.size ? `?${qs}` : '';

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm text-muted">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={dateClass}
          />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={dateClass}
          />
        </label>
        <p className="pb-2 text-xs text-faint">Sin fechas se descarga todo (hasta 5,000 filas).</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.kind}>
            <CardHeader>
              <CardTitle>{r.label}</CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={`/api/export/${r.kind}${suffix}`}
                data-report={r.kind}
                className="inline-flex h-10 items-center gap-2 rounded-control border border-line px-4 text-sm text-fg hover:bg-surface-2"
              >
                <Download className="size-4" aria-hidden /> Descargar CSV
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
