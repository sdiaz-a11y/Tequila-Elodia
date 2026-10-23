'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  AdminRole,
  AdminUser,
  Paginated,
  TemporaryPasswordResult,
  UserStatus,
} from '@elodia/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/field';
import { Table, TableWrap, TD, TH, THead, TR } from '@/components/ui/table';
import { ApiError, api } from '@/lib/api';
import { formatDateTime } from '@/lib/labels';
import { useSession } from '@/lib/session-client';
import { TemporaryPasswordDialog } from './temporary-password-dialog';
import { UserFormDialog, roleLabel, type UserFormValues } from './user-form-dialog';

const PAGE_SIZE = 20;

type Action =
  | { type: 'create' }
  | { type: 'edit'; user: AdminUser }
  | { type: 'reset' | 'disable' | 'enable' | 'unlock'; user: AdminUser };

const STATUS_FILTERS: { value: '' | UserStatus; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'disabled', label: 'Deshabilitados' },
];

function StatusBadge({ user }: { user: AdminUser }) {
  if (user.status === 'disabled') return <Badge tone="danger">Deshabilitado</Badge>;
  if (user.lockedUntil) return <Badge tone="warning">Bloqueado</Badge>;
  if (user.mustChangePassword) return <Badge tone="neutral">Contraseña temporal</Badge>;
  return <Badge tone="success">Activo</Badge>;
}

const errorText = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.';

export function UsersPanel() {
  const me = useSession();
  const qc = useQueryClient();
  const can = (key: string) => key in me.permissions;
  const canCreate = can('users:create');
  const canUpdate = can('users:update');

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | UserStatus>('');
  const [roleId, setRoleId] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ result: TemporaryPasswordResult; heading: string } | null>(
    null,
  );

  // Debounce the search box so typing does not fire a request per key.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const users = useQuery({
    queryKey: ['admin', 'users', { q, status, roleId, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (roleId) params.set('roleId', roleId);
      return api<Paginated<AdminUser>>(`/users?${params}`);
    },
    placeholderData: keepPreviousData,
  });
  // Needs roles:read; without it the role filter and "new user" are simply unavailable.
  const roles = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => api<AdminRole[]>('/roles'),
    retry: false,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const save = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (action?.type === 'edit') {
        return {
          kind: 'edit' as const,
          user: await api<AdminUser>(`/users/${action.user.id}`, {
            method: 'PATCH',
            body: {
              name: values.name,
              ...(values.roleId !== action.user.roles[0]?.id ? { roleId: values.roleId } : {}),
            },
          }),
        };
      }
      return {
        kind: 'create' as const,
        result: await api<TemporaryPasswordResult>('/users', {
          method: 'POST',
          body: { name: values.name, email: values.email, roleId: values.roleId },
        }),
      };
    },
    onSuccess: (res) => {
      setAction(null);
      setFormError(null);
      void refresh();
      if (res.kind === 'create') setIssued({ result: res.result, heading: 'Usuario creado' });
      else toast.success('Cambios guardados');
    },
    onError: (e) => setFormError(errorText(e)),
  });

  const run = useMutation({
    mutationFn: async (a: Extract<Action, { user: AdminUser }>) => {
      const id = a.user.id;
      if (a.type === 'reset')
        return {
          temp: await api<TemporaryPasswordResult>(`/users/${id}/reset-password`, {
            method: 'POST',
          }),
        };
      if (a.type === 'unlock') {
        await api<AdminUser>(`/users/${id}/unlock`, { method: 'POST' });
        return { done: 'Cuenta desbloqueada' };
      }
      await api<AdminUser>(`/users/${id}`, {
        method: 'PATCH',
        body: { status: a.type === 'disable' ? 'disabled' : 'active' },
      });
      return { done: a.type === 'disable' ? 'Usuario deshabilitado' : 'Usuario habilitado' };
    },
    onSuccess: (res) => {
      void refresh();
      if ('temp' in res && res.temp)
        setIssued({ result: res.temp, heading: 'Contraseña restablecida' });
      else if ('done' in res) toast.success(res.done);
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const rows = users.data?.data ?? [];
  const meta = users.data?.meta;
  const pages = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  const filtered = Boolean(q || status || roleId);

  const confirm = action && 'user' in action && action.type !== 'edit' ? action : null;
  const confirmCopy: Record<
    string,
    { title: string; text: string; label: string; danger: boolean }
  > = confirm
    ? {
        reset: {
          title: '¿Restablecer la contraseña?',
          text: `${confirm.user.name} perderá su acceso actual: se cierran todas sus sesiones y recibirá una contraseña temporal que debe cambiar al entrar.`,
          label: 'Restablecer',
          danger: true,
        },
        disable: {
          title: '¿Deshabilitar este usuario?',
          text: `${confirm.user.name} no podrá iniciar sesión y se cierran sus sesiones abiertas. Su historial se conserva y puedes habilitarlo de nuevo.`,
          label: 'Deshabilitar',
          danger: true,
        },
        enable: {
          title: '¿Habilitar este usuario?',
          text: `${confirm.user.name} podrá volver a iniciar sesión con su contraseña actual.`,
          label: 'Habilitar',
          danger: false,
        },
        unlock: {
          title: '¿Desbloquear la cuenta?',
          text: `${confirm.user.name} fue bloqueado por intentos fallidos. Al desbloquear podrá intentar entrar de nuevo.`,
          label: 'Desbloquear',
          danger: false,
        },
      }
    : {};

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | UserStatus);
            setPage(1);
          }}
          className="w-auto min-w-44"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        {roles.data ? (
          <Select
            aria-label="Filtrar por rol"
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value);
              setPage(1);
            }}
            className="w-auto min-w-48"
          >
            <option value="">Todos los roles</option>
            {roles.data.map((r) => (
              <option key={r.id} value={r.id}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
        ) : null}
        {canCreate && roles.data ? (
          <Button
            variant="primary"
            className="ml-auto"
            onClick={() => {
              setFormError(null);
              setAction({ type: 'create' });
            }}
          >
            <Plus aria-hidden />
            Nuevo usuario
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        {users.isPending ? (
          <div className="grid gap-px p-4" aria-busy="true" aria-label="Cargando usuarios">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-14 rounded-control" />
            ))}
          </div>
        ) : users.isError ? (
          <EmptyState
            title="No pudimos cargar los usuarios"
            description={errorText(users.error)}
            action={
              <Button variant="secondary" onClick={() => void users.refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={filtered ? 'Sin resultados' : 'Aún no hay usuarios'}
            description={
              filtered
                ? 'Ningún usuario coincide con los filtros. Prueba con otra búsqueda.'
                : 'Crea el primer usuario para darle acceso a la plataforma.'
            }
          />
        ) : (
          <TableWrap>
            <Table aria-label="Usuarios">
              <THead>
                <tr>
                  <TH>Usuario</TH>
                  <TH>Rol</TH>
                  <TH>Estado</TH>
                  <TH>Último acceso</TH>
                  <TH className="w-12">
                    <span className="sr-only">Acciones</span>
                  </TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((u) => {
                  const isMe = u.id === me.id;
                  const locked = Boolean(u.lockedUntil);
                  return (
                    <TR key={u.id}>
                      <TD>
                        <p className="font-medium">
                          {u.name}
                          {isMe ? <span className="ml-2 text-xs text-faint">(tú)</span> : null}
                        </p>
                        <p className="text-[0.8125rem] text-muted">{u.email}</p>
                      </TD>
                      <TD>
                        {u.roles.map((r) => (
                          <Badge key={r.id} tone="gold">
                            {roleLabel(r)}
                          </Badge>
                        ))}
                      </TD>
                      <TD>
                        <StatusBadge user={u} />
                      </TD>
                      <TD className="tabular whitespace-nowrap text-muted">
                        {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Nunca'}
                      </TD>
                      <TD>
                        {canUpdate ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Acciones para ${u.name}`}
                              >
                                <MoreHorizontal aria-hidden />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              <DropdownMenuItem
                                onSelect={() => {
                                  setFormError(null);
                                  setAction({ type: 'edit', user: u });
                                }}
                              >
                                <Pencil aria-hidden />
                                Editar
                              </DropdownMenuItem>
                              {locked ? (
                                <DropdownMenuItem
                                  onSelect={() => setAction({ type: 'unlock', user: u })}
                                >
                                  <LockOpen aria-hidden />
                                  Desbloquear cuenta
                                </DropdownMenuItem>
                              ) : null}
                              {!isMe ? (
                                <>
                                  <DropdownMenuItem
                                    onSelect={() => setAction({ type: 'reset', user: u })}
                                  >
                                    <KeyRound aria-hidden />
                                    Restablecer contraseña
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {u.status === 'disabled' ? (
                                    <DropdownMenuItem
                                      onSelect={() => setAction({ type: 'enable', user: u })}
                                    >
                                      <Power aria-hidden />
                                      Habilitar
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      danger
                                      onSelect={() => setAction({ type: 'disable', user: u })}
                                    >
                                      <PowerOff aria-hidden />
                                      Deshabilitar
                                    </DropdownMenuItem>
                                  )}
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}

        {meta && meta.total > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <p className="tabular" aria-live="polite">
              {(meta.page - 1) * meta.pageSize + 1}–
              {Math.min(meta.page * meta.pageSize, meta.total)} de {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <span className="tabular px-1">
                {page} / {pages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Página siguiente"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <UserFormDialog
        open={action?.type === 'create' || action?.type === 'edit'}
        user={action?.type === 'edit' ? action.user : null}
        roles={roles.data ?? []}
        submitting={save.isPending}
        serverError={formError}
        onSubmit={(v) => save.mutate(v)}
        onClose={() => setAction(null)}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setAction(null)}>
        {confirm ? (
          <AlertDialogContent
            title={confirmCopy[confirm.type]!.title}
            description={confirmCopy[confirm.type]!.text}
            confirmLabel={confirmCopy[confirm.type]!.label}
            tone={confirmCopy[confirm.type]!.danger ? 'danger' : 'primary'}
            loading={run.isPending}
            onConfirm={() => run.mutate(confirm)}
          />
        ) : null}
      </AlertDialog>

      <TemporaryPasswordDialog
        result={issued?.result ?? null}
        heading={issued?.heading ?? ''}
        onClose={() => setIssued(null)}
      />
    </div>
  );
}
