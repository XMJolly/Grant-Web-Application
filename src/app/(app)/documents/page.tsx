import Link from 'next/link';

import { Alert, Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { CAN_UPLOAD, hasRole, requireSession } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { UploadForm } from './UploadForm';
import { CATEGORY_LABELS, STATUS_LABELS, formatBytes, formatDate } from './status';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  const canUpload = hasRole(session, CAN_UPLOAD);
  const rows = documents ?? [];

  return (
    <>
      <PageHeader
        title="Documents"
        description="Your private document library. Nothing here is shared outside your organization."
      />

      {error ? (
        <div className="mb-6">
          <Alert tone="critical" title="That upload did not go through">
            {error}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title={`${rows.length} document${rows.length === 1 ? '' : 's'}`}>
          {rows.length === 0 ? (
            <EmptyState title="No documents yet">
              Start with your IRS determination letter or a recent annual report. Those two answer
              most eligibility questions on their own.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((document) => {
                const status = STATUS_LABELS[document.status];
                return (
                  <li key={document.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/documents/${document.id}`}
                          className="block truncate font-medium text-ink hover:text-teal-700 hover:underline"
                        >
                          {document.file_name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {CATEGORY_LABELS[document.category]} · {formatBytes(document.byte_size)} ·{' '}
                          {formatDate(document.created_at)}
                          {document.page_count ? ` · ${document.page_count} pages` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {document.is_sensitive ? <Badge tone="neutral">Restricted</Badge> : null}
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {canUpload ? (
            <UploadForm />
          ) : (
            <Alert tone="info" title="Uploading is limited">
              Your role is {session.member.role}. Administrators and staff can add documents.
            </Alert>
          )}

          <Alert tone="info" title="About scanned files">
            Vouch only reads documents that contain real text. If you upload a scan, it is stored
            safely but marked unreadable rather than quietly producing nothing — OCR is planned, not
            built.
          </Alert>
        </div>
      </div>
    </>
  );
}
