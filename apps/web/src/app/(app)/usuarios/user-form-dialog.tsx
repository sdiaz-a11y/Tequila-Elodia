'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ROLE_LABELS, type AdminRole, type AdminUser, type RoleKey } from '@elodia/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';

const schema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre completo').max(120, 'El nombre es muy largo'),
  email: z.email('Escribe un correo válido'),
  roleId: z.string().min(1, 'Elige un rol'),
});
export type UserFormValues = z.infer<typeof schema>;

export const roleLabel = (r: { key: string; name: string }): string =>
  ROLE_LABELS[r.key as RoleKey] ?? r.name;

/** Create (all fields) or edit (the email is the login identity and does not change). */
export function UserFormDialog({
  open,
  user,
  roles,
  submitting,
  serverError,
  onSubmit,
  onClose,
}: {
  open: boolean;
  /** Present = edit mode. */
  user: AdminUser | null;
  roles: AdminRole[];
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
}) {
  const editing = user !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', roleId: '' },
  });

  useEffect(() => {
    if (open)
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        roleId: user?.roles[0]?.id ?? '',
      });
  }, [open, user, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="w-[min(92vw,30rem)]">
        <form
          noValidate
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="grid gap-5 p-6"
        >
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">
              {editing ? 'Editar usuario' : 'Nuevo usuario'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted">
              {editing
                ? 'El correo es la identidad de acceso y no se puede cambiar.'
                : 'Se genera una contraseña temporal que verás una sola vez. La persona la cambia al entrar.'}
            </DialogDescription>
          </div>

          {serverError ? (
            <p
              role="alert"
              className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
            >
              {serverError}
            </p>
          ) : null}

          <Field id="user-name" label="Nombre completo" error={errors.name?.message}>
            {({ invalid, ...a11y }) => (
              <Input
                {...a11y}
                invalid={invalid}
                autoComplete="off"
                autoFocus
                {...register('name')}
              />
            )}
          </Field>
          <Field id="user-email" label="Correo electrónico" error={errors.email?.message}>
            {({ invalid, ...a11y }) => (
              <Input
                {...a11y}
                invalid={invalid}
                type="email"
                inputMode="email"
                autoComplete="off"
                disabled={editing}
                placeholder="nombre@empresa.mx"
                {...register('email')}
              />
            )}
          </Field>
          <Field
            id="user-role"
            label="Rol"
            hint="Define qué puede ver y hacer. Solo puedes asignar roles que tu cuenta tiene permitido dar."
            error={errors.roleId?.message}
          >
            {({ invalid, ...a11y }) => (
              <Select {...a11y} invalid={invalid} {...register('roleId')}>
                <option value="">Elige un rol…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {roleLabel(r)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
