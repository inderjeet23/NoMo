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
  return new Response(JSON.stringify({ subscriptions: data }), { headers: { 'Content-Type': 'application/json' } });
}


