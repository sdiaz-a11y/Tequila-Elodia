import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { SessionProvider } from '@/lib/session-client';
import { getSessionUser } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  // An administrator-issued temporary password only unlocks the screen that replaces it.
  if (user.mustChangePassword) redirect('/cambiar-contrasena');
  const collapsed = (await cookies()).get('elodia_sidebar')?.value === '1';

  return (
    <SessionProvider user={user}>
      <AppShell initialCollapsed={collapsed}>{children}</AppShell>
    </SessionProvider>
  );
}
