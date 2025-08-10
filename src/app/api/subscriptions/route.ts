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
  return new Response(
    JSON.stringify({ subscriptions: data, prefs, canceled, custom }),
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
  const { prefs, canceledIds, customAdd } = body as {
    prefs?: unknown;
    canceledIds?: string[];
    customAdd?: { id: string; name: string; cancelUrl?: string };
  };
  const { adminDb } = await import('@/lib/firebaseAdmin');
  if (prefs && typeof prefs === 'object') {
    await adminDb.collection('users').doc(email).collection('meta').doc('prefs').set(prefs as Record<string, unknown>, { merge: true });
  }
  if (Array.isArray(canceledIds)) {
    await adminDb.collection('users').doc(email).collection('subscriptions').doc('canceled').set({ ids: canceledIds, updatedAt: new Date() });
  }
  if (customAdd && customAdd.id && customAdd.name) {
    const ref = adminDb.collection('users').doc(email).collection('subscriptions').doc('custom');
    const snap = await ref.get();
    const list = snap.exists ? (snap.data()?.list ?? []) : [] as Array<{ id: string; name: string; cancelUrl?: string }>;
    const exists = Array.isArray(list) && list.find((x: { id: string }) => x?.id === customAdd.id);
    const next = exists ? list : [...list, { id: customAdd.id, name: customAdd.name, cancelUrl: customAdd.cancelUrl ?? '' }];
    await ref.set({ list: next, updatedAt: new Date() });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}


