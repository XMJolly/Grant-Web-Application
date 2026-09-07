'use server';

import { revalidatePath } from 'next/cache';

import { assertRole, CAN_MANAGE_ORG, requireSession } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fieldErrors, organizationProfileSchema } from '@/lib/validation';

export interface ProfileState {
  errors?: Record<string, string>;
  saved?: boolean;
}

const TRISTATE = (value: FormDataEntryValue | null): boolean | null =>
  value === 'yes' ? true : value === 'no' ? false : null;

export async function saveOrganizationProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await requireSession();

  try {
    assertRole(session, CAN_MANAGE_ORG, 'edit the organization profile');
  } catch (error) {
    return { errors: { _form: error instanceof Error ? error.message : 'Not permitted.' } };
  }

  const parsed = organizationProfileSchema.safeParse({
    legal_name: formData.get('legal_name'),
    ein: formData.get('ein') ?? '',
    mission: formData.get('mission') ?? '',
    founded_year: formData.get('founded_year') || null,
    tax_exempt_status: formData.get('tax_exempt_status') || null,
    annual_budget_usd: formData.get('annual_budget_usd') || null,
    annual_budget_fy: formData.get('annual_budget_fy') || null,
    service_area_state: formData.get('service_area_state') || null,
    service_area_counties: formData.get('service_area_counties') ?? '',
    website: formData.get('website') ?? '',
    emma_registered: TRISTATE(formData.get('emma_registered')),
    state_good_standing: TRISTATE(formData.get('state_good_standing')),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('organizations')
    .update({
      ...parsed.data,
      emma_registered: TRISTATE(formData.get('emma_registered')),
      state_good_standing: TRISTATE(formData.get('state_good_standing')),
    })
    .eq('id', session.organization.id);

  if (error) return { errors: { _form: error.message } };

  await recordAuditEvent({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: 'organization.profile_updated',
    entityType: 'organization',
    entityId: session.organization.id,
    summary: 'Updated the organization profile',
  });

  revalidatePath('/organization');
  revalidatePath('/dashboard');
  return { saved: true };
}
