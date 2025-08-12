import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { auth } from "../../auth/options";
import { google } from "googleapis";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const session = await getServerSession(auth);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Use access token from session (NextAuth stores in JWT)
    const token = (session as { accessToken?: string } | null)?.accessToken;
    if (!token) return new Response(JSON.stringify({ error: "No token" }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Build richer query and page through results
    const query = [
      'category:primary OR category:updates',
      'newer_than:18m',
      '(receipt OR subscription OR invoice OR billed OR billing OR payment)',
      '-subject:promo -subject:promotion -label:promotions -subject:sale',
    ].join(' ');

    let nextPageToken: string | undefined;
    const ids: string[] = [];
    try {
      do {
        const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 100, pageToken: nextPageToken });
        (list.data.messages ?? []).forEach((m) => m.id && ids.push(m.id));
        nextPageToken = list.data.nextPageToken ?? undefined;
        if (ids.length > 400) break; // cap for perf
      } while (nextPageToken);
    } catch (err: unknown) {
      const anyErr = err as { code?: number; message?: string };
      const msg = anyErr?.message || 'Gmail error';
      const isAuth = (anyErr?.code === 401 || anyErr?.code === 403 || /auth|permission|invalid|401|403/i.test(msg));
      const status = isAuth ? 401 : 502;
      return new Response(JSON.stringify({ error: msg || 'Gmail error' }), { status, headers: { 'Content-Type': 'application/json' } });
    }

    const batch = await Promise.all(
      ids.slice(0, 400).map(async (id) => {
        const msg = await gmail.users.messages.get({ userId: 'me', id });
        const headers = Object.fromEntries((msg.data.payload?.headers ?? []).map((h) => [h.name?.toLowerCase(), h.value]));
        return {
          id,
          from: headers['from'] ?? '',
          subject: headers['subject'] ?? '',
          snippet: msg.data.snippet ?? '',
          listId: headers['list-id'] ?? '',
        };
      })
    );

    // Vendor patterns + ids aligned with directory
    const vendors = [
      { id: 'amazon-prime', name: 'Amazon Prime', rx: /(amazon\.com|amazon prime|prime video|amazon digital)/i },
      { id: 'netflix', name: 'Netflix', rx: /netflix/i },
      { id: 'spotify', name: 'Spotify', rx: /spotify/i },
      { id: 'adobe-cc', name: 'Adobe Creative Cloud', rx: /adobe( creative| cc)?/i },
      { id: 'chatgpt', name: 'ChatGPT', rx: /(openai|chatgpt)/i },
      { id: 'youtube-premium', name: 'YouTube Premium', rx: /(youtube premium|youtube music)/i },
      { id: 'apple', name: 'Apple', rx: /(apple\.com\/bill|apple receipt|itunes|app store)/i },
    ];

    const found: Array<{ id: string; name: string }> = [];
    for (const m of batch) {
      for (const v of vendors) {
        if (v.rx.test(m.from) || v.rx.test(m.subject) || v.rx.test(m.snippet) || v.rx.test(m.listId)) {
          if (!found.find((f) => f.id === v.id)) found.push({ id: v.id, name: v.name });
        }
      }
    }

    // Persist to Firestore by user email
    const userEmail = session.user?.email || 'unknown';
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      const userDoc = adminDb.collection('users').doc(userEmail);
      await userDoc.set({ email: userEmail }, { merge: true });
      await userDoc.collection('subscriptions').doc('detected').set({ list: found, updatedAt: new Date() });
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      return new Response(JSON.stringify({ error: anyErr?.message || 'Server storage error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ subscriptions: found }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const anyErr = err as { message?: string };
    return new Response(JSON.stringify({ error: anyErr?.message || "Scan failed" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


