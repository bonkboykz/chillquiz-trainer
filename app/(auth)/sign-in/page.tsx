import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SignIn() {
  const session = await auth();

  if (session) {
    return redirect('/');
  }

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
