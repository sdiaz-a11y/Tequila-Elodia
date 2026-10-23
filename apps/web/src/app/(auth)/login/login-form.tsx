'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const schema = z.object({
  email: z.email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});
type Values = z.infer<typeof schema>;

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const res = await login({ email: values.email.trim(), password: values.password });
      if (!res.ok) return setFormError(res.error ?? 'No pudimos iniciar tu sesión.');
      router.replace(next);
      router.refresh();
    } catch {
      setFormError('No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo.');
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

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isSubmitting}
        className="mt-1 w-full"
      >
        Entrar
      </Button>
    </form>
  );
}
