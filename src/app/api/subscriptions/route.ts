import { getServerSession } from 'next-auth';
import { auth } from '@/app/auth/options';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(auth);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const email = session.user.email;
  const { adminDb } = await import('@/lib/firebaseAdmin');
  const doc = await adminDb
    .collection('users')
    .doc(email)
    .collection('subscriptions')
    .doc('detected')
    .get();
  const data = doc.exists ? doc.data()?.list ?? [] : [];
  const prefsDoc = await adminDb.collection('users').doc(email).collection('meta').doc('prefs').get();
  const prefs = prefsDoc.exists ? prefsDoc.data() : {};
  const canceledDoc = await adminDb.collection('users').doc(email).collection('subscriptions').doc('canceled').get();
  const canceled = canceledDoc.exists ? canceledDoc.data()?.ids ?? [] : [];
  const customSnap = await adminDb.collection('users').doc(email).collection('subscriptions').doc('custom').get();
  const custom = customSnap.exists ? (customSnap.data()?.list ?? []) : [];
  const removedSnap = await adminDb.collection('users').doc(email).collection('subscriptions').doc('removed').get();
  const removed = removedSnap.exists ? (removedSnap.data()?.ids ?? []) : [];
  return new Response(
    JSON.stringify({ subscriptions: data, prefs, canceled, custom, removed }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(auth);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const email = session.user.email;
  const body = await req.json();
  const { prefs, canceledIds, removedIds, customAdd, customUpsert, resetAll } = body as {
    prefs?: unknown;
    canceledIds?: string[];
    removedIds?: string[];
    customAdd?: { id: string; name: string; cancelUrl?: string }; // backward compat
    customUpsert?: { id: string; name: string; cancelUrl?: string; pricePerMonthUsd?: number; cadence?: 'month'|'year'; nextChargeAt?: string; notifyEmail?: boolean };
    resetAll?: boolean;
  };
  const { adminDb } = await import('@/lib/firebaseAdmin');
  if (resetAll) {
    const userRef = adminDb.collection('users').doc(email);
    await userRef.collection('subscriptions').doc('canceled').set({ ids: [], updatedAt: new Date() });
    await userRef.collection('subscriptions').doc('removed').set({ ids: [], updatedAt: new Date() });
    await userRef.collection('subscriptions').doc('custom').set({ list: [], updatedAt: new Date() });
    await userRef.collection('subscriptions').doc('detected').set({ list: [], updatedAt: new Date() });
    await userRef.collection('meta').doc('prefs').set({ hiddenIds: [], sort: 'name' }, { merge: true });
    // Also clear realtime subscriptions doc keyed by email
    await adminDb.collection('subscriptions').doc(email).set({ items: [], updatedAt: Date.now() });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (prefs && typeof prefs === 'object') {
    await adminDb.collection('users').doc(email).collection('meta').doc('prefs').set(prefs as Record<string, unknown>, { merge: true });
  }
  if (Array.isArray(canceledIds)) {
    await adminDb.collection('users').doc(email).collection('subscriptions').doc('canceled').set({ ids: canceledIds, updatedAt: new Date() });
  }
  if (Array.isArray(removedIds)) {
    await adminDb.collection('users').doc(email).collection('subscriptions').doc('removed').set({ ids: removedIds, updatedAt: new Date() });
  }
  if (customAdd && customAdd.id && customAdd.name) {
    const ref = adminDb.collection('users').doc(email).collection('subscriptions').doc('custom');
    const snap = await ref.get();
    const list = snap.exists ? (snap.data()?.list ?? []) : [] as Array<{ id: string; name: string; cancelUrl?: string }>;
    const exists = Array.isArray(list) && list.find((x: { id: string }) => x?.id === customAdd.id);
    const next = exists ? list : [...list, { id: customAdd.id, name: customAdd.name, cancelUrl: customAdd.cancelUrl ?? '' }];
    await ref.set({ list: next, updatedAt: new Date() });
  }
  if (customUpsert && customUpsert.id && customUpsert.name) {
    const ref = adminDb.collection('users').doc(email).collection('subscriptions').doc('custom');
    const snap = await ref.get();
    type Custom = { id: string; name: string; cancelUrl?: string; pricePerMonthUsd?: number; cadence?: 'month'|'year'; nextChargeAt?: string; notifyEmail?: boolean };
    const list = (snap.exists ? (snap.data()?.list ?? []) : []) as Custom[];
    const idx = list.findIndex((x) => x.id === customUpsert.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...customUpsert };
    else list.push(customUpsert as Custom);
    await ref.set({ list, updatedAt: new Date() });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}


