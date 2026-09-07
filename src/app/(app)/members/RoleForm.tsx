'use client';

import { useActionState } from 'react';

import { Select } from '@/components/ui';
import type { OrgRole } from '@/lib/database.types';

import { changeMemberRole, type RoleState } from './actions';

export function RoleForm({ memberId, role }: { memberId: string; role: OrgRole }) {
  const [state, formAction] = useActionState<RoleState, FormData>(changeMemberRole, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="member_id" value={memberId} />
      <Select
        name="role"
        defaultValue={role}
        className="w-40"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="admin">Administrator</option>
        <option value="staff">Staff</option>
        <option value="reviewer">Reviewer</option>
        <option value="volunteer">Volunteer</option>
      </Select>
      {state.error ? <span className="max-w-xs text-right text-xs text-critical-700">{state.error}</span> : null}
      {state.saved === memberId ? <span className="text-xs text-verified-700">Saved</span> : null}
    </form>
  );
}
