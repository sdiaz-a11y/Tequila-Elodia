import type { Metadata } from 'next';
import { BottleBadge } from '@/components/brand/bottle-badge';
import { AccessDenied } from '@/components/ui/access-denied';
import { canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Botella 3D' };

export default async function BottlePage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!canRead(user)) return <AccessDenied />;
  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Marketing</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Botella 3D</h1>
        <p className="max-w-2xl text-sm text-muted">
          Modelo de la botella reconstruido desde la foto oficial. Gira sola; arrastra para girarla
          a mano. El reverso va liso porque la foto no lo muestra.
        </p>
      </header>
      <div className="overflow-hidden rounded-card border border-line bg-[radial-gradient(ellipse_at_50%_35%,rgb(212_168_95/0.14),transparent_60%)]">
        <BottleBadge className="mx-auto h-[min(72vh,760px)] w-full max-w-xl cursor-grab active:cursor-grabbing" />
      </div>
    </div>
  );
}
