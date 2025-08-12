'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import AddChooserModal from './AddChooserModal';
import EditPriceModal from './EditPriceModal';
import { upsertCustomLocal, getCustomLocal, removeCustomLocal } from '@/lib/customLocal';
// Server APIs persist changes; avoid client Firestore writes to bypass rules
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
  const [newlyDetectedIds, setNewlyDetectedIds] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanOverlayOpen, setScanOverlayOpen] = useState<boolean>(false);
  const [scanOverlayMode, setScanOverlayMode] = useState<'idle'|'scanning'|'result'|'error'>('idle');
  const [scanStage, setScanStage] = useState<string>('Initializing scan…');
  const [scanSummary, setScanSummary] = useState<{ totalUsd: number; count: number }>({ totalUsd: 0, count: 0 });
  const [cancelledIds, setCancelledIds] = useState<string[]>([]);
  const [monthlySavings, setMonthlySavings] = useState<number>(0);
  // Gmail scanning temporarily out of scope
  const [prefs, setPrefsState] = useState<Preferences>({ hiddenIds: [], sort: 'name' });
  const [directory, setDirectory] = useState<Array<{ id: string; name: string; cancelUrl: string; flow: string; region: string }>>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [customItems, setCustomItems] = useState<Subscription[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [pendingNewId, setPendingNewId] = useState<string | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [hiddenOpen, setHiddenOpen] = useState<boolean>(false);
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

  // On sign-in, fetch saved subscriptions, prefs, canceled/removed, and custom items
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
        const merged: Preferences = { hiddenIds: Array.isArray(serverPrefs.hiddenIds) ? serverPrefs.hiddenIds as string[] : [], sort: serverPrefs.sort === 'price' ? 'price' : 'name' };
        // Do not write to localStorage when signed in; rely on server
        setPrefsState(merged);
      }
      // When authenticated we use Firestore as the source of items via parent.
      if (Array.isArray(data?.removed)) {
        setRemovedIds(data.removed as string[]);
      }
      // Load custom items from server when available
      if (Array.isArray(data?.custom)) {
        const list = (data.custom as Array<{ id: string; name: string; cancelUrl?: string; pricePerMonthUsd?: number; cadence?: 'month'|'year'; nextChargeAt?: string }>);
        const mapped = list.map((c) => ({
          id: (c.id || c.name).toLowerCase(),
          name: c.name,
          pricePerMonthUsd: Number(c.pricePerMonthUsd || 0),
          cancelUrl: c.cancelUrl || '#',
          cadence: (c.cadence as 'month'|'year') || 'month',
          nextChargeAt: c.nextChargeAt,
        })) as Subscription[];
        setCustomItems(mapped);
      }
    }
    fetchSaved();
  }, [session]);

  useEffect(() => {
    if (newlyDetectedIds.length === 0) return;
    const t = setTimeout(() => setNewlyDetectedIds([]), 8500);
    return () => clearTimeout(t);
  }, [newlyDetectedIds]);

  // If we return from Google sign-in, resume scan automatically
  useEffect(() => {
    const pending = typeof window !== 'undefined' && window.localStorage.getItem('nomo_scan_pending') === '1';
    if (!pending) return;
    if (!session) return; // wait for session
    // Clear the flag and kick off overlay flow
    window.localStorage.removeItem('nomo_scan_pending');
    void startScanOverlayFlow();
  }, [session]);

  async function startScanOverlayFlow() {
    setScanError(null);
    setScanOverlayOpen(true);
    setScanOverlayMode('scanning');
    setScanStage('Initializing scan…');
    const token = (session as unknown as { accessToken?: string })?.accessToken;
    if (!token) {
      // Persist intent across redirect
      window.localStorage.setItem('nomo_scan_pending', '1');
      await signIn('google');
      return;
    }
    try {
      setIsScanning(true);
      setScanStage('Querying Gmail…');
      const res = await fetch('/api/scan', { method: 'POST' });
      if (res.status === 400 || res.status === 401) {
        window.localStorage.setItem('nomo_scan_pending', '1');
        await signIn('google');
        return;
      }
      if (!res.ok) {
        const msg = await res.text().catch(()=> 'Scan failed');
        setScanError(msg);
        setScanOverlayMode('error');
        setIsScanning(false);
        return;
      }
      const data = await res.json();
      const newly = Array.isArray(data?.subscriptions) ? (data.subscriptions as Array<{ id: string }>).map(s=>s.id) : [];
      setNewlyDetectedIds(newly);
      setScanStage('Analyzing results…');
      const ref = await fetch('/api/subscriptions');
      if (ref.ok) {
        const payload = await ref.json();
        const ids: string[] = Array.isArray(payload?.subscriptions) ? payload.subscriptions.map((s: { id: string }) => s.id) : [];
        setDetectedIds(ids);
        // Compute summary against current merged items
        const merged = mergeByName(items, customItems);
        const matched = merged.filter((s) => ids.includes(s.id));
        const total = matched.reduce((sum, s) => sum + (Number(s.pricePerMonthUsd || 0)), 0);
        setScanSummary({ totalUsd: total, count: matched.length });
      } else {
        setScanSummary({ totalUsd: 0, count: newly.length });
      }
      setScanOverlayMode('result');
    } catch (_e) {
      setScanError('Scan failed');
      setScanOverlayMode('error');
    } finally {
      setIsScanning(false);
    }
  }

  // Load directory options from CSV on mount
  useEffect(() => {
    async function loadDir() {
      const res = await fetch('/api/directory', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setDirectory(Array.isArray(data?.options) ? data.options : []);
    }
    loadDir();
    // For signed-out users, hydrate from local custom storage
    if (!session) {
      const local = getCustomLocal();
      if (local.length) {
        setCustomItems((prev) => {
          const map = new Map(prev.map((p) => [normalizeKey(p), p] as const));
          for (const c of local) {
            const key = normalizeKey({ id: c.id, name: c.name, pricePerMonthUsd: c.pricePerMonthUsd, cancelUrl: c.cancelUrl || '#' } as Subscription);
            map.set(key, { id: c.id, name: c.name, pricePerMonthUsd: c.pricePerMonthUsd, cancelUrl: c.cancelUrl || '#' });
          }
          return Array.from(map.values());
        });
      }
    }
  }, [session]);

  function normalizeKey(s: Subscription): string {
    return (s.id || s.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function mergeByName(base: Subscription[], custom: Subscription[]): Subscription[] {
    const map = new Map<string, Subscription>();
    for (const b of base) map.set(b.id, b);
    for (const c of custom) map.set(c.id, c); // custom overrides base by id
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

  // scanInbox removed for now

  function updatePrefs(next: Partial<Preferences>) {
    const merged: Preferences = { ...prefs, ...next };
    setPrefsState(merged);
    // Persist: server if signed in, otherwise local storage
    if (session) {
      fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefs: merged }) });
    } else {
      setPrefs(merged);
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
      {/* Removed redundant connected-as card */}
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold mb-2">Your Subscriptions</h2>
        <div className="toolbar-card rounded-xl p-2 flex items-center gap-2 text-sm overflow-x-auto no-scrollbar">
          <div className="flex-none">
            <button
              aria-label="Options"
              className="pressable rounded-lg px-3 h-10 bg-app border border-app"
              onClick={()=>setSheetOpen(true)}
            >
              ⋯
            </button>
          </div>
          <div className="flex items-center gap-2 flex-none ml-auto">
            <button
              className="btn tap h-10 px-4 pressable"
              onClick={()=>setChooserOpen(true)}
            >
              Add Subscription
            </button>
          </div>
        </div>
        {/* Insights button hidden until scan is re-enabled */}
      </div>

      <ul className="space-y-3 sm:space-y-2">
        <AnimatePresence initial={false}>
          {sortItems(mergeByName(items, customItems))
            .filter((s) => !cancelledIds.includes(s.id))
            .filter((s) => !removedIds.includes(s.id))
            .map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                detected={detectedIds.includes(sub.id)}
                newlyDetected={newlyDetectedIds.includes(sub.id)}
                isGuiding={loadingGuideId === sub.id}
                expanded={expandedId === sub.id}
                onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                onGuide={() => handleGuide(sub)}
                onCancel={() => handleCancelClick(sub)}
                onHide={() => setActiveService(sub)}
                onEditPrice={() => setEditTarget(sub)}
              />
            ))}
        </AnimatePresence>
      </ul>

      {/* Hidden Subscriptions Accordion */}
      <div className="mt-6">
        <button
          type="button"
          className="w-full text-left toolbar-card rounded-xl p-4 flex items-center justify-between pressable"
          onClick={() => setHiddenOpen((v) => !v)}
          aria-expanded={hiddenOpen}
        >
          <span className="text-base font-semibold">Hidden Subscriptions</span>
          <span aria-hidden className={`transition-transform ${hiddenOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        <AnimatePresence initial={false}>
          {hiddenOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <ul className="mt-2 space-y-2">
                {removedIds.length === 0 && (
                  <li className="text-sm text-neutral-400 px-2 py-3">No hidden subscriptions</li>
                )}
                {removedIds.map((id) => {
                  const sub = items.find((s) => s.id === id) || customItems.find((s) => s.id === id);
                  if (!sub) return null;
                  return (
                    <li key={id} className="flex items-center justify-between card rounded-2xl p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="font-medium truncate">{sub.name}</div>
                        <div className="text-sm text-neutral-400 truncate">
                          {sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} / month
                        </div>
                      </div>
                      <button
                        className="btn-quiet pressable"
                        onClick={() => {
                          setRemovedIds((prev) => prev.filter((x) => x !== id));
                          if (session) {
                            const next = removedIds.filter((x) => x !== id);
                            fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removedIds: next }) });
                          }
                          announce('Restored to list');
                        }}
                      >
                        Unhide
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomSheet
        open={sheetOpen || !!loadingGuideId}
        title={guideHtml || loadingGuideId ? 'Step-by-step guide' : 'Options'}
        onClose={() => { setSheetOpen(false); if (!guideHtml) return; setGuideHtml(null); }}
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
        ) : guideHtml ? (
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: guideHtml! }} />
        ) : (
          <div className="grid gap-3">
            {isScanning && (
              <div className="rounded-lg border border-app bg-app p-3 text-sm flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" aria-hidden />
                <span>Scanning Gmail… This can take up to 15 seconds.</span>
              </div>
            )}
            {!!scanError && (
              <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-3 text-sm text-rose-200" role="alert">
                {scanError}
              </div>
            )}
            {newlyDetectedIds.length > 0 && (
              <div className="rounded-lg border border-green-800 bg-green-900/30 p-3 text-sm text-green-200">
                Found {newlyDetectedIds.length} new {newlyDetectedIds.length===1 ? 'subscription' : 'subscriptions'}. They’re highlighted as “New” in your list.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="text-sm text-neutral-300">Sort</div>
              <select className="bg-app border border-app rounded-lg px-3 h-10 tap pressable" value={prefs.sort} onChange={(e)=>updatePrefs({ sort: e.target.value as Preferences['sort'] })}>
                <option value="name">Name</option>
                <option value="price">Price</option>
              </select>
            </div>
            {session && (
              <button
                className={`btn-glass-blue tap h-10 ${isScanning ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isScanning}
                onClick={startScanOverlayFlow}
              >
                {isScanning ? 'Scanning…' : 'Connect Gmail & Scan'}
              </button>
            )}
            {session && (
              <button
                className="btn-quiet tap pressable h-10 px-4"
                onClick={async ()=>{
                  const ok = window.confirm('This will remove all subscriptions, hidden and canceled, and reset prefs. Continue?');
                  if (!ok) return;
                  await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resetAll: true }) });
                  setDetectedIds([]);
                  setCancelledIds([]);
                  setRemovedIds([]);
                  setCustomItems([]);
                  setPrefsState({ hiddenIds: [], sort: 'name' });
                  announce('All data reset');
                }}
              >
                Reset All
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Full-screen Scan Overlay */}
      {scanOverlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-auto text-center px-6">
            {scanOverlayMode === 'scanning' && (
              <div className="glass-card rounded-2xl px-6 py-10">
                <div className="text-4xl mb-4" aria-hidden>📧</div>
                <div className="text-2xl font-extrabold mb-1">Scanning your email…</div>
                <div className="text-sm text-neutral-300 mb-6">Looking for subscription and billing emails</div>
                <div className="h-2 bg-app/50 rounded-full overflow-hidden mb-2">
                  <div className="h-full w-1/3 bg-blue-600 animate-[loading_1.2s_ease-in-out_infinite]" />
                </div>
                <div className="text-xs text-neutral-400">{scanStage}</div>
              </div>
            )}
            {scanOverlayMode === 'result' && (
              <div className="glass-card rounded-2xl px-6 py-10">
                <div className="text-2xl font-extrabold mb-2">Found your subscriptions</div>
                <div className="text-sm text-neutral-300 mb-6">Here's what's charging your accounts</div>
                <div className="rounded-xl border border-rose-800 bg-rose-900/30 p-4 mb-6">
                  <div className="text-3xl font-extrabold text-rose-300">{scanSummary.totalUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}<span className="text-base font-semibold text-rose-200">/month</span></div>
                  <div className="text-xs text-rose-200/80 mt-1">across {scanSummary.count} {scanSummary.count===1?'subscription':'subscriptions'}</div>
                </div>
                <button className="btn-glass-blue" onClick={()=>{ setScanOverlayOpen(false); setScanOverlayMode('idle'); }}>Let's optimize this</button>
              </div>
            )}
            {scanOverlayMode === 'error' && (
              <div className="glass-card rounded-2xl px-6 py-10">
                <div className="text-2xl font-extrabold mb-2">Scan failed</div>
                <div className="text-sm text-neutral-300 mb-6">{scanError || 'Please try again.'}</div>
                <div className="flex items-center justify-center gap-3">
                  <button className="btn-quiet" onClick={()=>{ setScanOverlayOpen(false); setScanOverlayMode('idle'); }}>Close</button>
                  <button className="btn-glass-blue" onClick={()=>{ void startScanOverlayFlow(); }}>Try again</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Confirmation modal repurposed for Remove flow */}
      <ConfirmModal
        open={!!activeService}
        serviceName={activeService?.name ?? ''}
        title={activeService ? 'Did you cancel this subscription?' : undefined}
        confirmLabel="Yes, I Canceled It"
        cancelLabel="No, Just Hide It"
        onConfirm={() => {
          if (!activeService) return;
          // Move to canceled and update savings
          setCancelledIds((prev) => prev.includes(activeService.id) ? prev : [...prev, activeService.id]);
          setMonthlySavings((prev) => prev + (activeService.pricePerMonthUsd || 0));
          if (session) {
            const next = [...new Set([...(cancelledIds || []), activeService.id])];
            fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canceledIds: next }) });
          }
          setActiveService(null);
          announce('Marked as cancelled');
          if (window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
          }
        }}
        onCancel={() => {
          if (!activeService) return;
          // Hide only (do not add savings)
          setCustomItems((prev) => prev.filter((x) => normalizeKey(x) !== normalizeKey(activeService)));
            if (!session) {
              removeCustomLocal(activeService.id);
            }
          setRemovedIds((prev) => {
            const next = Array.from(new Set([...prev, activeService!.id]));
            if (session) {
              fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removedIds: next }) });
            }
            return next;
          });
          setDetectedIds((prev) => prev.filter((id) => id !== activeService!.id));
          // Removal persisted via /api/subscriptions; no client Firestore writes
          setActiveService(null);
        }}
      />

      {cancelledIds.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Canceled</h3>
            <div className="text-sm text-green-300 font-semibold">Monthly Savings: {monthlySavings.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</div>
          </div>
          <ul className="space-y-2">
            {mergeByName(items, customItems).filter((s) => cancelledIds.includes(s.id)).map((sub) => (
              <li key={sub.id} className="flex items-center justify-between card rounded-2xl p-4 opacity-80">
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
                <button
                  className="btn-quiet pressable"
                  onClick={() => {
                    setCancelledIds((prev)=>{
                      const next = prev.filter((id)=>id!==sub.id);
                      if (session) {
                        fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canceledIds: next }) });
                      }
                      return next;
                    });
                    announce('Restored to active');
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddChooserModal
        open={chooserOpen}
        onClose={()=>setChooserOpen(false)}
        onChoose={(choice)=>{
          if (choice==='directory') setAddOpen(true);
          if (choice==='custom') setTrackingOpen(true);
        }}
      />

      <AddServiceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSelect={(opt) => {
          if (!detectedIds.includes(opt.id)) setDetectedIds((prev) => [...prev, opt.id]);
          // add immediately to local custom items for display
            const newId = (opt.id || opt.name).toLowerCase();
            const newItem: Subscription = { id: newId, name: opt.name, pricePerMonthUsd: 0, cancelUrl: opt.cancelUrl || '#' };
          setCustomItems((prev) => {
            const exists = prev.find((p) => normalizeKey(p) === normalizeKey(newItem));
            return exists ? prev : [...prev, newItem];
          });
           // If previously removed, restore it
           setRemovedIds((prev) => {
             const next = prev.filter((id) => id !== newId);
             if (session) {
               fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removedIds: next }) });
             }
             return next;
           });
          // persist selection if signed in
          if (session) {
            fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customUpsert: { id: newItem.id, name: newItem.name, cancelUrl: newItem.cancelUrl, pricePerMonthUsd: 0 } }) });
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
        onSave={({ name, price, cadence, nextChargeAt, notifyEmail }) => {
          const id = `custom-${Date.now()}`;
          const finalName = (name && name.trim()) || 'Custom service';
          const newItem: Subscription = { id, name: finalName, pricePerMonthUsd: price, cancelUrl: '#' };
          setCustomItems((prev) => [...prev, newItem]);
          if (!session) {
            upsertCustomLocal({ id, name: finalName, pricePerMonthUsd: price, cancelUrl: '#', cadence, nextChargeAt, notifyEmail });
          }
          if (session) {
            fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customUpsert: { id, name: finalName, cancelUrl: '#', pricePerMonthUsd: price, cadence, nextChargeAt, notifyEmail } }) });
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
        onSave={({ price, cadence, nextChargeAt, notifyEmail }) => {
          if (!editTarget) return;
          setCustomItems((prev) => prev.map((x) => x.id === editTarget.id ? { ...x, pricePerMonthUsd: price, cadence, nextChargeAt } : x));
          if (!session) {
            upsertCustomLocal({ id: editTarget.id, name: editTarget.name, pricePerMonthUsd: price, cancelUrl: editTarget.cancelUrl, cadence, nextChargeAt, notifyEmail });
          }
          if (session) {
            fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customUpsert: { id: editTarget.id, name: editTarget.name, cancelUrl: editTarget.cancelUrl, pricePerMonthUsd: price, cadence, nextChargeAt, notifyEmail } }) });
          }
          setPendingNewId(null);
        }}
      />
    </section>
  );
}
