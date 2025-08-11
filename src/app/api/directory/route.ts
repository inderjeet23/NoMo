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
    // Map and dedupe by id (last wins), sort by name
    const byId = new Map<string, { id: string; name: string; cancelUrl: string; flow: string; region: string }>();
    for (const r of rows) {
      const id = r.service.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      byId.set(id, {
        id,
        name: r.service,
        cancelUrl: r.cancel_url_hint || '',
        flow: r.flow || '',
        region: r.region || '',
      });
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


