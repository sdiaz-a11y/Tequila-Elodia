'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '@elodia/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ApiError, api } from '@/lib/api';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres`)
      .max(128, 'La contraseña es demasiado larga'),
    confirm: z.string().min(1, 'Repite la nueva contraseña'),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta de la actual',
  });
type Values = z.infer<typeof schema>;

function PasswordInput({
  show,
  onToggle,
  label,
  ...props
}: React.ComponentProps<typeof Input> & { show: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? `Ocultar ${label}` : `Mostrar ${label}`}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-faint transition-colors hover:text-fg"
      >
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

/**
 * Used both for the voluntary change (account menu) and for the forced change after a temporary
 * password. `forced` only changes the wording and where the user lands afterwards.
 */
export function ChangePasswordForm({
  forced = false,
  currentLabel = 'Contraseña actual',
}: {
  forced?: boolean;
  currentLabel?: string;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      });
      toast.success('Contraseña actualizada', {
        description: 'Cerramos tus otras sesiones abiertas por seguridad.',
      });
      reset();
      router.replace('/');
      router.refresh();
    } catch (e) {
      if (!(e instanceof ApiError))
        return setFormError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      if (e.fieldErrors.newPassword)
        return setError('newPassword', { message: e.fieldErrors.newPassword });
      if (e.status === 400 && /actual/i.test(e.message))
        return setError('currentPassword', { message: e.message });
      setFormError(e.status === 429 ? 'Demasiados intentos. Espera un momento.' : e.message);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="grid gap-5">
      {formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Field id="currentPassword" label={currentLabel} error={errors.currentPassword?.message}>
        {({ invalid, ...a11y }) => (
          <PasswordInput
            {...a11y}
            invalid={invalid}
            show={show}
            onToggle={() => setShow((s) => !s)}
            label="contraseñas"
            autoComplete="current-password"
            autoFocus
            {...register('currentPassword')}
          />
        )}
      </Field>
      <Field
        id="newPassword"
        label="Nueva contraseña"
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres. Una frase larga es mejor que una palabra con símbolos.`}
        error={errors.newPassword?.message}
      >
        {({ invalid, ...a11y }) => (
          <PasswordInput
            {...a11y}
            invalid={invalid}
            show={show}
            onToggle={() => setShow((s) => !s)}
            label="contraseñas"
            autoComplete="new-password"
            {...register('newPassword')}
          />
        )}
      </Field>
      <Field id="confirm" label="Repite la nueva contraseña" error={errors.confirm?.message}>
        {({ invalid, ...a11y }) => (
          <PasswordInput
            {...a11y}
            invalid={invalid}
            show={show}
            onToggle={() => setShow((s) => !s)}
            label="contraseñas"
            autoComplete="new-password"
            {...register('confirm')}
          />
        )}
      </Field>

      <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="mt-1">
        {forced ? 'Guardar y entrar' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}
