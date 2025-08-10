"use client";
import { signIn, useSession, signOut } from "next-auth/react";

export default function AccountPage() {
  const { data: session } = useSession();
  return (
    <main className="min-h-screen bg-app text-app px-3 sm:px-4 pb-24">
      <div className="w-full max-w-5xl mx-auto grid gap-6 sm:gap-8">
        <section className="card rounded-2xl p-6">
          <h1 className="text-2xl font-extrabold mb-2">Account</h1>
          {!session ? (
            <div className="grid gap-3">
              <p className="text-neutral-500">Connect your email to find subscriptions automatically.</p>
              <button className="btn tap w-fit" onClick={() => signIn('google')}>🔐 Connect Gmail</button>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="text-neutral-500">Signed in as {session.user?.email}</div>
              <div className="flex gap-2">
                <button className="btn btn-secondary tap" onClick={() => signOut()}>Sign out</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


