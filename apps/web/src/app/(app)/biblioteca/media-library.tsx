'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ExternalLink,
  ImageUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteAsset, registerAsset, updateAsset } from '@/app/actions/content';
import { AssetThumb } from '@/components/content/asset-thumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import {
  ACCEPTED_MIME,
  ASSET_KINDS,
  MAX_UPLOAD_BYTES,
  formatBytes,
  label,
  type Asset,
} from '@/lib/content';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { formatDay } from '@/lib/format';

const textarea =
  'min-h-20 w-full resize-y rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-faint focus-visible:border-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30';

interface FormState {
  title: string;
  kind: string;
  description: string;
  tags: string;
  official: boolean;
}
const EMPTY: FormState = { title: '', kind: 'photo', description: '', tags: '', official: false };
const parseTags = (s: string) =>
  [
    ...new Set(
      s
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);
const safeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .slice(-100);

export function MediaLibrary({
  assets,
  kind,
  q,
  canEdit,
  canApprove,
}: {
  assets: Asset[];
  kind: string;
  q: string;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(q);
  const [dialog, setDialog] = useState<{ asset: Asset | null } | null>(null);
  const [removing, setRemoving] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);

  const navigate = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${next}`));
  };
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => navigate({ q: search.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function confirmDelete() {
    if (!removing) return;
    setBusy(true);
    const res = await deleteAsset(removing.id);
    setBusy(false);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo eliminar.');
    toast.success('Archivo eliminado');
    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar archivos"
            aria-label="Buscar archivos"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Filtrar por tipo"
          value={kind}
          onChange={(e) => navigate({ tipo: e.target.value })}
          className="w-auto min-w-44"
        >
          <option value="">Todos los tipos</option>
          {ASSET_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
        {canEdit ? (
          <Button variant="primary" className="ml-auto" onClick={() => setDialog({ asset: null })}>
            <Plus aria-hidden />
            Subir archivo
          </Button>
        ) : null}
      </div>

      {assets.length === 0 ? (
        <div className="rounded-panel border border-line bg-surface">
          <EmptyState
            icon={ImageUp}
            title={q || kind ? 'Sin resultados' : 'La biblioteca está vacía'}
            description={
              q || kind
                ? 'Ningún archivo coincide con los filtros.'
                : 'Sube fotografías, videos, logotipos y documentos de la marca.'
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-label="Archivos">
          {assets.map((a) => (
            <li
              key={a.id}
              className="group grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 rounded-panel border border-line bg-surface p-3 shadow-panel"
            >
              <AssetThumb mime={a.mime} url={a.url} title={a.title} />
              <div className="flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg" title={a.title}>
                    {a.title}
                  </p>
                  <p className="tabular text-xs text-muted">
                    {label(ASSET_KINDS, a.kind)} · {formatBytes(a.size_bytes)} ·{' '}
                    {formatDay(a.created_at)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Acciones para ${a.title}`}>
                      <MoreHorizontal aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    {a.url ? (
                      <DropdownMenuItem asChild>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          <ExternalLink aria-hidden />
                          Abrir
                        </a>
                      </DropdownMenuItem>
                    ) : null}
                    {canEdit && (!a.official || canApprove) ? (
                      <DropdownMenuItem onSelect={() => setDialog({ asset: a })}>
                        <Pencil aria-hidden />
                        Editar
                      </DropdownMenuItem>
                    ) : null}
                    {canEdit && (!a.official || canApprove) ? (
                      <DropdownMenuItem danger onSelect={() => setRemoving(a)}>
                        <Trash2 aria-hidden />
                        Eliminar
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {a.official ? (
                  <Badge tone="gold">
                    <ShieldCheck className="size-3" aria-hidden />
                    Oficial
                  </Badge>
                ) : null}
                {a.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AssetDialog
        key={dialog ? (dialog.asset?.id ?? 'new') : 'closed'}
        open={dialog !== null}
        asset={dialog?.asset ?? null}
        canApprove={canApprove}
        onClose={() => setDialog(null)}
        onDone={() => {
          setDialog(null);
          router.refresh();
        }}
      />

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent
          title="¿Eliminar este archivo?"
          description="Se borra de la biblioteca y del almacenamiento. Los contenidos del calendario que lo usan quedan sin archivo."
          confirmLabel="Eliminar"
          loading={busy}
          onConfirm={() => void confirmDelete()}
        />
      </AlertDialog>
    </div>
  );
}

function AssetDialog({
  open,
  asset,
  canApprove,
  onClose,
  onDone,
}: {
  open: boolean;
  asset: Asset | null;
  canApprove: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = asset !== null;
  const [form, setForm] = useState<FormState>(
    asset
      ? {
          title: asset.title,
          kind: asset.kind,
          description: asset.description ?? '',
          tags: asset.tags.join(', '),
          official: asset.official,
        }
      : EMPTY,
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  function pick(f: File | null) {
    setError(null);
    if (f && !ACCEPTED_MIME.includes(f.type))
      return setError('Formato no permitido. Usa imágenes, video MP4/MOV/WebM, PDF o fuentes.');
    if (f && f.size > MAX_UPLOAD_BYTES) return setError('El archivo supera los 50 MB.');
    setFile(f);
    if (f && !form.title) set('title', f.name.replace(/\.[^.]+$/, ''));
    if (f && !editing)
      set(
        'kind',
        f.type.startsWith('video/') ? 'video' : f.type === 'application/pdf' ? 'document' : 'photo',
      );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editing && !file) return setError('Elige un archivo.');
    setSaving(true);
    try {
      const body = {
        title: form.title,
        kind: form.kind,
        description: form.description || null,
        tags: parseTags(form.tags),
        official: form.official,
      };
      if (editing) {
        const res = await updateAsset(asset.id, body);
        if (!res.ok) return setError(res.error ?? 'No se pudo guardar.');
        toast.success('Cambios guardados');
        return onDone();
      }
      const path = `uploads/${crypto.randomUUID()}-${safeName(file!.name)}`;
      const up = await createBrowserSupabase()
        .storage.from('brand')
        .upload(path, file!, { contentType: file!.type, upsert: false });
      if (up.error)
        return setError('No se pudo subir el archivo. Revisa tu conexión o tus permisos.');
      const res = await registerAsset({
        ...body,
        storage_path: path,
        mime: file!.type,
        size_bytes: file!.size,
      });
      if (!res.ok) return setError(res.error ?? 'No se pudo registrar el archivo.');
      toast.success('Archivo subido');
      onDone();
    } catch {
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,34rem)] overflow-y-auto">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">
              {editing ? 'Editar archivo' : 'Subir archivo'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted">
              {editing
                ? 'Cambia sus datos; el archivo en sí no se reemplaza.'
                : 'Imágenes, video (MP4, MOV, WebM), PDF o fuentes. Máximo 50 MB.'}
            </DialogDescription>
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
          {!editing ? (
            <Field id="a-file" label="Archivo *">
              {(a) => (
                <Input
                  {...a}
                  type="file"
                  accept={ACCEPTED_MIME.join(',')}
                  onChange={(e) => pick(e.target.files?.[0] ?? null)}
                  className="h-auto py-2.5"
                />
              )}
            </Field>
          ) : null}
          <Field id="a-title" label="Título *">
            {(a) => (
              <Input
                {...a}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <Field id="a-kind" label="Tipo *">
            {(a) => (
              <Select {...a} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                {ASSET_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="a-desc" label="Descripción">
            {(a) => (
              <textarea
                {...a}
                className={textarea}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            )}
          </Field>
          <Field
            id="a-tags"
            label="Etiquetas"
            hint="Separadas por comas: botella, atardecer, edición especial"
          >
            {(a) => (
              <Input
                {...a}
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          {canApprove ? (
            <label className="flex items-start gap-2.5 text-sm text-fg">
              <input
                type="checkbox"
                checked={form.official}
                onChange={(e) => set('official', e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--gold-primary)]"
              />
              <span>
                Recurso oficial de la marca
                <span className="block text-xs text-muted">
                  Solo dirección lo marca; un archivo oficial no lo modifica ni elimina el resto del
                  equipo.
                </span>
              </span>
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editing ? 'Guardar cambios' : 'Subir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
