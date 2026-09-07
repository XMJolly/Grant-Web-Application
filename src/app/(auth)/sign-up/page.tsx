import { AuthForm } from '../AuthForm';
import { signUp } from '../actions';

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUp} />;
}
