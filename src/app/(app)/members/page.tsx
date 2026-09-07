import { Alert, Badge, Card, PageHeader } from '@/components/ui';
import { CAN_MANAGE_MEMBERS, hasRole, requireSession } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { RoleForm } from './RoleForm';

const ROLE_NOTES: Record<string, string> = {
  admin: 'Settings, roles, approvals, and final submission.',
  staff: 'Documents, applications, drafts, and assigned tasks.',
  reviewer: 'Comments and approvals, plus the audit history.',
  volunteer: 'Assigned tasks only. Cannot open financial or personnel documents.',
};

export default async function MembersPage() {
  const session = await requireSession();
  const canManage = hasRole(session, CAN_MANAGE_MEMBERS);

  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase
    .from('organization_members')
    .select('*')
    .order('created_at', { ascending: true });

  // Email addresses live in auth.users, which clients cannot read. These ids
  // came back from an RLS-filtered query, so they are already known to belong
  // to this organization; the admin client is used only to put a name to them.
  const emails = new Map<string, string>();
  if (members && members.length > 0) {
    const admin = createSupabaseAdminClient();
    await Promise.all(
      members.map(async (member) => {
        const { data } = await admin.auth.admin.getUserById(member.user_id);
        if (data?.user?.email) emails.set(member.user_id, data.user.email);
      }),
    );
  }

  return (
    <>
      <PageHeader
        title="People and roles"
        description="Roles decide what each person can see and approve. They are enforced by the database, not just by the screens."
      />

      {!canManage ? (
        <div className="mb-6">
          <Alert tone="info">Only administrators can change roles.</Alert>
        </div>
      ) : null}

      <Card title={`${members?.length ?? 0} people`}>
        <ul className="divide-y divide-line">
          {(members ?? []).map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {emails.get(member.user_id) ?? 'Team member'}
                  {member.user_id === session.user.id ? (
                    <span className="ml-2 text-xs font-normal text-ink-faint">(you)</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">{ROLE_NOTES[member.role]}</p>
              </div>

              {canManage ? (
                <RoleForm memberId={member.id} role={member.role} />
              ) : (
                <Badge tone="neutral">{member.role}</Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6">
        <Alert tone="info" title="Inviting people is not built yet">
          Adding teammates arrives with the approval workflow in Phase 2. For now, roles can be
          changed for people who already have accounts in this organization.
        </Alert>
      </div>
    </>
  );
}
