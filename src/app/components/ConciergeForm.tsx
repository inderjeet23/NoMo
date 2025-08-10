'use client';
import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { track } from '@/lib/analytics';

export default function ConciergeForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (submitted && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [submitted]);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'conciergeRequests'), {
        email,
        createdAt: serverTimestamp(),
        source: 'web-app',
      });
      track('concierge_request_submitted');
    } catch {
      // ignore; keep UX smooth
    }
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-green-900/30 border border-green-800 rounded-xl p-4" role="status" aria-live="polite">
        Thanks! Our concierge will reach out shortly.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 items-center flex-wrap">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-invalid={email.length > 0 && !isValidEmail(email)}
        placeholder="you@example.com"
        className="flex-1 rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
      />
      <button ref={buttonRef} type="submit" className="btn" disabled={loading || !isValidEmail(email)}>
        {loading ? 'Sending…' : '🤝 Request Concierge'}
      </button>
    </form>
  );
}
