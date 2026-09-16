import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Alert, Badge, Button, Card, PageHeader } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { CATEGORY_LABELS, STATUS_LABELS, formatBytes, formatDate } from '../status';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // No organization filter is needed. Row-level security already restricts this
  // to the caller's organization, and hides restricted categories from
  // volunteers. An id belonging to another nonprofit simply returns nothing.
  const { data: document } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (!document) notFound();

  const { data: pages } = await supabase
    .from('document_pages')
    .select('*')
    .eq('document_id', id)
    .order('page_number', { ascending: true });

  const status = STATUS_LABELS[document.status];

  return (
    <>
      <PageHeader
        title={document.file_name}
        description={`${CATEGORY_LABELS[document.category]} · ${formatBytes(document.byte_size)} · added ${formatDate(document.created_at)}`}
        action={
          <div className="flex items-center gap-3">
            <Link href="/documents" className="text-sm text-ink-soft underline">
              Back to documents
            </Link>
            <a href={`/api/documents/${document.id}/download`}>
              <Button variant="secondary" type="button">
                Open original
              </Button>
            </a>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        {document.is_sensitive ? <Badge tone="neutral">Restricted to admins and staff</Badge> : null}
        {document.page_count ? <Badge tone="neutral">{document.page_count} pages</Badge> : null}
      </div>

      {document.failure_reason ? (
        <div className="mb-6">
          <Alert
            tone={document.status === 'no_text_layer' ? 'warn' : 'critical'}
            title={
              document.status === 'no_text_layer'
                ? 'This document is a scan'
                : 'This document could not be read'
            }
          >
            {document.failure_reason}
          </Alert>
        </div>
      ) : null}

      <Card
        title="Extracted text"
        description="This is exactly what Vouch can read. Every fact it later proposes will point back to one of these pages."
      >
        {!pages || pages.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No text was extracted from this document, so it cannot support any facts.
          </p>
        ) : (
          <ol className="space-y-5">
            {pages.map((page) => (
              <li key={page.id}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {page.page_label}
                </p>
                {page.content.trim() === '' ? (
                  <p className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-faint">
                    No readable text on this page. It is probably an image.
                  </p>
                ) : (
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-canvas px-3 py-3 font-sans text-sm leading-relaxed text-ink-soft">
                    {page.content}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
