'use client';
import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import type { Subscription } from '@/lib/data';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import ConfirmModal from './ConfirmModal';
import { track } from '@/lib/analytics';
import confetti from 'canvas-confetti';
import { getBrandAvatarStyle } from '@/lib/brandAvatar';
import { getPrefs, setPrefs, prefsExists, type Preferences } from '@/lib/prefs';
import AddServiceModal from './AddServiceModal';

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
  const [cancelledIds, setCancelledIds] = useState<string[]>([]);
  const [monthlySavings, setMonthlySavings] = useState<number>(0);
  const [hasScanned, setHasScanned] = useState(false);
  const [prefs, setPrefsState] = useState<Preferences>({ hiddenIds: [], showSuggestions: true, sort: 'name' });
  const [directory, setDirectory] = useState<Array<{ id: string; name: string; cancelUrl: string; flow: string; region: string }>>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [customItems, setCustomItems] = useState<Subscription[]>([]);
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

  // On sign-in, fetch saved subscriptions and prefs/canceled
  useEffect(() => {
    // load prefs once on mount; if user is signed in and no prefs yet, default showSuggestions=false
    const existing = getPrefs();
    if (session && !prefsExists()) {
      existing.showSuggestions = false;
      setPrefs(existing);
    }
    setPrefsState(existing);
    async function fetchSaved() {
      if (!session) return;
      const res = await fetch('/api/subscriptions');
      if (!res.ok) return;
      const data = await res.json();
      const ids: string[] = (data.subscriptions ?? []).map((s: { id: string }) => s.id);
      setDetectedIds(ids);
      if (Array.isArray(data?.canceled)) setCancelledIds(data.canceled as string[]);
      if (data?.prefs && typeof data.prefs === 'object') {
        const serverPrefs = data.prefs as Partial<Preferences>;
        const merged: Preferences = { ...getPrefs(), ...serverPrefs } as Preferences;
        setPrefs(merged);
        setPrefsState(merged);
      }
      if (Array.isArray(data?.custom)) {
        const mapped: Subscription[] = (data.custom as Array<{ id: string; name: string; cancelUrl?: string }>).map((c) => ({
          id: c.id,
          name: c.name,
          pricePerMonthUsd: 0,
          cancelUrl: c.cancelUrl || '#',
        }));
        setCustomItems(mapped);
        // Ensure visibility when suggestions are off
        const customIds = mapped.map((m) => m.id);
        setDetectedIds((prev) => Array.from(new Set([...prev, ...customIds])));
      }
    }
    fetchSaved();
  }, [session]);

  // Load directory options from CSV on mount
  useEffect(() => {
    async function loadDir() {
      const res = await fetch('/api/directory');
      if (!res.ok) return;
      const data = await res.json();
      setDirectory(Array.isArray(data?.options) ? data.options : []);
    }
    loadDir();
  }, []);

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

  function updatePrefs(next: Partial<Preferences>) {
    const merged: Preferences = { ...prefs, ...next };
    setPrefsState(merged);
    setPrefs(merged);
    // sync to server if signed in
    if (session) {
      fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefs: merged }) });
    }
  }

  function sortItems(list: Subscription[]) {
    if (prefs.sort === 'price') {
      return [...list].sort((a, b) => (a.pricePerMonthUsd ?? 0) - (b.pricePerMonthUsd ?? 0));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold">Your Subscriptions</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2 tap">
            <input className="w-5 h-5" type="checkbox" checked={prefs.showSuggestions} onChange={(e)=>updatePrefs({ showSuggestions: e.target.checked })} />
            <span>Show suggestions</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <span>Sort</span>
            <select className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 tap" value={prefs.sort} onChange={(e)=>updatePrefs({ sort: e.target.value as Preferences['sort'] })}>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </label>
          {prefs.hiddenIds.length > 0 && (
            <button className="rounded-lg px-3 py-2 border border-neutral-800 hover:bg-neutral-800 tap" onClick={() => updatePrefs({ hiddenIds: [] })}>
              Unhide all
            </button>
          )}
          {directory.length > 0 && (
            <button className="rounded-lg px-3 py-2 border border-neutral-800 hover:bg-neutral-800 tap" onClick={()=>setAddOpen(true)}>Add service</button>
          )}
        </div>
        {hasScanned && (
          <button onClick={handleInsights} className="btn btn-secondary" aria-label="Get insights from your subscriptions" disabled={loadingInsights}>
            {loadingInsights ? 'Loading…' : '✨ Get Insights'}
          </button>
        )}
      </div>

      <ul className="space-y-3 sm:space-y-2">
        {sortItems([...customItems, ...items])
          .filter((s) => !cancelledIds.includes(s.id))
          .filter((s) => prefs.showSuggestions ? true : detectedIds.includes(s.id))
          .filter((s) => !prefs.hiddenIds.includes(s.id))
          .map((sub) => (
          <li key={sub.id} className="grid grid-cols-[auto_1fr] sm:flex sm:items-center sm:justify-between bg-neutral-900 border border-neutral-800 rounded-2xl p-4 gap-3">
            <div className="flex items-center gap-3">
              {(() => { const a = getBrandAvatarStyle(sub.name); return (
                <div aria-hidden className={`w-12 h-12 rounded-2xl ${a.bgClass} flex items-center justify-center text-white font-extrabold`}>{a.initials}</div>
              ); })()}
              <div className="font-medium flex items-center gap-2">
                <span>{sub.name}</span>
                {detectedIds.includes(sub.id) && (
                  <span className="inline-flex items-center rounded-full bg-green-600/20 text-green-300 text-xs font-semibold px-2 py-0.5 border border-green-700/40">Detected</span>
                )}
              </div>
              <div className="text-base sm:text-sm text-neutral-200">
                {sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} / month
              </div>
            </div>
            <div className="flex gap-2 items-center col-span-2 sm:col-span-1">
              <button onClick={() => handleGuide(sub)} className="btn btn-secondary btn-lg sm:btn tap" aria-label={`Guide me to cancel ${sub.name}`} disabled={loadingGuideId === sub.id}>
                {loadingGuideId === sub.id ? 'Guiding…' : '🧭 Guide Me'}
              </button>
              <button onClick={() => handleCancelClick(sub)} className="btn btn-lg sm:btn tap" aria-label={`Open ${sub.name} cancel page`}>🛑 Go to Cancel Page</button>
              <button aria-label={`Hide ${sub.name}`} className="rounded-lg px-3 py-2 text-xs sm:text-xs border border-neutral-800 hover:bg-neutral-800 tap" onClick={()=>updatePrefs({ hiddenIds: [...new Set([...prefs.hiddenIds, sub.id])] })}>Hide</button>
            </div>
          </li>
        ))}
      </ul>

      {guideHtml && (
        <div className="mt-6 bg-neutral-900 border border-neutral-800 rounded-xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
            <div className="text-sm font-semibold">Step-by-step guide</div>
            <button aria-label="Close guide" className="text-sm px-2 py-1 rounded-lg hover:bg-neutral-800" onClick={()=>setGuideHtml(null)}>✖ Close</button>
          </div>
          <div className="p-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: guideHtml }} />
        </div>
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
        title={activeService ? `Welcome back! Did you successfully cancel ${activeService.name}?` : undefined}
        confirmLabel="Yes, I canceled it"
        cancelLabel="I had trouble"
        onConfirm={() => {
          setModalOpen(false);
          if (activeService) {
            setCancelledIds((prev) => prev.includes(activeService.id) ? prev : [...prev, activeService.id]);
            setMonthlySavings((prev) => prev + (activeService.pricePerMonthUsd || 0));
            if (session) {
              const next = [...new Set([...(cancelledIds || []), activeService.id])];
              fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canceledIds: next }) });
            }
          }
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

      {cancelledIds.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Canceled</h3>
            <div className="text-sm text-green-300 font-semibold">Monthly Savings: {monthlySavings.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</div>
          </div>
          <ul className="space-y-2">
            {items.filter((s) => cancelledIds.includes(s.id)).map((sub) => (
              <li key={sub.id} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-2xl p-4 opacity-70">
                <div className="flex items-center gap-3">
                  {(() => { const a = getBrandAvatarStyle(sub.name); return (
                    <div aria-hidden className={`w-12 h-12 rounded-2xl ${a.bgClass} flex items-center justify-center text-white font-extrabold`}>{a.initials}</div>
                  ); })()}
                  <div className="font-medium flex items-center gap-2 line-through">
                    <span>{sub.name}</span>
                  </div>
                  <div className="text-sm text-neutral-400">
                    {sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} / month
                  </div>
                </div>
                <div className="text-sm text-neutral-400">Canceled</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddServiceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSelect={(opt) => {
          updatePrefs({ showSuggestions: true });
          if (!detectedIds.includes(opt.id)) setDetectedIds((prev) => [...prev, opt.id]);
          // add immediately to local custom items for display
          setCustomItems((prev) => (prev.find((p) => p.id === opt.id) ? prev : [...prev, { id: opt.id, name: opt.name, pricePerMonthUsd: 0, cancelUrl: opt.cancelUrl || '#' }]));
          // persist selection if signed in
          if (session) {
            fetch('/api/subscriptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customAdd: { id: opt.id, name: opt.name, cancelUrl: opt.cancelUrl } }),
            });
          }
          announce(`Added ${opt.name}`);
        }}
      />
    </section>
  );
}
