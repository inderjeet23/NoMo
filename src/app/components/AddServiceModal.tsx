'use client';
import { useEffect, useMemo, useState } from 'react';

export type DirectoryOption = { id: string; name: string; cancelUrl: string; flow: string; region: string };

export default function AddServiceModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (opt: DirectoryOption) => void }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<DirectoryOption[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch('/api/directory', { cache: 'no-store' });
        const data = await res.json();
        setOptions(Array.isArray(data?.options) ? data.options : []);
      } catch {
        setOptions([]);
      }
    })();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as DirectoryOption[];
    const list = options.filter((o) => o.name.toLowerCase().includes(q));
    return list.slice(0, 6);
  }, [options, query]);

  const grouped = useMemo(() => {
    if (query.trim()) return {} as Record<string, DirectoryOption[]>;
    const by: Record<string, DirectoryOption[]> = {};
    for (const o of options) {
      const l = (o.name[0] || '#').toUpperCase();
      if (!by[l]) by[l] = [];
      by[l]!.push(o);
    }
    Object.keys(by).forEach((k) => by[k]!.sort((a, b) => a.name.localeCompare(b.name)));
    return by;
  }, [options, query]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-4 transform transition-transform duration-200 ease-out translate-y-0 sm:translate-y-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Add a service</h2>
          <button className="px-2 py-1 rounded-md hover:bg-[color:var(--surface)] tap" onClick={onClose} aria-label="Close add service">✖</button>
        </div>
        <input
          autoFocus
          placeholder="Search services (e.g., Netflix)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg bg-app border border-app px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
        />
        <div className="mt-3 relative">
          {results.length > 0 && (
            <div className="grid gap-1">
              {results.map((opt) => (
                <button
                  key={opt.id}
                className="w-full text-left rounded-lg px-3 py-3 hover:bg-[color:var(--surface)] tap"
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                >
                  <div className="font-medium">{opt.name}</div>
                  <div className="text-xs text-neutral-400">{opt.region ? `${opt.region} • ` : ''}{opt.flow || ''}</div>
                </button>
              ))}
            </div>
          )}
          {results.length === 0 && (
            <div className="max-h-80 overflow-auto pr-8">
              {Object.keys(grouped).sort().map((letter) => (
                <div key={letter} id={`section-${letter}`} className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-neutral-400 px-1 mb-1">{letter}</div>
                  <div className="grid gap-1">
                    {grouped[letter]!.slice(0, 10).map((opt) => (
                      <button
                        key={opt.id}
                        className="w-full text-left rounded-lg px-3 py-3 hover:bg-[color:var(--surface)] tap"
                        onClick={() => {
                          onSelect(opt);
                          onClose();
                        }}
                      >
                        <div className="font-medium">{opt.name}</div>
                        <div className="text-xs text-neutral-400">{opt.region ? `${opt.region} • ` : ''}{opt.flow || ''}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <div className="text-sm text-neutral-400 px-1 py-2">No services loaded</div>
              )}
            </div>
          )}
          {results.length === 0 && Object.keys(grouped).length > 0 && (
            <div className="absolute top-0 right-0 h-full flex flex-col items-center justify-start gap-1 py-1">
              {Object.keys(grouped).sort().map((letter) => (
                <button
                  key={letter}
                  className="text-[10px] text-neutral-400 hover:text-white px-1"
                  onClick={() => document.getElementById(`section-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


