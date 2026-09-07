import type { DocumentCategory, DocumentStatus } from '@/lib/database.types';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  determination_letter: 'IRS determination letter',
  annual_report: 'Annual report',
  budget: 'Budget',
  financial_statement: 'Financial statement',
  board_list: 'Board list',
  staff_record: 'Staff record',
  policy: 'Policy',
  program_description: 'Program description',
  past_application: 'Past application',
  registration: 'Registration or certificate',
  other: 'Other',
};

/** Categories the database marks sensitive; volunteers cannot open these. */
export const SENSITIVE_CATEGORIES: DocumentCategory[] = [
  'budget',
  'financial_statement',
  'board_list',
  'staff_record',
];

export const STATUS_LABELS: Record<
  DocumentStatus,
  { label: string; tone: 'neutral' | 'verified' | 'warn' | 'critical' | 'info' }
> = {
  uploaded: { label: 'Stored', tone: 'neutral' },
  parsing: { label: 'Reading…', tone: 'info' },
  parsed: { label: 'Readable', tone: 'verified' },
  no_text_layer: { label: 'Scan — cannot read', tone: 'warn' },
  failed: { label: 'Could not read', tone: 'critical' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
