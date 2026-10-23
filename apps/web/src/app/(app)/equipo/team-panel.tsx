'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  KeyRound,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from '@elodia/shared';
import { createUser, resetUserPassword, updateUser } from '@/app/actions/team';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, Input, Select } from '@/components/ui/field';
import { Table, TableWrap, TD, TH, THead, TR } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';

export interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  created_at: string;
}

const roleLabel = (r: string) => ROLE_LABELS[r as RoleKey] ?? r;

export function TeamPanel({
  members,
  meId,
  assignable,
  canEdit,
}: {
  members: Member[];
  meId: string;
  assignable: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'salesperson' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<{ who: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'reset' | 'disable'; member: Member } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const res = await createUser(form);
    setSaving(false);
    if (!res.ok) return setFormError(res.error ?? 'No se pudo crear.');
    setCreating(false);
    setIssued({ who: `${form.name} (${form.email})`, password: res.temporaryPassword! });
    setForm({ name: '', email: '', role: 'salesperson' });
    router.refresh();
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    const { kind, member } = confirm;
    const res =
      kind === 'reset'
        ? await resetUserPassword(member.id)
        : await updateUser({ id: member.id, active: false });
    setBusy(false);
    setConfirm(null);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo completar.');
    if (res.temporaryPassword)
      setIssued({ who: `${member.name} (${member.email})`, password: res.temporaryPassword });
    else toast.success('Usuario deshabilitado');
    router.refresh();
  }

  async function toggleActive(m: Member) {
    const res = await updateUser({ id: m.id, active: true });
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo habilitar.');
    toast.success('Usuario habilitado');
    router.refresh();
  }

  async function changeRole(m: Member, role: string) {
    const res = await updateUser({ id: m.id, role });
    if (!res.ok) toast.error(res.error ?? 'No se pudo cambiar el rol.');
    else toast.success('Rol actualizado');
    router.refresh();
  }

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The password stays selectable on screen if the clipboard is blocked.
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {canEdit ? (
        <div className="flex">
          <Button
            variant="primary"
            className="ml-auto"
            onClick={() => {
              setFormError(null);
              setCreating(true);
            }}
          >
            <Plus aria-hidden />
            Nuevo usuario
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <TableWrap>
          <Table aria-label="Equipo">
            <THead>
              <tr>
                <TH>Persona</TH>
                <TH>Rol</TH>
                <TH>Estado</TH>
                <TH>Alta</TH>
                <TH className="w-12">
                  <span className="sr-only">Acciones</span>
                </TH>
              </tr>
            </THead>
            <tbody>
              {members.map((m) => {
                const isMe = m.id === meId;
                const allowed = assignable.includes(m.role);
                return (
                  <TR key={m.id}>
                    <TD>
                      <p className="font-medium">
                        {m.name || m.email}
                        {isMe ? <span className="ml-2 text-xs text-faint">(tú)</span> : null}
                      </p>
                      <p className="text-[0.8125rem] text-muted">{m.email}</p>
                    </TD>
                    <TD>
                      {canEdit && !isMe && allowed ? (
                        <Select
                          aria-label={`Rol de ${m.name || m.email}`}
                          value={m.role}
                          onChange={(e) => void changeRole(m, e.target.value)}
                          className="h-9 w-auto min-w-48 text-xs"
                        >
                          {ROLE_KEYS.filter((r) => assignable.includes(r) || r === m.role).map(
                            (r) => (
                              <option key={r} value={r}>
                                {roleLabel(r)}
                              </option>
                            ),
                          )}
                        </Select>
                      ) : (
                        <Badge tone="gold">{roleLabel(m.role)}</Badge>
                      )}
                    </TD>
                    <TD>
                      {m.active ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="danger">Deshabilitado</Badge>
                      )}
                    </TD>
                    <TD className="tabular whitespace-nowrap text-muted">
                      {formatDateTime(m.created_at)}
                    </TD>
                    <TD>
                      {canEdit && !isMe && allowed ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Acciones para ${m.name || m.email}`}
                            >
                              <MoreHorizontal aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56">
                            <DropdownMenuItem
                              onSelect={() => setConfirm({ kind: 'reset', member: m })}
                            >
                              <KeyRound aria-hidden />
                              Restablecer contraseña
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {m.active ? (
                              <DropdownMenuItem
                                danger
                                onSelect={() => setConfirm({ kind: 'disable', member: m })}
                              >
                                <PowerOff aria-hidden />
                                Deshabilitar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => void toggleActive(m)}>
                                <Power aria-hidden />
                                Habilitar
                              </DropdownMenuItem>
                            )}
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
      </Card>

      <Dialog open={creating} onOpenChange={(o) => !o && !saving && setCreating(false)}>
        <DialogContent className="w-[min(92vw,30rem)]">
          <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
            <div className="grid gap-1">
              <DialogTitle className="text-base font-semibold text-fg">Nuevo usuario</DialogTitle>
              <DialogDescription className="text-sm text-muted">
                Se genera una contraseña temporal que verás una sola vez. Entrégala por un canal
                seguro.
              </DialogDescription>
            </div>
            {formError ? (
              <p
                role="alert"
                className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
              >
                {formError}
              </p>
            ) : null}
            <Field id="u-name" label="Nombre completo *">
              {(a) => (
                <Input
                  {...a}
                  autoFocus
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              )}
            </Field>
            <Field id="u-email" label="Correo electrónico *">
              {(a) => (
                <Input
                  {...a}
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              )}
            </Field>
            <Field id="u-role" label="Rol *" hint="Define qué puede ver y hacer en la plataforma.">
              {(a) => (
                <Select
                  {...a}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {assignable.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreating(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                Crear usuario
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={issued !== null} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent
          className="w-[min(92vw,30rem)]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {issued ? (
            <div className="grid gap-5 p-6">
              <div className="grid gap-1">
                <DialogTitle className="text-base font-semibold text-fg">
                  Contraseña temporal
                </DialogTitle>
                <DialogDescription className="text-sm text-muted">
                  Para {issued.who}.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 rounded-control border border-gold-deep bg-surface px-4 py-3">
                <code className="tabular flex-1 select-all break-all text-lg tracking-wider text-gold">
                  {issued.password}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void copy()}
                  aria-label="Copiar contraseña"
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
              <p
                role="note"
                className="flex items-start gap-2.5 rounded-control border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm text-warning"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Se muestra <strong>una sola vez</strong>: no queda guardada. La persona debe
                  cambiarla al entrar, desde su menú de cuenta → Cambiar contraseña.
                </span>
              </p>
              <div className="flex justify-end">
                <Button type="button" variant="primary" onClick={() => setIssued(null)}>
                  Ya la copié, cerrar
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        {confirm ? (
          <AlertDialogContent
            title={
              confirm.kind === 'reset'
                ? '¿Restablecer la contraseña?'
                : '¿Deshabilitar este usuario?'
            }
            description={
              confirm.kind === 'reset'
                ? `${confirm.member.name || confirm.member.email} perderá su acceso actual y recibirá una contraseña temporal.`
                : `${confirm.member.name || confirm.member.email} ya no podrá entrar. Su historial se conserva y puedes habilitarlo de nuevo.`
            }
            confirmLabel={confirm.kind === 'reset' ? 'Restablecer' : 'Deshabilitar'}
            loading={busy}
            onConfirm={() => void runConfirm()}
          />
        ) : null}
      </AlertDialog>
    </div>
  );
}
