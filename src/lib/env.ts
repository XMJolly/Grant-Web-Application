/**
 * Environment access with one job: make it impossible to leak a server secret
 * into a browser bundle by accident.
 *
 * Next.js only inlines variables prefixed with NEXT_PUBLIC_ into client code,
 * so the service-role key cannot travel there. The runtime guard below is a
 * second line of defence for the case where a "use server" pragma is forgotten
 * and a module is pulled into a client component.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

export function serviceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error(
      'The Supabase service-role key was requested in the browser. This is always a bug: ' +
        'the module that called this must be server-only.',
    );
  }
  return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const DOCUMENT_BUCKET = 'org-documents';

/** Matches the CHECK constraint on documents.byte_size and the bucket limit. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Download links are minted per click and expire quickly. */
export const SIGNED_URL_TTL_SECONDS = 60;
