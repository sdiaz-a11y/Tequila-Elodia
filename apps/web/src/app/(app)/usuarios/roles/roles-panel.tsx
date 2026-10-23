'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  ACTIONS,
  SCOPES,
  type AdminRole,
  type AdminRoleDetail,
  type Action,
  type Resource,
  type Scope,
} from '@elodia/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError, api } from '@/lib/api';
import { ACTION_LABELS, RESOURCE_GROUPS, RESOURCE_LABELS, SCOPE_LABELS } from '@/lib/labels';
import { useSession } from '@/lib/session-client';
import { cn } from '@/lib/utils';
import { roleLabel } from '../user-form-dialog';

const IMMUTABLE_ROLE = 'tech_superadmin';
const keyOf = (resource: Resource, action: Action) => `${resource}:${action}`;
type Draft = Record<string, Scope | null>;

const errorText = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.';

export function RolesPanel() {
  const me = useSession();
  const qc = useQueryClient();
  const canEdit = 'roles:update' in me.permissions;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Only the cells that differ from the saved matrix; null = permission removed.
  const [edits, setEdits] = useState<Draft>({});
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const roles = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => api<AdminRole[]>('/roles'),
  });
  const activeId = selectedId ?? roles.data?.[0]?.id ?? null;
  const detail = useQuery({
    queryKey: ['admin', 'role', activeId],
    queryFn: () => api<AdminRoleDetail>(`/roles/${activeId}`),
    enabled: activeId !== null,
  });

  const saved = useMemo(() => {
    const map = new Map<string, Scope>();
    for (const g of detail.data?.grants ?? []) map.set(keyOf(g.resource, g.action), g.scope);
    return map;
  }, [detail.data]);

  const readOnly = !canEdit || detail.data?.key === IMMUTABLE_ROLE;
  const valueOf = (resource: Resource, action: Action): Scope | null => {
    const k = keyOf(resource, action);
    return k in edits ? edits[k]! : (saved.get(k) ?? null);
  };
  const dirtyCount = Object.keys(edits).length;

  function setCell(resource: Resource, action: Action, value: Scope | null) {
    const k = keyOf(resource, action);
    setEdits((prev) => {
      const next = { ...prev };
      if ((saved.get(k) ?? null) === value) delete next[k];
      else next[k] = value;
      return next;
    });
  }

  const refreshRole = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'role', activeId] });
    void qc.invalidateQueries({ queryKey: ['admin', 'roles'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const grants = RESOURCE_GROUPS.flatMap((g) => g.resources).flatMap((resource) =>
        ACTIONS.flatMap((action) => {
          const scope = valueOf(resource, action);
          return scope ? [{ resource, action, scope }] : [];
        }),
      );
      return api<AdminRoleDetail>(`/roles/${activeId}/permissions`, {
        method: 'PUT',
        body: { grants },
      });
    },
    onSuccess: () => {
      setEdits({});
      refreshRole();
      toast.success('Permisos guardados', {
        description: 'Aplican a las personas con este rol en su siguiente acción.',
      });
    },
    onError: (e) =>
      toast.error('No se pudieron guardar los permisos', { description: errorText(e) }),
  });

  const reset = useMutation({
    mutationFn: () => api<AdminRoleDetail>(`/roles/${activeId}/reset-defaults`, { method: 'POST' }),
    onSuccess: () => {
      setEdits({});
      refreshRole();
      toast.success('Permisos restablecidos a los valores por defecto');
    },
    onError: (e) => toast.error('No se pudo restablecer', { description: errorText(e) }),
  });

  function selectRole(id: string) {
    if (id === activeId) return;
    if (dirtyCount > 0) return setPendingSwitch(id);
    setSelectedId(id);
  }

  if (roles.isPending)
    return (
      <div className="skeleton h-96 rounded-panel" aria-busy="true" aria-label="Cargando roles" />
    );
  if (roles.isError)
    return (
      <Card>
        <EmptyState
          title="No pudimos cargar los roles"
          description={errorText(roles.error)}
          action={
            <Button variant="secondary" onClick={() => void roles.refetch()}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );

  const role = detail.data;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <ul aria-label="Roles" className="grid p-1.5">
          {roles.data.map((r) => {
            const active = r.id === activeId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => selectRole(r.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-gold/10 text-fg ring-1 ring-gold-deep'
                      : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{roleLabel(r)}</span>
                    <span className="tabular text-xs text-faint">
                      {r.userCount} {r.userCount === 1 ? 'persona' : 'personas'} · {r.grantCount}{' '}
                      permisos
                    </span>
                  </span>
                  {r.key === IMMUTABLE_ROLE ? (
                    <Lock className="size-3.5 shrink-0 text-faint" aria-label="Protegido" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        {detail.isPending || !role ? (
          <div className="skeleton m-4 h-96 rounded-control" aria-busy="true" />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
              <div className="grid gap-1">
                <h2 className="text-base font-semibold text-fg">{roleLabel(role)}</h2>
                <p className="text-sm text-muted">
                  {role.userCount} {role.userCount === 1 ? 'persona tiene' : 'personas tienen'} este
                  rol. Los cambios aplican en su siguiente acción.
                </p>
              </div>
              {canEdit && role.isSystem && role.key !== IMMUTABLE_ROLE ? (
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                  <RotateCcw aria-hidden />
                  Restablecer valores por defecto
                </Button>
              ) : null}
            </div>

            {role.key === IMMUTABLE_ROLE ? (
              <p className="flex items-start gap-2.5 border-b border-line bg-surface-2/50 px-5 py-3 text-sm text-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                El superadministrador técnico conserva todos los permisos y no se puede modificar:
                evita que la administración quede sin dueño.
              </p>
            ) : !canEdit ? (
              <p className="border-b border-line bg-surface-2/50 px-5 py-3 text-sm text-muted">
                Solo lectura: tu rol no puede editar permisos.
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-faint"
                    >
                      Módulo
                    </th>
                    {ACTIONS.map((a) => (
                      <th
                        key={a}
                        scope="col"
                        className="px-2 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-faint"
                      >
                        {ACTION_LABELS[a]}
                      </th>
                    ))}
                  </tr>
                </thead>
                {RESOURCE_GROUPS.map((group) => (
                  <tbody key={group.label}>
                    <tr>
                      <th
                        scope="rowgroup"
                        colSpan={ACTIONS.length + 1}
                        className="bg-surface-2/50 px-5 py-2 text-left text-xs font-medium tracking-wide text-gold"
                      >
                        {group.label}
                      </th>
                    </tr>
                    {group.resources.map((resource) => (
                      <tr key={resource} className="border-b border-line/50 last:border-0">
                        <th scope="row" className="px-5 py-2 text-left font-normal text-fg">
                          {RESOURCE_LABELS[resource]}
                        </th>
                        {ACTIONS.map((action) => {
                          const value = valueOf(resource, action);
                          const changed = keyOf(resource, action) in edits;
                          return (
                            <td key={action} className="px-2 py-1.5">
                              <select
                                aria-label={`${ACTION_LABELS[action]} · ${RESOURCE_LABELS[resource]}`}
                                value={value ?? ''}
                                disabled={readOnly}
                                onChange={(e) =>
                                  setCell(
                                    resource,
                                    action,
                                    (e.target.value || null) as Scope | null,
                                  )
                                }
                                className={cn(
                                  'h-8 w-full min-w-[5.25rem] rounded-md border bg-surface-2 px-2 text-xs transition-colors',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30',
                                  'disabled:cursor-not-allowed disabled:opacity-60',
                                  changed
                                    ? 'border-gold-2 text-gold'
                                    : value
                                      ? 'border-line text-fg'
                                      : 'border-line/60 text-faint',
                                )}
                              >
                                <option value="">—</option>
                                {SCOPES.map((s) => (
                                  <option key={s} value={s}>
                                    {SCOPE_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>

            <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-faint">
              <strong className="font-medium text-muted">Propios</strong>: solo lo que la persona
              creó o tiene asignado · <strong className="font-medium text-muted">Equipo</strong>:
              además lo de su equipo · <strong className="font-medium text-muted">Todos</strong>:
              sin límite. Cada módulo aplica estos alcances cuando se construye. Solo puedes
              conceder permisos que tu propia cuenta tiene.
            </p>

            {canEdit && role.key !== IMMUTABLE_ROLE ? (
              <div
                className={cn(
                  'sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface-2/95 px-5 py-3 backdrop-blur',
                  dirtyCount === 0 && 'opacity-60',
                )}
              >
                <p className="text-sm text-muted" aria-live="polite">
                  {dirtyCount === 0 ? (
                    'Sin cambios'
                  ) : (
                    <Badge tone="gold">
                      {dirtyCount} {dirtyCount === 1 ? 'cambio' : 'cambios'} sin guardar
                    </Badge>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" disabled={dirtyCount === 0} onClick={() => setEdits({})}>
                    Descartar
                  </Button>
                  <Button
                    variant="primary"
                    disabled={dirtyCount === 0}
                    loading={save.isPending}
                    onClick={() => save.mutate()}
                  >
                    Guardar permisos
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <AlertDialog open={pendingSwitch !== null} onOpenChange={(o) => !o && setPendingSwitch(null)}>
        <AlertDialogContent
          title="¿Descartar los cambios sin guardar?"
          description="Cambiaste permisos de este rol y no los guardaste. Si cambias de rol, se pierden."
          confirmLabel="Descartar y cambiar"
          onConfirm={() => {
            setEdits({});
            setSelectedId(pendingSwitch);
            setPendingSwitch(null);
          }}
        />
      </AlertDialog>
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent
          title="¿Restablecer los permisos por defecto?"
          description="Se reemplaza la matriz actual de este rol por la propuesta inicial. Los cambios que hayas hecho se pierden y aplican de inmediato."
          confirmLabel="Restablecer"
          loading={reset.isPending}
          onConfirm={() => reset.mutate()}
        />
      </AlertDialog>
    </div>
  );
}
