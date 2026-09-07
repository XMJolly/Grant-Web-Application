import { AuthForm } from '../AuthForm';
import { signIn } from '../actions';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AuthForm mode="sign-in" action={signIn} next={next} />;
}
