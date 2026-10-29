import { NextResponse, type NextRequest } from 'next/server';
import { buildIcs, type IcsEvent } from '@/lib/ics';
import { createAdminSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DAY = 864e5;
const CHANNELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  whatsapp: 'WhatsApp',
  web: 'Web',
  email: 'Correo',
  other: 'Otro',
};

/** Read-only calendar feed behind a secret per-person token (calendar apps cannot send a login cookie). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const raw = (await params).token.replace(/\.ics$/i, '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(raw))
    return new NextResponse('No encontrado', { status: 404 });

  const db = createAdminSupabase();
  const { data: tk } = await db
    .from('calendar_tokens')
    .select('user_id')
    .eq('token', raw)
    .maybeSingle();
  if (!tk) return new NextResponse('No encontrado', { status: 404 });

  const { data: profile } = await db
    .from('profiles')
    .select('role,active')
    .eq('id', tk.user_id)
    .maybeSingle();
  if (!profile?.active) return new NextResponse('No encontrado', { status: 404 });
  if (profile.role !== 'tech_superadmin') {
    const { data: cap } = await db
      .from('role_capabilities')
      .select('role')
      .eq('role', profile.role)
      .eq('capability', 'read')
      .maybeSingle();
    if (!cap) return new NextResponse('No encontrado', { status: 404 });
  }

  const from = new Date(Date.now() - 14 * DAY);
  const to = new Date(Date.now() + 180 * DAY);
  const [acts, tasks, posts] = await Promise.all([
    db
      .from('activities')
      .select('id,subject,notes,due_at,account:accounts(name)')
      .is('done_at', null)
      .gte('due_at', from.toISOString())
      .lte('due_at', to.toISOString()),
    db
      .from('tasks')
      .select('id,title,description,due_on')
      .neq('status', 'done')
      .gte('due_on', from.toISOString().slice(0, 10))
      .lte('due_on', to.toISOString().slice(0, 10)),
    db
      .from('content_items')
      .select('id,title,channel,status,scheduled_at')
      .in('status', ['draft', 'in_review', 'approved'])
      .gte('scheduled_at', from.toISOString())
      .lte('scheduled_at', to.toISOString()),
  ]);

  const events: IcsEvent[] = [
    ...(
      (acts.data ?? []) as unknown as {
        id: string;
        subject: string;
        notes: string | null;
        due_at: string;
        account: { name: string } | null;
      }[]
    ).map((a) => ({
      uid: `act-${a.id}`,
      summary: a.account ? `${a.subject} · ${a.account.name}` : a.subject,
      description: a.notes ?? undefined,
      start: a.due_at,
    })),
    ...(
      (tasks.data ?? []) as {
        id: string;
        title: string;
        description: string | null;
        due_on: string;
      }[]
    ).map((t) => ({
      uid: `task-${t.id}`,
      summary: `Tarea: ${t.title}`,
      description: t.description ?? undefined,
      start: t.due_on,
      allDay: true,
    })),
    ...(
      (posts.data ?? []) as { id: string; title: string; channel: string; scheduled_at: string }[]
    ).map((p) => ({
      uid: `post-${p.id}`,
      summary: `${CHANNELS[p.channel] ?? p.channel}: ${p.title}`,
      start: p.scheduled_at,
    })),
  ];

  return new NextResponse(buildIcs('ELODIA OS', events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
