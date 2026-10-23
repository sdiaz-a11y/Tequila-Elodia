'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-xl">
      <EmptyState
        icon={TriangleAlert}
        title="No pudimos cargar esta página"
        description="Hubo un problema al obtener la información. Tus datos no se modificaron. Inténtalo de nuevo; si persiste, avisa al responsable técnico."
        action={
          <div className="grid justify-items-center gap-3">
            <Button variant="primary" onClick={reset}>
              Reintentar
            </Button>
            {error.digest ? (
              <p className="tabular text-xs text-faint">Referencia: {error.digest}</p>
            ) : null}
          </div>
        }
      />
    </Card>
  );
}
