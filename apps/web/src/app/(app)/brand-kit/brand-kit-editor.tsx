'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { saveBrandKit } from '@/app/actions/content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/field';

export interface Swatch {
  name: string;
  hex: string;
}
export interface FontNote {
  name: string;
  usage: string;
}
export interface Kit {
  tone: string;
  approved_messages: string;
  restrictions: string;
  palette: Swatch[];
  fonts: FontNote[];
}

const area =
  'min-h-28 w-full resize-y rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed text-fg placeholder:text-faint focus-visible:border-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 disabled:opacity-70';

export function BrandKitEditor({ kit, canEdit }: { kit: Kit; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<Kit>(kit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(kit);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await saveBrandKit(form);
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo guardar.');
    toast.success('Brand Kit guardado');
    router.refresh();
  }

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard may be blocked; the code stays visible on screen.
    }
  }

  const setSwatch = (i: number, patch: Partial<Swatch>) =>
    setForm((f) => ({
      ...f,
      palette: f.palette.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  const setFont = (i: number, patch: Partial<FontNote>) =>
    setForm((f) => ({ ...f, fonts: f.fonts.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Paleta de color</CardTitle>
          <CardDescription>Toca un color para copiar su código.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {form.palette.map((s, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-control border border-line bg-surface-2 p-2.5"
              >
                <button
                  type="button"
                  onClick={() => void copy(s.hex)}
                  aria-label={`Copiar ${s.name} ${s.hex}`}
                  className="relative h-16 rounded-md border border-line/70 transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: s.hex }}
                >
                  <span className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-full bg-black/55 text-white">
                    {copied === s.hex ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      <Copy className="size-3.5" aria-hidden />
                    )}
                  </span>
                </button>
                {canEdit ? (
                  <>
                    <Input
                      value={s.name}
                      onChange={(e) => setSwatch(i, { name: e.target.value })}
                      aria-label="Nombre del color"
                      className="h-9 text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Input
                        value={s.hex}
                        onChange={(e) => setSwatch(i, { hex: e.target.value })}
                        aria-label="Código hexadecimal"
                        className="tabular h-9 text-xs"
                        maxLength={7}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar ${s.name}`}
                        onClick={() =>
                          setForm((f) => ({ ...f, palette: f.palette.filter((_, j) => j !== i) }))
                        }
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs">
                    <span className="block font-medium text-fg">{s.name}</span>
                    <span className="tabular text-muted">{s.hex.toUpperCase()}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
          {canEdit ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  palette: [...f.palette, { name: 'Nuevo color', hex: '#888888' }],
                }))
              }
            >
              <Plus aria-hidden />
              Agregar color
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipografías</CardTitle>
          <CardDescription>
            Qué letra se usa y dónde. No se afirma una fuente exacta sin los archivos originales.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {form.fonts.map((f, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-control border border-line bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
            >
              {canEdit ? (
                <>
                  <Input
                    value={f.name}
                    onChange={(e) => setFont(i, { name: e.target.value })}
                    aria-label="Tipografía"
                  />
                  <Input
                    value={f.usage}
                    onChange={(e) => setFont(i, { usage: e.target.value })}
                    aria-label="Uso"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar ${f.name}`}
                    onClick={() =>
                      setForm((s) => ({ ...s, fonts: s.fonts.filter((_, j) => j !== i) }))
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-fg">{f.name}</p>
                  <p className="text-sm text-muted sm:col-span-2">{f.usage}</p>
                </>
              )}
            </div>
          ))}
          {canEdit ? (
            <Button
              variant="secondary"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                setForm((s) => ({ ...s, fonts: [...s.fonts, { name: '', usage: '' }] }))
              }
            >
              <Plus aria-hidden />
              Agregar tipografía
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {(
          [
            ['tone', 'Tono de comunicación', 'Cómo suena la marca.'],
            [
              'approved_messages',
              'Mensajes aprobados',
              'Frases y claims que sí se pueden usar, uno por línea.',
            ],
            [
              'restrictions',
              'Restricciones de marca',
              'Lo que nunca se debe hacer, uno por línea.',
            ],
          ] as const
        ).map(([key, title, hint]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className={area}
                aria-label={title}
                value={form[key]}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={canEdit ? 'Aún sin definir.' : 'Sin definir.'}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {canEdit ? (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-panel border border-line bg-surface-2/95 px-5 py-3 shadow-pop backdrop-blur">
          <p className="text-sm text-muted" aria-live="polite">
            {dirty ? 'Hay cambios sin guardar' : 'Todo guardado'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={!dirty || saving} onClick={() => setForm(kit)}>
              Descartar
            </Button>
            <Button
              variant="primary"
              disabled={!dirty}
              loading={saving}
              onClick={() => void save()}
            >
              Guardar Brand Kit
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
