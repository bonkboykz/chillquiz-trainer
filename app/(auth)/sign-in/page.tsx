import { signIn } from '@/lib/auth';

export default function SignIn() {
  return (
    <form
      action={async () => {
        'use server';
        await signIn('github', { callbackUrl: '/' });
      }}
    >
      <button type="submit">Sign in</button>
    </form>
  );
}
