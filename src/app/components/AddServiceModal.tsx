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
        const res = await fetch('/api/directory');
        const data = await res.json();
        setOptions(Array.isArray(data?.options) ? data.options : []);
      } catch {
        setOptions([]);
      }
    })();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.name.toLowerCase().includes(q))
      : options.slice(0, 12);
    return list.slice(0, 6);
  }, [options, query]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Add a service</h2>
          <button className="px-2 py-1 rounded-md hover:bg-neutral-800" onClick={onClose} aria-label="Close add service">✖</button>
        </div>
        <input
          autoFocus
          placeholder="Search services (e.g., Netflix)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
        />
        <div className="mt-3 grid gap-1">
          {results.map((opt) => (
            <button
              key={opt.id}
              className="w-full text-left rounded-lg px-3 py-2 hover:bg-neutral-800"
              onClick={() => {
                onSelect(opt);
                onClose();
              }}
            >
              <div className="font-medium">{opt.name}</div>
              <div className="text-xs text-neutral-400">{opt.region ? `${opt.region} • ` : ''}{opt.flow || ''}</div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="text-sm text-neutral-400 px-1 py-2">No matches</div>
          )}
        </div>
      </div>
    </div>
  );
}


