import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessDenied } from '@/components/ui/access-denied';
import { emailConfigured } from '@/lib/email';
import { canAdmin, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { CalendarLink } from './calendar-link';

export const metadata: Metadata = { title: 'Integraciones' };

export default async function IntegrationsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!canRead(user)) return <AccessDenied />;

  const supabase = await createSupabase();
  const { data } = await supabase
    .from('calendar_tokens')
    .select('token')
    .eq('user_id', user.id)
    .maybeSingle();
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const email = emailConfigured();

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Sistema</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Integraciones
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Conexiones con herramientas que ya usas. Ninguna cuesta ni envía nada por su cuenta.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendario en tu celular</CardTitle>
            <CardDescription>
              Suscribe Google Calendar o el calendario del iPhone y verás aquí tus actividades
              pendientes, tareas con fecha y publicaciones programadas. Es solo lectura y se
              actualiza solo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarLink
              origin={`${proto}://${host}`}
              initialToken={(data?.token as string | undefined) ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>WhatsApp</CardTitle>
              <Badge tone="success">Activo</Badge>
            </div>
            <CardDescription>
              En Empresas y Contactos, el menú de cada fila con teléfono trae «Escribir por
              WhatsApp». Abre el chat con un mensaje inicial; tú lo envías. No usa la API de pago.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Rastreo de envíos</CardTitle>
              <Badge tone="success">Activo</Badge>
            </div>
            <CardDescription>
              En un pedido enviado, la guía abre el rastreo oficial para DHL, FedEx y UPS. Con otras
              paqueterías la guía se muestra como texto.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Cotizaciones por correo</CardTitle>
              <Badge tone={email ? 'success' : 'neutral'}>
                {email ? 'Activo' : 'Sin configurar'}
              </Badge>
            </div>
            <CardDescription>
              {email
                ? 'En una cotización aparece «Enviar por correo». El cliente recibe el detalle y puede responderte directo; queda registrado en las actividades de la empresa.'
                : 'Para activarlo hace falta una cuenta en Resend (tiene plan gratuito) con el dominio del correo verificado, y cargar RESEND_API_KEY y EMAIL_FROM en las variables de entorno de Vercel. Hasta entonces el botón no aparece.'}
            </CardDescription>
          </CardHeader>
          {!email && canAdmin(user) ? (
            <CardContent>
              <p className="text-sm text-muted">
                EMAIL_FROM lleva el formato{' '}
                <code className="text-fg">ELODIA &lt;ventas@tudominio.com&gt;</code>.
              </p>
            </CardContent>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
