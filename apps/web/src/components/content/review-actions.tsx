'use client';

import { useState } from 'react';
import { Check, Send, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';
import { transitionContent } from '@/app/actions/content';
import { Button } from '@/components/ui/button';
import type { ContentItem } from '@/lib/content';

const area =
  'min-h-20 w-full resize-y rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-faint focus-visible:border-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30';

/**
 * Buttons for the editorial workflow. What shows depends on the status and on the role, but the database
 * decides in the end: a forged request cannot approve content or skip the legal check.
 */
export function ReviewActions({
  item,
  canEdit,
  canApprove,
  onDone,
}: {
  item: ContentItem;
  canEdit: boolean;
  canApprove: boolean;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [legal, setLegal] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(input: Record<string, unknown>, ok: string) {
    setBusy(true);
    setError(null);
    const res = await transitionContent(item.id, input);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo completar.');
    toast.success(ok);
    setMode(null);
    setComment('');
    setLegal(false);
    onDone();
  }

  const s = item.status;
  const showSubmit = canEdit && (s === 'idea' || s === 'draft' || s === 'rejected');
  const showReopen = canEdit && s === 'in_review';
  const showPublish = canEdit && s === 'approved';
  const showReview = canApprove && s === 'in_review';
  if (!showSubmit && !showReopen && !showPublish && !showReview) return null;

  return (
    <div className="grid gap-3">
      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {mode === 'approve' ? (
        <div className="grid gap-3 rounded-control border border-line bg-surface p-4">
          <label className="flex items-start gap-2.5 text-sm text-fg">
            <input
              type="checkbox"
              checked={legal}
              onChange={(e) => setLegal(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--gold-primary)]"
            />
            <span>
              Revisé que este contenido cumple la normativa aplicable a la publicidad de bebidas
              alcohólicas y las restricciones del Brand Kit.
              <span className="block text-xs text-muted">
                ELODIA OS no valida el cumplimiento legal: esta confirmación es tuya y queda
                registrada.
              </span>
            </span>
          </label>
          <textarea
            className={area}
            aria-label="Comentario (opcional)"
            placeholder="Comentario (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={!legal}
              loading={busy}
              onClick={() =>
                void run({ action: 'approve', legalChecked: legal, comment }, 'Contenido aprobado')
              }
            >
              <Check aria-hidden />
              Aprobar
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'reject' ? (
        <div className="grid gap-3 rounded-control border border-line bg-surface p-4">
          <textarea
            className={area}
            aria-label="Motivo del rechazo"
            placeholder="Motivo del rechazo (obligatorio)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => void run({ action: 'reject', comment }, 'Contenido rechazado')}
            >
              <X aria-hidden />
              Rechazar
            </Button>
          </div>
        </div>
      ) : null}

      {mode === null ? (
        <div className="flex flex-wrap gap-2">
          {showReview ? (
            <>
              <Button
                variant="primary"
                onClick={() => {
                  setError(null);
                  setMode('approve');
                }}
              >
                <Check aria-hidden />
                Aprobar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setError(null);
                  setMode('reject');
                }}
              >
                <X aria-hidden />
                Rechazar
              </Button>
            </>
          ) : null}
          {showSubmit ? (
            <Button
              variant="primary"
              loading={busy}
              onClick={() => void run({ action: 'submit' }, 'Enviado a revisión')}
            >
              <Send aria-hidden />
              Enviar a revisión
            </Button>
          ) : null}
          {showReopen ? (
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => void run({ action: 'reopen' }, 'Devuelto a borrador')}
            >
              <Undo2 aria-hidden />
              Volver a borrador
            </Button>
          ) : null}
          {showPublish ? (
            <Button
              variant="primary"
              loading={busy}
              onClick={() => void run({ action: 'publish' }, 'Marcado como publicado')}
            >
              <Send aria-hidden />
              Marcar como publicado
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
