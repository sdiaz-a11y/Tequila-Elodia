import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset } from '@/lib/content';

/** Private files are shown through short-lived signed links created per page view (never public URLs). */
export async function withSignedUrls<T extends { storage_path: string }>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<(T & { url?: string })[]> {
  if (!rows.length) return rows;
  const { data } = await supabase.storage.from('brand').createSignedUrls(
    rows.map((r) => r.storage_path),
    3600,
  );
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? undefined }));
}

export type AssetWithUrl = Asset;
