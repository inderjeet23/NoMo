'use client';

export default function Header() {
  return (
    <header className="w-full py-8 flex flex-col items-center gap-2 text-center px-2">
      <h1 className="text-5xl font-black tracking-tight">NoMo</h1>
      <p className="text-neutral-300 font-semibold max-w-xl">All your cancellation pages in one place. Reclaim your finances.</p>
    </header>
  );
}
