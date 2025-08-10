import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { auth } from "../../auth/options";
import { google } from "googleapis";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const session = await getServerSession(auth);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    // Use access token from session (NextAuth stores in JWT)
    const token = (session as { accessToken?: string } | null)?.accessToken;
    if (!token) return new Response(JSON.stringify({ error: "No token" }), { status: 400 });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Search for subscription receipts in Inbox (simple heuristic)
    const query = [
      'category:primary newer_than:1y',
      '("receipt" OR "subscription" OR "invoice" OR "payment")',
      '-subject:"promo" -subject:"promotion" -label:promotions -subject:"sale"',
    ].join(' ');
    const list = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 25 });

    const messages = await Promise.all(
      (list.data.messages ?? []).map(async (m) => {
        const msg = await gmail.users.messages.get({ userId: "me", id: m.id! });
        const headers = Object.fromEntries(
          (msg.data.payload?.headers ?? []).map((h) => [h.name?.toLowerCase(), h.value])
        );
        const from = headers["from"] ?? "";
        const snippet = msg.data.snippet ?? "";
        return { id: m.id, from, snippet };
      })
    );

    // Very basic vendor extraction
    const vendors = [
      { id: "netflix", name: "Netflix", match: /netflix/i },
      { id: "spotify", name: "Spotify", match: /spotify/i },
      { id: "adobe-cc", name: "Adobe", match: /adobe/i },
    ];

    const found: Array<{ id: string; name: string }> = [];
    for (const msg of messages) {
      for (const v of vendors) {
        if (v.match.test(msg.from) || v.match.test(msg.snippet)) {
          if (!found.find((f) => f.id === v.id)) found.push({ id: v.id, name: v.name });
        }
      }
    }

    // Persist to Firestore by user email
    const userEmail = session.user?.email || 'unknown';
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const userDoc = adminDb.collection('users').doc(userEmail);
    await userDoc.set({ email: userEmail }, { merge: true });
    await userDoc.collection('subscriptions').doc('detected').set({ list: found, updatedAt: new Date() });

    return new Response(JSON.stringify({ subscriptions: found }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Scan failed" }), { status: 500 });
  }
}


