import { redirect } from 'next/navigation';

import { getSession, requireUser } from '@/lib/auth';

import { CreateOrganizationForm } from './CreateOrganizationForm';

/**
 * Lives outside the (app) route group on purpose: the app shell redirects here
 * when a user has no organization, so this page must not itself require one.
 */
export default async function OnboardingPage() {
  await requireUser();
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight text-navy-900">GrantPath</p>
          <p className="mt-1 text-sm text-ink-faint">One more step</p>
        </div>
        <CreateOrganizationForm />
      </div>
    </main>
  );
}
