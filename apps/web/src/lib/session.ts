import 'server-only';
import { cache } from 'react';
import {
  ROLE_KEYS,
  grantsForRole,
  permissionKey,
  type RoleKey,
  type SessionUser,
} from '@elodia/shared';
import { createSupabase } from '@/lib/supabase/server';

/**
 * The signed-in user, validated against Supabase Auth on every request (never trusting the cookie
 * alone) plus their active profile. Permissions are derived from the role; the database enforces
 * the same rules with Row Level Security.
 */
export const getSessionUser = cache(
  async (): Promise<(SessionUser & { capabilities: string[] }) | null> => {
    const supabase = await createSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id,email,name,role,active')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (!profile?.active || !(ROLE_KEYS as readonly string[]).includes(profile.role)) return null;

    const permissions: SessionUser['permissions'] = {};
    for (const g of grantsForRole(profile.role as RoleKey))
      permissions[permissionKey(g.resource, g.action)] = g.scope;

    const { data: caps } = await supabase
      .from('role_capabilities')
      .select('capability')
      .eq('role', profile.role);
    const capabilities = (caps ?? []).map((c) => c.capability as string);

    return {
      id: profile.id,
      organizationId: 'elodia',
      email: profile.email,
      name: profile.name || profile.email,
      roles: [profile.role],
      totpEnabled: false,
      mustChangePassword: false,
      permissions,
      capabilities,
    };
  },
);
