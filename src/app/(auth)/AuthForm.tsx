'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Alert, Button, Field, Input } from '@/components/ui';

import type { AuthFormState } from './actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Working…' : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: 'sign-in' | 'sign-up';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const isSignUp = mode === 'sign-up';

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-ink">
        {isSignUp ? 'Create your account' : 'Sign in'}
      </h1>
      <p className="mt-1 text-sm text-ink-faint">
        {isSignUp
          ? 'You will set up your organization on the next screen.'
          : 'Welcome back.'}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field label="Email address">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@yournonprofit.org"
          />
        </Field>

        <Field
          label="Password"
          hint={isSignUp ? 'At least 10 characters. A short phrase works well.' : undefined}
        >
          <Input
            name="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={isSignUp ? 10 : undefined}
          />
        </Field>

        {state.error ? <Alert tone="critical">{state.error}</Alert> : null}
        {state.notice ? <Alert tone="info">{state.notice}</Alert> : null}

        <Submit label={isSignUp ? 'Create account' : 'Sign in'} />
      </form>

      <p className="mt-5 text-center text-sm text-ink-faint">
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-teal-700 underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href="/sign-up" className="font-medium text-teal-700 underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
