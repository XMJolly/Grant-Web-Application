'use server';

import { revalidatePath } from 'next/cache';

import { assertRole, CAN_MANAGE_MEMBERS, requireSession } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { roleSchema } from '@/lib/validation';

export interface RoleState {
  error?: string;
  saved?: string;
}

export async function changeMemberRole(
  _previous: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const session = await requireSession();

  try {
    assertRole(session, CAN_MANAGE_MEMBERS, 'change roles');
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Not permitted.' };
  }

  const memberId = String(formData.get('member_id') ?? '');
  const role = roleSchema.safeParse(formData.get('role'));
  if (!memberId || !role.success) return { error: 'Choose a valid role.' };

  const supabase = await createSupabaseServerClient();

  // Guard against an organization locking itself out. The database cannot
  // express "there must always be at least one admin" as a row policy, so it
  // is checked here — and it is checked against RLS-filtered rows, which means
  // it can only ever count admins of the caller's own organization.
  const { data: admins } = await supabase
    .from('organization_members')
    .select('id')
    .eq('role', 'admin');

  const isLastAdmin = (admins ?? []).length <= 1 && (admins ?? [])[0]?.id === memberId;
  if (isLastAdmin && role.data !== 'admin') {
    return {
      error:
        'This is the only administrator. Give someone else the administrator role first, then change this one.',
    };
  }

  const { error } = await supabase
    .from('organization_members')
    .update({ role: role.data })
    .eq('id', memberId);

  if (error) return { error: error.message };

  await recordAuditEvent({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: 'member.role_changed',
    entityType: 'organization_member',
    entityId: memberId,
    summary: `Set role to ${role.data}`,
    metadata: { role: role.data },
  });

  revalidatePath('/members');
  return { saved: memberId };
}
