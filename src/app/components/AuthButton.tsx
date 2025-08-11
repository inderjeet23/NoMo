'use client';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);
  if (status === 'loading') {
    return (
      <button className="btn btn-secondary opacity-60" disabled>
        Connecting…
      </button>
    );
  }
  if (session) {
    return (
      <div className="relative" ref={menuRef}>
        <button className="pressable inline-flex items-center justify-center w-10 h-10 rounded-full bg-[color:var(--surface)]" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
          {session.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="font-semibold text-sm">{(session.user?.name || session.user?.email || 'U').slice(0,1)}</span>
          )}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-40 card rounded-xl p-2 shadow-xl z-50">
            <a href="/account" className="block rounded-md px-3 py-2 hover:bg-[color:var(--surface)]">Account</a>
            <button className="w-full text-left rounded-md px-3 py-2 hover:bg-[color:var(--surface)]" onClick={() => signOut()}>Sign out</button>
          </div>
        )}
      </div>
    );
  }
  return (
    <button className="btn tap pressable" onClick={() => signIn('google')}>
      Connect Google
    </button>
  );
}


