import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from './change-password-form';

export const metadata: Metadata = { title: 'Cambiar contraseña' };

export default function ChangePasswordPage() {
  return (
    <div className="animate-fade-up mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-8">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Cambiar contraseña
        </h1>
        <p className="text-sm text-muted">Usa una frase larga que solo tú recuerdes.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Contraseña</CardTitle>
          <CardDescription>
            Necesitamos tu contraseña actual para confirmar que eres tú.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
