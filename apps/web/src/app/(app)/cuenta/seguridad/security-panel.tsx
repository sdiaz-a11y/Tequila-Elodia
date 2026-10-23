'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Check, Copy, LogOut, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { SESSION_KEY } from '@/components/providers';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session-client';

const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.';

export function SecurityPanel() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <TwoFactorCard />
      <SessionsCard />
    </div>
  );
}

function TwoFactorCard() {
  const user = useSession();
  const queryClient = useQueryClient();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const refreshSession = () => queryClient.invalidateQueries({ queryKey: SESSION_KEY });

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ secret: string; otpauthUri: string }>('/auth/2fa/setup', {
        method: 'POST',
      });
      const qr = await QRCode.toDataURL(res.otpauthUri, {
        margin: 1,
        width: 224,
        color: { dark: '#0e0e10', light: '#f5ebdd' },
      });
      setSetup({ secret: res.secret, qr });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/2fa/enable', { method: 'POST', body: { code } });
      setSetup(null);
      setCode('');
      await refreshSession();
      toast.success('Verificación en dos pasos activada', {
        description: 'Tus otras sesiones se cerraron por seguridad.',
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/2fa/disable', { method: 'POST', body: { password, code } });
      setDisabling(false);
      setPassword('');
      setCode('');
      await refreshSession();
      toast.success('Verificación en dos pasos desactivada');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copySecret() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('No se pudo copiar. Selecciona la clave manualmente.');
    }
  }

  const cancel = () => {
    setSetup(null);
    setDisabling(false);
    setCode('');
    setPassword('');
    setError(null);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle>Verificación en dos pasos</CardTitle>
          <CardDescription>
            Pide un código de tu app de autenticación además de la contraseña.
          </CardDescription>
        </div>
        {user.totpEnabled ? (
          <Badge tone="success">Activa</Badge>
        ) : (
          <Badge tone="neutral">No activada</Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-5">
        {error ? (
          <p
            role="alert"
            className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        {!user.totpEnabled && !setup ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-md text-sm text-muted">
              Opcional: añade una capa extra a tu cuenta. ELODIA OS no la exige a ninguna cuenta.
            </p>
            <Button variant="primary" loading={busy} onClick={start}>
              <ShieldCheck aria-hidden /> Activar verificación
            </Button>
          </div>
        ) : null}

        {setup ? (
          <form onSubmit={enable} className="grid gap-6 sm:grid-cols-[14rem_1fr]">
            <div className="grid justify-items-center gap-3">
              <Image
                src={setup.qr}
                alt="Código QR para tu app de autenticación"
                width={224}
                height={224}
                unoptimized
                className="rounded-control"
              />
            </div>
            <div className="grid content-start gap-4">
              <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted marker:text-gold">
                <li>Abre tu app de autenticación y escanea el código QR.</li>
                <li>Si no puedes escanear, escribe esta clave a mano:</li>
              </ol>
              <div className="flex items-center gap-2">
                <code className="tabular min-w-0 flex-1 break-all rounded-control border border-line bg-surface-2 px-3 py-2 text-[0.8125rem] tracking-wider text-fg">
                  {setup.secret}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={copySecret}
                  aria-label="Copiar clave"
                >
                  {copied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
                </Button>
              </div>
              <Field
                id="totp-enable"
                label="Código de 6 dígitos"
                hint="El código cambia cada 30 segundos."
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="tabular max-w-44 text-center text-lg tracking-[0.4em]"
                  />
                )}
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" loading={busy} disabled={code.length !== 6}>
                  Confirmar y activar
                </Button>
                <Button type="button" variant="ghost" onClick={cancel}>
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        ) : null}

        {user.totpEnabled && !disabling ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-md text-sm text-muted">
              Cada inicio de sesión pedirá un código de tu app de autenticación.
            </p>
            <Button variant="secondary" onClick={() => setDisabling(true)}>
              <ShieldOff aria-hidden /> Desactivar
            </Button>
          </div>
        ) : null}

        {user.totpEnabled && disabling ? (
          <form onSubmit={disable} className="grid max-w-sm gap-4">
            <p className="text-sm text-muted">
              Para desactivarla confirma tu contraseña y un código vigente.
            </p>
            <Field id="totp-password" label="Contraseña">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <Field id="totp-disable" label="Código de 6 dígitos">
              {(a11y) => (
                <Input
                  {...a11y}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="tabular max-w-44 text-center text-lg tracking-[0.4em]"
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="danger"
                loading={busy}
                disabled={!password || code.length !== 6}
              >
                Desactivar verificación
              </Button>
              <Button type="button" variant="ghost" onClick={cancel}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SessionsCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function logoutAll() {
    setBusy(true);
    try {
      await api('/auth/logout-all', { method: 'POST' });
      queryClient.clear();
      router.replace('/login');
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sesiones</CardTitle>
        <CardDescription>
          Si usaste un equipo ajeno o sospechas de un acceso, cierra todas tus sesiones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="secondary">
              <LogOut aria-hidden /> Cerrar sesión en todos los dispositivos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            title="¿Cerrar todas tus sesiones?"
            description="Se cerrará tu sesión aquí y en cualquier otro dispositivo. Tendrás que iniciar sesión de nuevo."
            confirmLabel="Cerrar todas las sesiones"
            loading={busy}
            onConfirm={logoutAll}
          />
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
