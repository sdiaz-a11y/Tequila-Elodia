import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StarDivider } from '@/components/brand/star-divider';
import { Wordmark } from '@/components/brand/wordmark';
import { safeNext } from '@/lib/nav';
import { getSessionUser } from '@/lib/session';
import { BottleStage } from './bottle-stage';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getSessionUser()) redirect(target);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(28rem,0.85fr)_1.15fr]">
      <main className="relative flex flex-col justify-between gap-12 overflow-hidden px-6 py-8 sm:px-14 lg:px-20 lg:py-12">
        {/* Ambient warmth for phones, where the bottle stage is hidden. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-gold-2/10 blur-3xl lg:hidden"
        />
        <Wordmark />

        <div className="relative grid w-full max-w-sm gap-8 animate-fade-up">
          <div className="grid gap-4">
            <h1 className="font-display text-[2.75rem] font-semibold leading-none tracking-tight text-fg sm:text-5xl">
              Bienvenido
            </h1>
            <StarDivider draw className="w-44" />
            <p className="text-sm leading-relaxed text-muted">
              Plataforma privada de dirección, comercialización y expansión de la marca. Acceso solo
              para el equipo autorizado.
            </p>
          </div>
          <LoginForm next={target} />
        </div>

        <p className="text-xs leading-relaxed text-faint">
          Acceso restringido. La actividad de cada cuenta queda registrada.
        </p>
      </main>
      <BottleStage />
    </div>
  );
}
