'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AuthFormState {
  error?: string;
  notice?: string;
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});

/**
 * Sign-in and sign-up.
 *
 * Failures return one deliberately vague message. Distinguishing "no such
 * account" from "wrong password" would let anyone test whether a given
 * nonprofit's staff member has an account here, which is information worth
 * withholding on a product that stores private financial documents.
 */
export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Enter your email address and password.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: 'That email address and password do not match an account.' };
  }

  const next = String(formData.get('next') ?? '/dashboard');
  redirect(next.startsWith('/') ? next : '/dashboard');
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your details and try again.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { error: error.message };
  }

  // With email confirmation switched on, no session is returned yet.
  if (!data.session) {
    return {
      notice:
        'Check your email for a confirmation link. Once you have confirmed, come back and sign in.',
    };
  }

  redirect('/onboarding');
}
