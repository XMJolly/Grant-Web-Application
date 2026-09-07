import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Appends to the organization's audit log.
 *
 * Written with the service role because `authenticated` deliberately has no
 * INSERT, UPDATE or DELETE grant on audit_events — a log a user can edit is not
 * a log. Failures are swallowed on purpose: an audit write must never be the
 * reason a nonprofit cannot upload a document. They are logged instead.
 */
export async function recordAuditEvent(event: {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('audit_events').insert({
      organization_id: event.organizationId,
      actor_user_id: event.actorUserId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      summary: event.summary ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) throw error;
  } catch (error) {
    console.error('[audit] failed to record event', event.action, error);
  }
}
