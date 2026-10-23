import type { Metadata } from 'next';
import { SecurityPanel } from './security-panel';

export const metadata: Metadata = { title: 'Seguridad de la cuenta' };

export default function SecurityPage() {
  return (
    <div className="animate-fade-up mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-8">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Seguridad de la cuenta
        </h1>
        <p className="text-sm text-muted">
          Protege tu acceso a ELODIA OS. Esta información es solo tuya.
        </p>
      </header>
      <SecurityPanel />
    </div>
  );
}
