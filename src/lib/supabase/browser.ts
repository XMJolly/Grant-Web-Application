import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';

/** Browser client. Anon key only — it can never see another organization's rows. */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
