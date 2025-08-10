'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OnboardingChoose() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  return (
    <main className="min-h-screen bg-white text-black p-6 flex flex-col">
      <h1 className="text-3xl font-extrabold mb-6">Get set up</h1>
      <div className="grid gap-4 max-w-md">
        <button onClick={() => signIn('google')} className="btn w-full">🔐 Connect Gmail</button>
        <a href="/onboarding/manual" className="btn btn-secondary w-full">✍️ Add Subscriptions Manually</a>
      </div>
    </main>
  );
}


