import { NextResponse, type NextRequest } from 'next/server';

import { getSession } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { DOCUMENT_BUCKET, SIGNED_URL_TTL_SECONDS } from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Hands back a short-lived link to a private document.
 *
 * The authorisation check is the SELECT below, run as the signed-in user. Row
 * level security answers the question "may this person see this document?" —
 * including the rule that a volunteer cannot open a budget or a board list. If
 * the row comes back empty, the answer was no, and nothing distinguishes that
 * from a document that does not exist. The service role is used afterwards only
 * to mint the signed URL, which RLS has no way to do.
 *
 * The link expires in a minute and is never stored. There is no permanent
 * public URL for any document in this system.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: document } = await supabase
    .from('documents')
    .select('id, organization_id, storage_path, file_name')
    .eq('id', id)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: document.file_name,
    });

  if (error || !data) {
    return NextResponse.json({ error: 'The file could not be opened.' }, { status: 500 });
  }

  await recordAuditEvent({
    organizationId: document.organization_id,
    actorUserId: session.user.id,
    action: 'document.downloaded',
    entityType: 'document',
    entityId: document.id,
    summary: `Opened ${document.file_name}`,
  });

  return NextResponse.redirect(data.signedUrl, { status: 303 });
}
