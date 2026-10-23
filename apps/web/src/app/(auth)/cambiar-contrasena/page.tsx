import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StarDivider } from '@/components/brand/star-divider';
import { Wordmark } from '@/components/brand/wordmark';
import { ChangePasswordForm } from '@/components/account/change-password-form';
import { getSessionUser } from '@/lib/session';
import { SignOutButton } from './sign-out-button';

export const metadata: Metadata = { title: 'Crea tu contraseña' };

/** Outside the app shell on purpose: with a temporary password nothing else is reachable. */
export default async function ForcedPasswordChangePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.mustChangePassword) redirect('/');

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-8 px-6 py-12">
      <Wordmark />
      <div className="grid gap-4 animate-fade-up">
        <h1 className="font-display text-4xl font-semibold leading-none tracking-tight text-fg">
          Crea tu contraseña
        </h1>
        <StarDivider className="w-44" />
        <p className="text-sm leading-relaxed text-muted">
          Hola, {user.name.split(' ')[0]}. Entraste con una contraseña temporal que alguien más
          conoce. Elige la tuya para continuar.
        </p>
      </div>
      <ChangePasswordForm forced currentLabel="Contraseña temporal" />
      <SignOutButton />
    </main>
  );
}
