import { NextRequest } from 'next/server';
import { parseCsv } from '@/lib/parseCsv';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const csvPath = path.join(process.cwd(), 'NoMo_Cancel_Directory_v1__preview_.csv');
    const [text, stat] = await Promise.all([
      fs.readFile(csvPath, 'utf8'),
      fs.stat(csvPath),
    ]);
    const rows = parseCsv(text);
    // Map and dedupe; consolidate ChatGPT and Claude variants into single entries
    type Dir = { id: string; name: string; cancelUrl: string; flow: string; region: string };
    const byId = new Map<string, Dir>();
    function toCanonical(serviceName: string): { id: string; name: string } {
      const raw = serviceName.trim();
      let base = raw;
      if (/^ChatGPT\b/i.test(raw)) base = 'ChatGPT';
      else if (/^Claude\b/i.test(raw)) base = 'Claude';
      const id = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return { id, name: base };
    }
    for (const r of rows) {
      const c = toCanonical(r.service);
      const existing = byId.get(c.id);
      const candidate: Dir = {
        id: c.id,
        name: c.name,
        cancelUrl: r.cancel_url_hint || '',
        flow: r.flow || '',
        region: r.region || '',
      };
      if (!existing) {
        byId.set(c.id, candidate);
      } else {
        // Prefer a clear web destination when available
        const isWebRow = /\(web\)/i.test(r.service) || /chat\.openai\.com|claude\.ai/i.test(candidate.cancelUrl);
        if (isWebRow) {
          byId.set(c.id, { ...existing, cancelUrl: candidate.cancelUrl || existing.cancelUrl, flow: candidate.flow || existing.flow });
        }
      }
    }
    const options = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
    const headers = new Headers({
      'Content-Type': 'application/json',
      // Prevent CDN caching so newly uploaded CSV is reflected immediately
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ETag: `${stat.mtimeMs}-${stat.size}`,
    });
    return new Response(JSON.stringify({ options }), { headers });
  } catch (_e) {
    return new Response(JSON.stringify({ options: [] }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
}


