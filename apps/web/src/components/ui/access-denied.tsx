import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/** Shown when the signed-in role cannot read a module. The API enforces it too; this is the friendly face. */
export function AccessDenied() {
  return (
    <Card className="animate-fade-up mx-auto mt-10 max-w-xl">
      <EmptyState
        icon={Lock}
        title="No tienes acceso a este módulo"
        description="Tu rol no incluye este módulo. Si lo necesitas, pide a un administrador que revise tus permisos."
        action={
          <Button asChild variant="secondary">
            <Link href="/">Volver al inicio</Link>
          </Button>
        }
      />
    </Card>
  );
}
