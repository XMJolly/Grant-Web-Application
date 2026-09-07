import { z } from 'zod';

/**
 * Input schemas.
 *
 * These mirror the CHECK constraints in supabase/migrations/0001_core.sql on
 * purpose. The database is the real guarantee; these exist so the user gets a
 * readable message next to the field they mistyped instead of a Postgres error.
 * If you change one, change the other.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

export const organizationProfileSchema = z.object({
  legal_name: z
    .string()
    .trim()
    .min(2, 'Enter your organization’s legal name.')
    .max(200, 'That name is too long.'),
  ein: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .refine((value) => value === null || /^\d{2}-\d{7}$/.test(value), {
      message: 'An EIN looks like 12-3456789.',
    }),
  mission: optionalText(4000),
  founded_year: z.coerce
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear(), 'That year is in the future.')
    .nullable()
    .catch(null),
  tax_exempt_status: z
    .enum(['501c3', '501c4', '501c6', 'fiscally_sponsored', 'government', 'other', 'none', 'unknown'])
    .nullable()
    .catch(null),
  annual_budget_usd: z.coerce.number().min(0).max(1_000_000_000).nullable().catch(null),
  annual_budget_fy: z.coerce.number().int().min(1800).max(2100).nullable().catch(null),
  service_area_state: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'Use the two-letter state code, for example MD.')
    .nullable()
    .catch(null),
  service_area_counties: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 50),
    )
    .catch([]),
  website: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .refine((value) => value === null || /^https?:\/\/.+/i.test(value), {
      message: 'Start the address with http:// or https://',
    }),
  emma_registered: z.coerce.boolean().nullable().catch(null),
  state_good_standing: z.coerce.boolean().nullable().catch(null),
});

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;

export const createOrganizationSchema = z.object({
  legal_name: z.string().trim().min(2, 'Enter your organization’s legal name.').max(200),
  service_area_state: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'Use the two-letter state code, for example MD.'),
});

export const documentCategorySchema = z.enum([
  'determination_letter',
  'annual_report',
  'budget',
  'financial_statement',
  'board_list',
  'staff_record',
  'policy',
  'program_description',
  'past_application',
  'registration',
  'other',
]);

export const roleSchema = z.enum(['admin', 'staff', 'reviewer', 'volunteer']);

/**
 * Turns a ZodError into a map the form components can render field by field.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Strips anything that could steer a stored filename somewhere unexpected. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'document';
  return (
    base
      .replace(/[^\w.\- ]+/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/^\.+/, '')
      .slice(0, 200) || 'document'
  );
}
