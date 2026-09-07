import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';
import { publicEnv, serviceRoleKey } from '@/lib/env';

/**
 * Service-role client. BYPASSES ROW-LEVEL SECURITY ENTIRELY.
 *
 * Permitted uses, and no others:
 *   1. Writing extracted page text (clients have no INSERT grant on
 *      document_pages, by design — page text must come from the parser).
 *   2. Writing audit events (an append-only log the client cannot forge).
 *   3. Storing and reading document bytes, and minting short-lived signed URLs.
 *
 * Every one of those call sites must have already checked the caller's identity
 * and organization membership with the *user* client first. The rule of thumb:
 * authorisation is decided by row-level security, and this client is only used
 * to perform work that RLS deliberately forbids clients from doing themselves.
 *
 * The `server-only` import above makes the build fail if this module is ever
 * reached from a client component.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
