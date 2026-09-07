import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import type { OrgRole, Organization, OrganizationMember } from '@/lib/database.types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface Session {
  user: User;
  member: OrganizationMember;
  organization: Organization;
}

/**
 * Returns the signed-in user, or null.
 *
 * Uses getUser() rather than getSession(): getSession() trusts the cookie,
 * while getUser() revalidates the token with Supabase. On a page that decides
 * who may read a nonprofit's private documents, that difference matters.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  return user;
}

/**
 * Resolves the user's current organization.
 *
 * Milestone 1 assumes one organization per user, which is true for the target
 * customer. The single call site below is where an organization switcher will
 * go when consultant accounts arrive (they manage several nonprofits), so the
 * rest of the app does not need to change then.
 */
export async function getSession(): Promise<Session | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!member) return null;

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', member.organization_id)
    .maybeSingle();

  if (!organization) return null;
  return { user, member, organization };
}

/** For pages inside the app shell: no account → sign in; no organization → onboarding. */
export async function requireSession(): Promise<Session> {
  const user = await requireUser();
  const session = await getSession();
  if (!session) redirect('/onboarding');
  void user;
  return session;
}

export function hasRole(session: Session, roles: readonly OrgRole[]): boolean {
  return roles.includes(session.member.role);
}

/**
 * Server-side role gate.
 *
 * This is convenience, not the security boundary — the database enforces the
 * same rule through RLS whatever this function returns. Its job is to produce a
 * clear message instead of an opaque "permission denied" from Postgres.
 */
export function assertRole(session: Session, roles: readonly OrgRole[], action: string): void {
  if (!hasRole(session, roles)) {
    throw new Error(
      `Your role (${session.member.role}) cannot ${action}. Ask an administrator of ${session.organization.legal_name}.`,
    );
  }
}

export const CAN_UPLOAD: readonly OrgRole[] = ['admin', 'staff'];
export const CAN_MANAGE_ORG: readonly OrgRole[] = ['admin'];
export const CAN_MANAGE_MEMBERS: readonly OrgRole[] = ['admin'];
