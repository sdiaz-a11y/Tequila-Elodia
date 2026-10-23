'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await api('/auth/logout', { method: 'POST' });
        } finally {
          router.replace('/login');
          router.refresh();
        }
      }}
      className="justify-self-center text-sm text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
    >
      Cerrar sesión
    </button>
  );
}
