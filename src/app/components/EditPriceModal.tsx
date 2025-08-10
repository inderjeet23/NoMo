'use client';
import { useEffect, useRef, useState } from 'react';

export default function EditPriceModal({ open, name, price, onSave, onClose }: { open: boolean; name: string; price: number; onSave: (p: number) => void; onClose: () => void }) {
  const [value, setValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(price > 0 ? String(price) : '');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, price]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Set price for {name}</h2>
          <button className="px-2 py-1 rounded-md hover:bg-neutral-800 tap" onClick={onClose} aria-label="Close">✖</button>
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-neutral-300">Price per month (USD)</label>
          <input ref={inputRef} type="number" min="0" step="0.01" value={value} onChange={(e)=>setValue(e.target.value)} className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn btn-secondary tap" onClick={onClose}>Cancel</button>
            <button className="btn tap" onClick={()=>{ const v = Number(value); if (!isNaN(v)) onSave(v); onClose(); }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}


