import Link from 'next/link';
import { StarDivider } from '@/components/brand/star-divider';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div className="grid justify-items-center gap-6">
        <Wordmark />
        <StarDivider />
        <h1 className="font-display text-5xl font-semibold text-fg">Página no encontrada</h1>
        <p className="max-w-sm text-sm text-muted">
          La dirección no existe o fue movida. Vuelve al inicio para continuar.
        </p>
        <Button asChild variant="primary">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </main>
  );
}
