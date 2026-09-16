'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createOrganizationSchema, fieldErrors } from '@/lib/validation';

export interface CreateOrgState {
  errors?: Record<string, string>;
}

export async function createOrganization(
  _previous: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const user = await requireUser();

  const parsed = createOrganizationSchema.safeParse({
    legal_name: formData.get('legal_name'),
    service_area_state: formData.get('service_area_state'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();

  // The id is generated here rather than by the database, so that this insert
  // does not need a RETURNING clause.
  //
  // That is not a style preference. Chaining .select() onto .insert() makes
  // PostgREST issue INSERT ... RETURNING, and RETURNING requires the SELECT
  // policy to pass as well as the INSERT policy. organizations_select requires
  // membership — and the trigger that makes the creator an administrator is an
  // AFTER INSERT trigger, so at the moment RETURNING is evaluated the creator
  // is not a member yet. The row goes in and is then judged invisible, which
  // Postgres reports as "new row violates row-level security policy": an
  // insert-shaped message for what is really a visibility failure.
  //
  // Loosening organizations_select to `or created_by = auth.uid()` would also
  // fix it, at the cost of letting a removed administrator keep reading the
  // organization's profile forever. Not returning the row is the cheaper fix.
  const organizationId = crypto.randomUUID();

  // Inserted as the signed-in user, so the RLS insert policy applies: the row
  // is rejected unless created_by is this user.
  const { error } = await supabase.from('organizations').insert({
    id: organizationId,
    legal_name: parsed.data.legal_name,
    service_area_state: parsed.data.service_area_state,
    created_by: user.id,
  });

  if (error) {
    return { errors: { _form: error.message } };
  }

  await recordAuditEvent({
    organizationId,
    actorUserId: user.id,
    action: 'organization.created',
    entityType: 'organization',
    entityId: organizationId,
    summary: `Created ${parsed.data.legal_name}`,
  });

  redirect('/organization?welcome=1');
}
