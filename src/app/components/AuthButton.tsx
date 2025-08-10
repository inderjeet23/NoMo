'use client';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();
  if (status === 'loading') {
    return (
      <button className="btn btn-secondary opacity-60" disabled>
        Connecting…
      </button>
    );
  }
  if (session) {
    return (
      <div className="flex items-center gap-2">
        {session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
        ) : null}
        <button className="btn-quiet tap" onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }
  return (
    <button className="btn tap" onClick={() => signIn('google')}>
      Connect Google
    </button>
  );
}


