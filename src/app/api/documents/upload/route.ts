import { NextResponse, type NextRequest } from 'next/server';

import { assertRole, CAN_UPLOAD, getSession } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { DOCUMENT_BUCKET, MAX_UPLOAD_BYTES } from '@/lib/env';
import { detectFileType, extractDocument, mimeForType } from '@/lib/extract';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { documentCategorySchema, safeFileName } from '@/lib/validation';

/**
 * Private document upload.
 *
 * Order of operations matters here, and it is deliberate:
 *
 *   1. Identify the caller and their organization.
 *   2. Check the role.
 *   3. Validate the bytes — size, then magic bytes. The browser-supplied
 *      filename and Content-Type are never trusted; both are attacker
 *      controlled and a .pdf can contain anything.
 *   4. Insert the metadata row *as the user*, so row-level security decides
 *      whether this upload is permitted. If the policy says no, nothing has
 *      been stored yet.
 *   5. Only then write the bytes with the service role, at a path the database
 *      has already constrained to start with the organization's id.
 *   6. Extract page text and record an audit event.
 *
 * If step 5 fails the metadata row is removed, so the table never advertises a
 * document that does not exist.
 *
 * Extraction runs inline. That is fine for the 25 MiB ceiling and keeps the
 * moving parts down, but it is the first thing to move to a Cloudflare Queue
 * in Milestone 2, when an AI call joins the pipeline and the work stops fitting
 * inside a single request. `processDocument` is already separated for that.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    assertRole(session, CAN_UPLOAD, 'upload documents');
  } catch (error) {
    return fail(request, error instanceof Error ? error.message : 'Not permitted.');
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return fail(request, 'Choose a file to upload.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(request, `That file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }

  const category = documentCategorySchema.safeParse(form.get('category'));
  if (!category.success) {
    return fail(request, 'Choose what kind of document this is.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFileType(bytes);
  if (detected === 'unknown') {
    return fail(
      request,
      'Vouch accepts PDF and Word (.docx) files. That file is neither, whatever its name says.',
    );
  }

  const documentId = crypto.randomUUID();
  const fileName = safeFileName(file.name);
  const storagePath = `${session.organization.id}/${documentId}/${fileName}`;
  const sha256 = await hashHex(bytes);

  const supabase = await createSupabaseServerClient();
  const { error: insertError } = await supabase.from('documents').insert({
    id: documentId,
    organization_id: session.organization.id,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: mimeForType(detected),
    byte_size: file.size,
    sha256,
    category: category.data,
    status: 'uploaded',
    uploaded_by: session.user.id,
  });

  if (insertError) {
    return fail(request, `The document could not be saved. ${insertError.message}`);
  }

  const admin = createSupabaseAdminClient();
  const { error: storageError } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, { contentType: mimeForType(detected), upsert: false });

  if (storageError) {
    await admin.from('documents').delete().eq('id', documentId);
    return fail(request, `The file could not be stored. ${storageError.message}`);
  }

  await recordAuditEvent({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: 'document.uploaded',
    entityType: 'document',
    entityId: documentId,
    summary: `Uploaded ${fileName}`,
    metadata: { category: category.data, byte_size: file.size, sha256 },
  });

  await processDocument(documentId, bytes, detected);

  return NextResponse.redirect(new URL(`/documents/${documentId}`, request.url), { status: 303 });
}

/**
 * Turns stored bytes into citable page text.
 *
 * Writes with the service role because `authenticated` has no INSERT grant on
 * document_pages — page text must come from the parser, never from a client.
 */
async function processDocument(
  documentId: string,
  bytes: Uint8Array,
  type: 'pdf' | 'docx',
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from('documents').update({ status: 'parsing' }).eq('id', documentId);

  const result = await extractDocument(bytes, type);

  if (!result.hasTextLayer) {
    await admin
      .from('documents')
      .update({
        status: type === 'pdf' ? 'no_text_layer' : 'failed',
        has_text_layer: false,
        page_count: 0,
        extracted_char_count: 0,
        failure_reason: result.failureReason ?? null,
      })
      .eq('id', documentId);
    return;
  }

  const { error } = await admin.from('document_pages').insert(
    result.pages.map((page) => ({
      document_id: documentId,
      page_number: page.pageNumber,
      page_label: page.pageLabel,
      content: page.content,
    })),
  );

  if (error) {
    await admin
      .from('documents')
      .update({ status: 'failed', failure_reason: `Page text could not be saved. ${error.message}` })
      .eq('id', documentId);
    return;
  }

  await admin
    .from('documents')
    .update({
      status: 'parsed',
      has_text_layer: true,
      page_count: result.pages.length,
      extracted_char_count: result.pages.reduce((sum, page) => sum + page.content.length, 0),
      failure_reason: null,
    })
    .eq('id', documentId);
}

async function hashHex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fail(request: NextRequest, message: string) {
  const url = new URL('/documents', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url, { status: 303 });
}
