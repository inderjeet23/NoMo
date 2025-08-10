'use client';
import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import type { Subscription } from '@/lib/data';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import ConfirmModal from './ConfirmModal';
import { track } from '@/lib/analytics';
import confetti from 'canvas-confetti';

async function callGemini(prompt: string, options?: { json?: boolean; system?: string }) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, json: options?.json, system: options?.system }),
  });
  if (!res.ok) throw new Error('Gemini failed');
  return options?.json ? res.json() : res.text();
}

export default function SubscriptionList({ items }: { items: Subscription[] }) {
  const { data: session } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<Subscription | null>(null);
  const [guideHtml, setGuideHtml] = useState<string | null>(null);
  const [insights, setInsights] = useState<Array<{ title: string; body: string }> | null>(null);
  const [loadingGuideId, setLoadingGuideId] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [detectedIds, setDetectedIds] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const cancelClickBlockRef = useRef<number>(0);
  const toastRef = useRef<HTMLDivElement | null>(null);

  // Refocus logic: show modal when returning focus from external tab
  useEffect(() => {
    function onFocus() {
      if (activeService) setModalOpen(true);
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [activeService]);

  // On sign-in, fetch saved subscriptions
  useEffect(() => {
    async function fetchSaved() {
      if (!session) return;
      const res = await fetch('/api/subscriptions');
      if (!res.ok) return;
      const data = await res.json();
      const ids: string[] = (data.subscriptions ?? []).map((s: { id: string }) => s.id);
      setDetectedIds(ids);
    }
    fetchSaved();
  }, [session]);

  async function handleCancelClick(sub: Subscription) {
    const now = Date.now();
    if (now - cancelClickBlockRef.current < 800) return; // debounce
    cancelClickBlockRef.current = now;
    setActiveService(sub);
    window.open(sub.cancelUrl, '_blank', 'noopener');
    track('cancel_page_open', { service: sub.id });
  }

  async function handleGuide(sub: Subscription) {
    try {
      setLoadingGuideId(sub.id);
      const system = 'You are NoMo, a helpful assistant that writes concise, step-by-step cancellation guides. Keep steps short and accurate.';
      const prompt = `Create a simple checklist with headings for cancelling ${sub.name}. Include the exact navigation and links if known. If there are fees, warn the user. Close with encouragement.`;
      const md = await callGemini(prompt, { system });
      const html = DOMPurify.sanitize(marked(md) as string);
      setGuideHtml(html);
      track('guide_generated', { service: sub.id });
    } catch (_e) {
      setGuideHtml('<p>Sorry, failed to load guide.</p>');
    } finally {
      setLoadingGuideId(null);
    }
  }

  async function handleInsights() {
    try {
      setLoadingInsights(true);
      const system = 'You are analyzing a user\'s subscriptions. Return strictly JSON: [{"title":"string","body":"string"}]. No extra text.';
      const prompt = `Subscriptions: ${items.map(i => `${i.name} $${i.pricePerMonthUsd}/mo`).join(', ')}.`;
      const data = await callGemini(prompt, { json: true, system });
      setInsights(Array.isArray(data) ? data : []);
      track('insights_generated', { count: (Array.isArray(data) ? data.length : 0) });
    } catch (_e) {
      setInsights([{ title: 'Could not load insights', body: 'Please try again later.' }]);
    } finally {
      setLoadingInsights(false);
    }
  }

  function announce(message: string) {
    if (toastRef.current) {
      toastRef.current.textContent = message;
    }
  }

  async function connectEmail() {
    await signIn('google');
    track('connect_gmail_clicked');
  }

  async function scanInbox() {
    const res = await fetch('/api/scan', { method: 'POST' });
    if (!res.ok) return announce('Scan failed');
    const data = await res.json();
    const found = (data.subscriptions as Array<{ id: string }> | undefined) ?? [];
    setDetectedIds(found.map((f) => f.id));
    announce(`Found ${found.length} subscriptions`);
    track('scan_inbox_completed', { found: found.length });
    setHasScanned(true);
  }

  return (
    <section className="w-full max-w-4xl mx-auto">
      {!session ? (
        <div className="flex flex-col items-center justify-center gap-3 mb-6 bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-xl font-extrabold">Connect your email</h3>
          <p className="text-neutral-300 text-sm">We never see your password. You&apos;ll securely sign in with Google.</p>
          <button onClick={connectEmail} className="btn">🔐 Connect Gmail</button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <div className="font-semibold">Connected as {session.user?.email}</div>
          <button onClick={scanInbox} className="btn btn-secondary">🔎 Scan Inbox</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-extrabold">Your Subscriptions</h2>
        {hasScanned && (
          <button onClick={handleInsights} className="btn btn-secondary" aria-label="Get insights from your subscriptions" disabled={loadingInsights}>
            {loadingInsights ? 'Loading…' : '✨ Get Insights'}
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((sub) => (
          <li key={sub.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div>
              <div className="font-medium flex items-center gap-2">
                <span>{sub.name}</span>
                {detectedIds.includes(sub.id) && (
                  <span className="inline-flex items-center rounded-full bg-green-600/20 text-green-300 text-xs font-semibold px-2 py-0.5 border border-green-700/40">Detected</span>
                )}
              </div>
              <div className="text-sm text-neutral-200">
                {sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} / month
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleGuide(sub)} className="btn btn-secondary" aria-label={`Guide me to cancel ${sub.name}`} disabled={loadingGuideId === sub.id}>
                {loadingGuideId === sub.id ? 'Guiding…' : '🧭 Guide Me'}
              </button>
              <button onClick={() => handleCancelClick(sub)} className="btn" aria-label={`Open ${sub.name} cancel page`}>🛑 Cancel Page</button>
            </div>
          </li>
        ))}
      </ul>

      {guideHtml && (
        <div className="mt-6 bg-neutral-900 border border-neutral-800 rounded-xl p-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: guideHtml }} />
      )}

      {insights && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold">Your Subscription Insights</h3>
          {insights.map((it, idx) => (
            <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="font-medium">{it.title}</div>
              <div className="text-neutral-300 text-sm">{it.body}</div>
            </div>
          ))}
        </div>
      )}

      <div ref={toastRef} aria-live="polite" className="sr-only" />

      <ConfirmModal
        open={modalOpen}
        serviceName={activeService?.name ?? ''}
        onConfirm={() => {
          setModalOpen(false);
          setActiveService(null);
          announce('Marked as cancelled');
          if (window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
          }
        }}
        onCancel={() => {
          setModalOpen(false);
          announce('We\'ll help you with concierge support.');
        }}
      />
    </section>
  );
}
