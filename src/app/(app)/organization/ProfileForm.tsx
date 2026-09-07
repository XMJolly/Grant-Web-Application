'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import type { Organization } from '@/lib/database.types';

import { saveOrganizationProfile, type ProfileState } from './actions';

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Saving…' : 'Save profile'}
    </Button>
  );
}

/** Yes / No / Not sure. "Not sure" is a real answer and is stored as unknown. */
function TriState({
  name,
  value,
  disabled,
}: {
  name: string;
  value: boolean | null;
  disabled: boolean;
}) {
  const current = value === true ? 'yes' : value === false ? 'no' : 'unknown';
  return (
    <Select name={name} defaultValue={current} disabled={disabled} className="w-48">
      <option value="unknown">Not sure yet</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </Select>
  );
}

export function ProfileForm({
  organization,
  canEdit,
}: {
  organization: Organization;
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    saveOrganizationProfile,
    {},
  );
  const errors = state.errors ?? {};
  const ro = !canEdit;

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Legal name" error={errors.legal_name}>
              <Input name="legal_name" defaultValue={organization.legal_name} disabled={ro} required />
            </Field>
          </div>

          <Field label="EIN" hint="Your federal tax ID, as 12-3456789." error={errors.ein}>
            <Input name="ein" defaultValue={organization.ein ?? ''} disabled={ro} placeholder="12-3456789" />
          </Field>

          <Field label="Year founded" hint="Some funders require a minimum age." error={errors.founded_year}>
            <Input
              name="founded_year"
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              defaultValue={organization.founded_year ?? ''}
              disabled={ro}
            />
          </Field>

          <Field label="Tax-exempt status" error={errors.tax_exempt_status}>
            <Select name="tax_exempt_status" defaultValue={organization.tax_exempt_status ?? ''} disabled={ro}>
              <option value="">Not sure yet</option>
              <option value="501c3">501(c)(3)</option>
              <option value="501c4">501(c)(4)</option>
              <option value="501c6">501(c)(6)</option>
              <option value="fiscally_sponsored">Fiscally sponsored</option>
              <option value="government">Government body</option>
              <option value="other">Other</option>
              <option value="none">None</option>
            </Select>
          </Field>

          <Field label="Website" error={errors.website}>
            <Input name="website" defaultValue={organization.website ?? ''} disabled={ro} placeholder="https://" />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Mission"
              hint="In your own words. This is used to judge whether a grant is a good fit — it is never rewritten without your approval."
              error={errors.mission}
            >
              <Textarea name="mission" rows={4} defaultValue={organization.mission ?? ''} disabled={ro} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Where you work">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Primary state" error={errors.service_area_state}>
            <Input
              name="service_area_state"
              maxLength={2}
              defaultValue={organization.service_area_state ?? ''}
              disabled={ro}
              className="w-24 uppercase"
            />
          </Field>

          <Field
            label="Counties or communities served"
            hint="Separate with commas, for example: Charles, Prince George’s"
            error={errors.service_area_counties}
          >
            <Input
              name="service_area_counties"
              defaultValue={organization.service_area_counties.join(', ')}
              disabled={ro}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Money and registrations"
        description="These decide eligibility on most state and county grants, so they are worth getting right."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Annual budget (US dollars)" error={errors.annual_budget_usd}>
            <Input
              name="annual_budget_usd"
              type="number"
              min={0}
              step="1"
              defaultValue={organization.annual_budget_usd ?? ''}
              disabled={ro}
            />
          </Field>

          <Field label="Which fiscal year is that?" error={errors.annual_budget_fy}>
            <Input
              name="annual_budget_fy"
              type="number"
              min={1800}
              max={2100}
              defaultValue={organization.annual_budget_fy ?? ''}
              disabled={ro}
            />
          </Field>

          <Field
            label="Registered in Maryland eMMA"
            hint="A hard requirement on many Maryland state opportunities."
          >
            <TriState name="emma_registered" value={organization.emma_registered} disabled={ro} />
          </Field>

          <Field label="In good standing with the state" hint="Often checked before an award is made.">
            <TriState name="state_good_standing" value={organization.state_good_standing} disabled={ro} />
          </Field>
        </div>
      </Card>

      {errors._form ? <Alert tone="critical">{errors._form}</Alert> : null}
      {state.saved ? <Alert tone="verified">Profile saved.</Alert> : null}

      {canEdit ? <Submit disabled={ro} /> : null}
    </form>
  );
}
