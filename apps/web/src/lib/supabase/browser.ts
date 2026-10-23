import { createBrowserClient } from '@supabase/ssr';

/** Browser client with the publishable key. Only used to upload files straight to Storage; Storage policies decide who may. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
