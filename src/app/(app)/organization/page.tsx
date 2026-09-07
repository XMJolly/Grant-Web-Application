import { Alert, PageHeader } from '@/components/ui';
import { hasRole, requireSession, CAN_MANAGE_ORG } from '@/lib/auth';

import { ProfileForm } from './ProfileForm';

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await requireSession();
  const { welcome } = await searchParams;
  const canEdit = hasRole(session, CAN_MANAGE_ORG);

  return (
    <>
      <PageHeader
        title="Organization profile"
        description="This is what eligibility checks compare a grant’s rules against. Anything left blank shows up later as missing information rather than being guessed."
      />

      {welcome ? (
        <div className="mb-6">
          <Alert tone="verified" title={`${session.organization.legal_name} is set up`}>
            You are its administrator. Fill in what you know now — you can come back to the rest.
          </Alert>
        </div>
      ) : null}

      {!canEdit ? (
        <div className="mb-6">
          <Alert tone="info">
            Your role is {session.member.role}, so this profile is read-only for you. An
            administrator can make changes.
          </Alert>
        </div>
      ) : null}

      <ProfileForm organization={session.organization} canEdit={canEdit} />
    </>
  );
}
