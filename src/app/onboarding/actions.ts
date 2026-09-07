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

  // Inserted as the signed-in user, so the RLS insert policy applies: the row
  // is rejected unless created_by is this user. A database trigger then makes
  // the creator the organization's first administrator.
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      legal_name: parsed.data.legal_name,
      service_area_state: parsed.data.service_area_state,
      created_by: user.id,
    })
    .select('id, legal_name')
    .single();

  if (error || !data) {
    return { errors: { _form: error?.message ?? 'The organization could not be created.' } };
  }

  await recordAuditEvent({
    organizationId: data.id,
    actorUserId: user.id,
    action: 'organization.created',
    entityType: 'organization',
    entityId: data.id,
    summary: `Created ${data.legal_name}`,
  });

  redirect('/organization?welcome=1');
}
