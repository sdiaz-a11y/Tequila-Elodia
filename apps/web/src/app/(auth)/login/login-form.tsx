'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ApiError, api } from '@/lib/api';

const schema = z.object({
  email: z.email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
  totpCode: z.string().optional(),
});
type Values = z.infer<typeof schema>;

function messageFor(error: ApiError): string {
  if (error.status === 429)
    return 'Demasiados intentos. Espera un minuto antes de volver a intentarlo.';
  if (error.status === 401)
    return 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.';
  if (error.status === 0) return error.message;
  return 'No pudimos iniciar tu sesión. Inténtalo de nuevo en unos minutos.';
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', totpCode: '' },
  });

  const codeField = register('totpCode');

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await api('/auth/login', {
        method: 'POST',
        body: {
          email: values.email.trim(),
          password: values.password,
          ...(step === 'totp' && values.totpCode ? { totpCode: values.totpCode } : {}),
        },
      });
      router.replace(next);
      router.refresh();
    } catch (e) {
      if (!(e instanceof ApiError))
        return setFormError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      if (e.code === 'totp_required') {
        setStep('totp');
        setTimeout(() => codeRef.current?.focus(), 50);
        return;
      }
      if (e.code === 'totp_invalid') {
        setValue('totpCode', '');
        return setError('totpCode', {
          message: 'El código no es válido o ya venció. Prueba con el siguiente.',
        });
      }
      setFormError(messageFor(e));
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="grid gap-5">
      {formError ? (
        <p
          role="alert"
          className="animate-pop-in rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
        >
          {formError}
        </p>
      ) : null}

      {step === 'credentials' ? (
        <>
          <Field id="email" label="Correo electrónico" error={errors.email?.message}>
            {({ invalid, ...a11y }) => (
              <Input
                {...a11y}
                invalid={invalid}
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                placeholder="nombre@empresa.mx"
                {...register('email')}
              />
            )}
          </Field>
          <Field id="password" label="Contraseña" error={errors.password?.message}>
            {({ invalid, ...a11y }) => (
              <div className="relative">
                <Input
                  {...a11y}
                  invalid={invalid}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-faint transition-colors hover:text-fg"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            )}
          </Field>
        </>
      ) : (
        <div className="grid gap-5 animate-fade-up">
          <div className="flex items-start gap-3 rounded-control border border-line bg-surface-2/60 p-3.5">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
            <p className="text-sm text-muted">
              Tu cuenta usa verificación en dos pasos. Escribe el código de 6 dígitos de tu app de
              autenticación.
            </p>
          </div>
          <Field id="totpCode" label="Código de verificación" error={errors.totpCode?.message}>
            {({ invalid, ...a11y }) => (
              <Input
                {...a11y}
                invalid={invalid}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="tabular text-center text-xl tracking-[0.5em]"
                {...codeField}
                ref={(el) => {
                  codeField.ref(el);
                  codeRef.current = el;
                }}
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  return codeField.onChange(e);
                }}
              />
            )}
          </Field>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isSubmitting}
        className="mt-1 w-full"
      >
        {step === 'totp' ? 'Verificar y entrar' : 'Entrar'}
      </Button>

      {step === 'totp' ? (
        <button
          type="button"
          onClick={() => {
            setStep('credentials');
            setValue('totpCode', '');
            setFormError(null);
          }}
          className="justify-self-center text-sm text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          Usar otra cuenta
        </button>
      ) : null}
    </form>
  );
}
