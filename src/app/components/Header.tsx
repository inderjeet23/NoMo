'use client';
import AuthButton from './AuthButton';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="w-full py-6 flex flex-col items-center gap-3 text-center px-2 relative">
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">NoMo</h1>
        <div className="relative">
          <AuthButton />
          {/* Reserved for future avatar menu implementation */}
        </div>
      </div>
      <p className="text-neutral-300 font-semibold max-w-xl">All your cancellation pages in one place. Reclaim your finances.</p>
    </header>
  );
}
