import 'server-only';

/**
 * Outgoing email through Resend (https://resend.com). Off until RESEND_API_KEY and EMAIL_FROM are set,
 * so nothing is ever sent, or billed, without the owner setting it up.
 */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!emailConfigured())
    return { ok: false, error: 'El envío de correo aún no está configurado.' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok)
      return {
        ok: false,
        error: 'El proveedor de correo rechazó el envío. Revisa la configuración.',
      };
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo contactar al proveedor de correo. Intenta de nuevo.' };
  }
}
