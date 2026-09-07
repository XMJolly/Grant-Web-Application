import Link from 'next/link';

import { Alert, Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { STATUS_LABELS, formatDate } from '../documents/status';

/**
 * The handoff sets the bar for this screen: it must quickly answer four
 * questions — what should I consider, what is due next, what is missing, and
 * what must I report or get reimbursed?
 *
 * Three of the four need work that does not exist yet. Rather than fill them
 * with placeholder numbers, each says plainly what it will show and which phase
 * builds it. Inventing a "3 opportunities" tile on a product whose whole promise
 * is not inventing things would be the wrong first habit.
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const { count: documentCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true });

  const { count: readableCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'parsed');

  const org = session.organization;
  const missing = [
    !org.ein && 'Your EIN',
    !org.mission && 'Your mission statement',
    !org.tax_exempt_status && 'Your tax-exempt status',
    !org.founded_year && 'The year you were founded',
    org.annual_budget_usd === null && 'Your annual budget',
    org.service_area_counties.length === 0 && 'The counties you serve',
    org.emma_registered === null && 'Whether you are registered in eMMA',
  ].filter((item): item is string => Boolean(item));

  const unreadable = (documents ?? []).filter(
    (document) => document.status === 'no_text_layer' || document.status === 'failed',
  );

  return (
    <>
      <PageHeader
        title={`Welcome, ${org.legal_name}`}
        description="Everything below comes from what you have entered or uploaded. Nothing here is estimated."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Documents" value={documentCount ?? 0} />
        <Stat label="Readable by GrantPath" value={readableCount ?? 0} />
        <Stat label="Profile details still needed" value={missing.length} tone={missing.length ? 'warn' : 'verified'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="What information is missing?" description="Gaps that will block an eligibility check later.">
          {missing.length === 0 ? (
            <Alert tone="verified">
              Your profile is complete. That is most of what a first eligibility check needs.
            </Alert>
          ) : (
            <>
              <ul className="space-y-2 text-sm text-ink-soft">
                {missing.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warn-700" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/organization"
                className="mt-4 inline-block text-sm font-medium text-teal-700 underline"
              >
                Complete your profile
              </Link>
            </>
          )}

          {unreadable.length > 0 ? (
            <div className="mt-5">
              <Alert tone="warn" title={`${unreadable.length} document${unreadable.length === 1 ? '' : 's'} could not be read`}>
                Scanned files are stored safely but cannot support any facts yet.
              </Alert>
            </div>
          ) : null}
        </Card>

        <Card
          title="Recent documents"
          action={
            <Link href="/documents" className="text-sm font-medium text-teal-700 underline">
              All documents
            </Link>
          }
        >
          {!documents || documents.length === 0 ? (
            <EmptyState title="Nothing uploaded yet">
              Your determination letter and most recent annual report are the two most useful things
              to add first.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/documents/${document.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-ink hover:text-teal-700 hover:underline"
                  >
                    {document.file_name}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-faint">{formatDate(document.created_at)}</span>
                  <Badge tone={STATUS_LABELS[document.status].tone}>
                    {STATUS_LABELS[document.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="What is due next?">
          <NotYet phase="Phase 2">
            Deadlines appear here once you can add a grant application. Today there is nothing to
            show, and showing a number anyway would be a guess.
          </NotYet>
        </Card>

        <Card title="What should I consider, and what must I report?">
          <NotYet phase="Phases 3 and 4">
            Opportunity matching and post-award reporting come after the first application workflow
            is trustworthy.
          </NotYet>
        </Card>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warn' | 'verified';
}) {
  const colour =
    tone === 'warn' ? 'text-warn-700' : tone === 'verified' ? 'text-verified-700' : 'text-ink';
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${colour}`}>{value}</p>
    </div>
  );
}

function NotYet({ phase, children }: { phase: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-4 py-5">
      <Badge tone="neutral">Not built yet · {phase}</Badge>
      <p className="mt-2 text-sm text-ink-faint">{children}</p>
    </div>
  );
}
