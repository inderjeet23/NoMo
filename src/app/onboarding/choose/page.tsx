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
    <main className="min-h-screen app-bg text-app p-6 flex flex-col items-center justify-center">
      <section className="glass-card rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-extrabold mb-6 text-center">Connect your account</h1>
        <div className="grid gap-4">
          <button onClick={() => signIn('google')} className="btn-glass-blue w-full h-12">🔐 Connect Gmail</button>
          <a href="/onboarding/manual" className="btn-quiet w-full h-12">✍️ Add Subscriptions Manually</a>
        </div>
      </section>
    </main>
  );
}


