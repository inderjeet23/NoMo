export default function OnboardingLanding() {
  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-between p-6">
      <div />
      <section className="text-center max-w-sm">
        <div className="text-6xl mb-6">🧪</div>
        <h1 className="text-3xl font-extrabold mb-2">Experiment your way</h1>
        <p className="text-neutral-600">Connect your email to auto-find subscriptions or add them manually.</p>
      </section>
      <a href="/onboarding/choose" className="btn w-full max-w-md">Get Started</a>
    </main>
  );
}


