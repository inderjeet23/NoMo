'use client';
import AuthButton from './AuthButton';

export default function Header() {
  return (
    <header className="w-full py-8 flex flex-col items-center gap-4 text-center px-2">
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">NoMo</h1>
        <AuthButton />
      </div>
      <p className="text-neutral-300 font-semibold max-w-xl">All your cancellation pages in one place. Reclaim your finances.</p>
    </header>
  );
}
