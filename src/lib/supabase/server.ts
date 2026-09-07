import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client that acts as the signed-in user.
 *
 * This is the default client for everything in the app. It carries the user's
 * JWT, so every query is filtered by the row-level security policies in
 * supabase/migrations/0001_core.sql. If a query returns nothing, that is the
 * database refusing — not a bug to work around with the service role.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // middleware.ts refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
