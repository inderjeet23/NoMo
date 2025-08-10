import { NextRequest } from 'next/server';
import { parseCsv } from '@/lib/parseCsv';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const csvPath = path.join(process.cwd(), 'NoMo_Cancel_Directory_v1__preview_.csv');
    const text = await fs.readFile(csvPath, 'utf8');
    const rows = parseCsv(text);
    // Map to lightweight options for UI
    const options = rows.map((r) => ({
      id: r.service.toLowerCase().replace(/\s+/g, '-'),
      name: r.service,
      cancelUrl: r.cancel_url_hint || '',
      flow: r.flow || '',
      region: r.region || '',
    }));
    return new Response(JSON.stringify({ options }), { headers: { 'Content-Type': 'application/json' } });
  } catch (_e) {
    return new Response(JSON.stringify({ options: [] }), { headers: { 'Content-Type': 'application/json' } });
  }
}


