export default function OnboardingLanding() {
  return (
    <main className="min-h-screen app-bg text-app flex flex-col items-center justify-center px-6 py-12">
      <section className="text-center max-w-sm glass-card rounded-2xl p-8">
        <h1 className="text-4xl font-black mb-6">NoMo</h1>
        <div className="w-28 h-28 mx-auto mb-6 rounded-2xl avatar-depth flex items-center justify-center bg-[rgba(255,255,255,0.04)]">🔍</div>
        <h2 className="text-xl font-extrabold mb-2">Find subscriptions you forgot you have</h2>
        <p className="text-sm text-neutral-300 mb-6">Most people have 3–5 forgotten subscriptions draining their accounts. Let’s find yours.</p>
        <div className="grid gap-3">
          <a href="/onboarding/choose" className="btn-glass-blue tap h-12">Connect Gmail</a>
          <a href="/onboarding/manual" className="btn-quiet tap h-12">Add manually instead</a>
        </div>
      </section>
    </main>
  );
}


