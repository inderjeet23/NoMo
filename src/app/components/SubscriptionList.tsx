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
import { getPrefs, setPrefs, type Preferences } from '@/lib/prefs';
import AddServiceModal from './AddServiceModal';
import EditPriceModal from './EditPriceModal';
import { upsertCustomLocal, getCustomLocal, removeCustomLocal } from '@/lib/customLocal';
import SubscriptionCard from './SubscriptionCard';
import BottomSheet from './BottomSheet';
import { stripHtml } from './utils/stripHtml';

async function callGemini(prompt: string, options?: { json?: boolean; system?: string }) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, json: options?.json, system: options?.system }),
  });
  if (!res.ok) throw new Error('Gemini failed');
  return options?.json ? res.json() : res.text();
}

export default function SubscriptionList({ items, onItemsChange }: { items: Subscription[]; onItemsChange?: (items: Subscription[]) => void }) {
  const { data: session } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<Subscription | null>(null);
  const [guideHtml, setGuideHtml] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [insights, setInsights] = useState<Array<{ title: string; body: string }> | null>(null);
  const [loadingGuideId, setLoadingGuideId] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [detectedIds, setDetectedIds] = useState<string[]>([]);
  const [cancelledIds, setCancelledIds] = useState<string[]>([]);
  const [monthlySavings, setMonthlySavings] = useState<number>(0);
  const [hasScanned, setHasScanned] = useState(false);
  const [prefs, setPrefsState] = useState<Preferences>({ hiddenIds: [], sort: 'name' });
  const [directory, setDirectory] = useState<Array<{ id: string; name: string; cancelUrl: string; flow: string; region: string }>>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [customItems, setCustomItems] = useState<Subscription[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [pendingNewId, setPendingNewId] = useState<string | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
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
    // load prefs once on mount
    const existing = getPrefs();
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
        const mapped: Subscription[] = (data.custom as Array<{ id: string; name: string; cancelUrl?: string; pricePerMonthUsd?: number; cadence?: 'month'|'year'; nextChargeAt?: string }>).map((c) => ({
          id: c.id,
          name: c.name,
          pricePerMonthUsd: c.pricePerMonthUsd ?? 0,
          cancelUrl: c.cancelUrl || '#',
          cadence: c.cadence,
          nextChargeAt: c.nextChargeAt,
        }));
        setCustomItems(mapped);
        // Ensure visibility when suggestions are off
        const customIds = mapped.map((m) => m.id);
        setDetectedIds((prev) => Array.from(new Set([...prev, ...customIds])));
      }
      if (Array.isArray(data?.removed)) {
        setRemovedIds(data.removed as string[]);
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
    // load local custom prices
    const local = getCustomLocal();
    if (local.length) {
      setCustomItems((prev) => {
        const map = new Map(prev.map((p) => [p.id, p] as const));
        for (const c of local) {
          map.set(c.id, { id: c.id, name: c.name, pricePerMonthUsd: c.pricePerMonthUsd, cancelUrl: c.cancelUrl || '#' });
        }
        return Array.from(map.values());
      });
    }
  }, []);

  function normalizeKey(s: Subscription): string {
    return (s.name || s.id).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function mergeByName(base: Subscription[], custom: Subscription[]): Subscription[] {
    const map = new Map<string, Subscription>();
    for (const b of base) map.set(normalizeKey(b), b);
    for (const c of custom) map.set(normalizeKey(c), c); // custom overrides base
    return Array.from(map.values());
  }

  // Notify parent when combined list changes (base + custom overrides) and when removals/cancellations change
  useEffect(() => {
    if (!onItemsChange) return;
    const merged = mergeByName(items, customItems)
      .filter((s) => !cancelledIds.includes(s.id))
      .filter((s) => !removedIds.includes(s.id));
    onItemsChange(merged);
  }, [items, customItems, cancelledIds, removedIds, onItemsChange]);

  async function handleCancelClick(sub: Subscription) {
    const now = Date.now();
    if (now - cancelClickBlockRef.current < 800) return; // debounce
    cancelClickBlockRef.current = now;
    setActiveService(sub);
    window.open(sub.cancelUrl, '_blank', 'noopener');
    track('cancel_page_open', { service: sub.id });
  }

  let guideDebounce = 0;
  async function handleGuide(sub: Subscription) {
    try {
      const now = Date.now();
      if (now - guideDebounce < 700) return;
      guideDebounce = now;
      setLoadingGuideId(sub.id);
      const system = 'You are NoMo, a helpful assistant that writes concise, step-by-step cancellation guides. Keep steps short and accurate.';
      const prompt = `Create a simple checklist with headings for cancelling ${sub.name}. Include the exact navigation and links if known. If there are fees, warn the user. Close with encouragement.`;
      const md = await callGemini(prompt, { system });
      const html = DOMPurify.sanitize(marked(md) as string);
      setGuideHtml(html);
      setSheetOpen(true);
      track('guide_generated', { service: sub.id });
    } catch (_e) {
      setGuideHtml('<p>Sorry, failed to load guide.</p>');
      setSheetOpen(true);
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
      {session ? (
        <div className="flex items-center justify-between mb-6 card p-5">
          <div className="font-semibold">Connected as {session.user?.email}</div>
          <button onClick={scanInbox} className="btn btn-secondary tap">🔎 Find my subscriptions</button>
        </div>
      ) : null}
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold mb-2">Your Subscriptions</h2>
        <div className="toolbar-card rounded-xl p-3 sm:p-4 flex items-center gap-3 text-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 flex-none">
            <span className="text-neutral-400">Sort</span>
            <select className="bg-app border border-app rounded-lg px-3 h-10 tap" value={prefs.sort} onChange={(e)=>updatePrefs({ sort: e.target.value as Preferences['sort'] })}>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-none ml-auto">
            <button
              className="btn sm:btn tap h-10 px-4"
              onClick={()=>setAddOpen(true)}
              disabled={directory.length === 0}
              aria-disabled={directory.length === 0}
            >
              Add service
            </button>
            <button
              className="btn-quiet tap h-10 px-4"
              onClick={()=>setTrackingOpen(true)}
            >
              Track custom
            </button>
          </div>
        </div>
        {hasScanned && (
          <div className="mt-2">
            <button onClick={handleInsights} className="btn btn-secondary" aria-label="Get insights from your subscriptions" disabled={loadingInsights}>
              {loadingInsights ? 'Loading…' : '✨ Get Insights'}
            </button>
          </div>
        )}
      </div>

      <ul className="space-y-4 sm:space-y-2">
         {sortItems(mergeByName(items, customItems))
          .filter((s) => !cancelledIds.includes(s.id))
          .filter((s) => !removedIds.includes(s.id))
          .map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              detected={detectedIds.includes(sub.id)}
              isGuiding={loadingGuideId === sub.id}
              expanded={expandedId === sub.id}
              onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              onGuide={() => handleGuide(sub)}
              onCancel={() => handleCancelClick(sub)}
               onHide={() => {
                 // Remove completely
                 setCustomItems((prev) => prev.filter((x) => normalizeKey(x) !== normalizeKey(sub)));
                 removeCustomLocal(sub.id);
                 setRemovedIds((prev) => {
                   const next = Array.from(new Set([...prev, sub.id]));
                   if (session) {
                     fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removedIds: next }) });
                   }
                   return next;
                 });
                 setDetectedIds((prev) => prev.filter((id) => id !== sub.id));
               }}
              onEditPrice={() => setEditTarget(sub)}
            />
        ))}
      </ul>

      <BottomSheet
        open={sheetOpen || !!loadingGuideId}
        title="Step-by-step guide"
        onClose={() => { setSheetOpen(false); setGuideHtml(null); }}
        actions={guideHtml ? (
          <button
            className="btn-quiet text-xs px-2 py-1"
            onClick={() => { if (guideHtml) { navigator.clipboard.writeText(stripHtml(guideHtml)); announce('Guide copied'); } }}
          >
            Copy guide
          </button>
        ) : null}
      >
        {loadingGuideId ? (
          <div>
            <div className="h-4 w-40 bg-[color:var(--surface)] rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 bg-[color:var(--surface)] rounded animate-pulse" />
              <div className="h-3 bg-[color:var(--surface)] rounded animate-pulse" />
              <div className="h-3 bg-[color:var(--surface)] rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: guideHtml! }} />
        )}
      </BottomSheet>

      {insights && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold">Your Subscription Insights</h3>
          {insights.map((it, idx) => (
            <div key={idx} className="card rounded-xl p-4">
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
              <li key={sub.id} className="flex items-center justify-between card rounded-2xl p-4 opacity-70">
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
          if (!detectedIds.includes(opt.id)) setDetectedIds((prev) => [...prev, opt.id]);
          // add immediately to local custom items for display
          const newItem: Subscription = { id: normalizeKey({ id: opt.id, name: opt.name, pricePerMonthUsd: 0, cancelUrl: opt.cancelUrl || '#' }), name: opt.name, pricePerMonthUsd: 0, cancelUrl: opt.cancelUrl || '#' };
          setCustomItems((prev) => {
            const exists = prev.find((p) => normalizeKey(p) === normalizeKey(newItem));
            return exists ? prev : [...prev, newItem];
          });
          // persist selection if signed in
          if (session) {
            fetch('/api/subscriptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customAdd: { id: opt.id, name: opt.name, cancelUrl: opt.cancelUrl } }),
            });
          }
          announce(`Added ${opt.name}`);
          setAddOpen(false);
          setEditTarget(newItem);
          setPendingNewId(newItem.id);
        }}
      />

      {/* Lightweight manual tracker with name */}
      <EditPriceModal
        open={trackingOpen}
        name={editTarget?.name ?? ''}
        price={0}
        allowName
        onClose={() => setTrackingOpen(false)}
        onSave={({ name, price, cadence, nextChargeAt, notifyEmail, notifyPush }) => {
          const id = `custom-${Date.now()}`;
          const finalName = (name && name.trim()) || 'Custom service';
          const newItem: Subscription = { id, name: finalName, pricePerMonthUsd: price, cancelUrl: '#' };
          setCustomItems((prev) => [...prev, newItem]);
          upsertCustomLocal({ id, name: finalName, pricePerMonthUsd: price, cancelUrl: '#', cadence, nextChargeAt, notifyEmail, notifyPush });
          if (session) {
            fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customUpsert: { id, name: finalName, cancelUrl: '#', pricePerMonthUsd: price, cadence, nextChargeAt, notifyEmail, notifyPush } }) });
          }
          setTrackingOpen(false);
        }}
      />

      <EditPriceModal
        open={!!editTarget}
        name={editTarget?.name ?? ''}
        price={editTarget?.pricePerMonthUsd ?? 0}
        cadence={(editTarget?.cadence as 'month'|'year') ?? 'month'}
        nextChargeAt={editTarget?.nextChargeAt}
        requirePrice={!!pendingNewId}
        onDiscard={() => {
          if (!pendingNewId) return;
          setCustomItems((prev) => prev.filter((x) => x.id !== pendingNewId));
          setPendingNewId(null);
        }}
        onClose={() => { setEditTarget(null); setPendingNewId(null); }}
        onSave={({ price, cadence, nextChargeAt, notifyEmail, notifyPush }) => {
          if (!editTarget) return;
          setCustomItems((prev) => prev.map((x) => x.id === editTarget.id ? { ...x, pricePerMonthUsd: price, cadence, nextChargeAt } : x));
          upsertCustomLocal({ id: editTarget.id, name: editTarget.name, pricePerMonthUsd: price, cancelUrl: editTarget.cancelUrl, cadence, nextChargeAt, notifyEmail, notifyPush });
          if (session) {
            fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customUpsert: { id: editTarget.id, name: editTarget.name, cancelUrl: editTarget.cancelUrl, pricePerMonthUsd: price, cadence, nextChargeAt, notifyEmail, notifyPush } }) });
          }
          setPendingNewId(null);
        }}
      />
    </section>
  );
}
