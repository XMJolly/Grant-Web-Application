'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Alert, Button, Card, Field, Input } from '@/components/ui';

import { createOrganization, type CreateOrgState } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create organization'}
    </Button>
  );
}

export function CreateOrganizationForm() {
  const [state, formAction] = useActionState<CreateOrgState, FormData>(createOrganization, {});
  const errors = state.errors ?? {};

  return (
    <Card
      title="Set up your organization"
      description="Just the essentials for now. You can fill in the rest of the profile next."
    >
      <form action={formAction} className="space-y-5">
        <Field
          label="Legal name"
          hint="Exactly as it appears on your IRS determination letter."
          error={errors.legal_name}
        >
          <Input name="legal_name" required placeholder="Jolly Dream Foundation" />
        </Field>

        <Field
          label="Primary state"
          hint="Two-letter code. Vouch’s first focus is Maryland."
          error={errors.service_area_state}
        >
          <Input
            name="service_area_state"
            required
            maxLength={2}
            defaultValue="MD"
            className="w-24 uppercase"
          />
        </Field>

        {errors._form ? <Alert tone="critical">{errors._form}</Alert> : null}

        <Alert tone="info">
          Everything you upload stays private to this organization. Nobody outside it can read your
          documents, and no fact is ever treated as verified until a person approves it.
        </Alert>

        <Submit />
      </form>
    </Card>
  );
}
