'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function EditPriceModal({ open, name, price, cadence='month', nextChargeAt, notifyEmail=false, notifyPush=false, requirePrice=false, onDiscard, onSave, onClose }: { open: boolean; name: string; price: number; cadence?: 'month'|'year'; nextChargeAt?: string; notifyEmail?: boolean; notifyPush?: boolean; requirePrice?: boolean; onDiscard?: () => void; onSave: (p: { price: number; cadence: 'month'|'year'; nextChargeAt?: string; notifyEmail: boolean; notifyPush: boolean }) => void; onClose: () => void }) {
  const [value, setValue] = useState<string>('');
  const [cad, setCad] = useState<'month'|'year'>(cadence);
  const [date, setDate] = useState<string>(nextChargeAt ?? '');
  const [email, setEmail] = useState<boolean>(notifyEmail);
  const [push, setPush] = useState<boolean>(notifyPush);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(price > 0 ? String(price) : '');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, price]);

  const numeric = useMemo(() => {
    const num = Number(value);
    return Number.isFinite(num) ? num : NaN;
  }, [value]);

  const invalid = useMemo(() => {
    if (value.trim() === '') return true;
    if (!Number.isFinite(numeric)) return true;
    if (numeric <= 0) return true;
    if (numeric > 100000) return true;
    return false;
  }, [value, numeric]);

  function handleBlur() {
    if (!invalid) setValue(numeric.toFixed(2));
  }

  function handleRequestClose() {
    if (requirePrice && invalid) {
      const ok = window.confirm('Discard this service without setting a price?');
      if (!ok) return;
      onDiscard?.();
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleRequestClose} />
      <div className="relative card rounded-t-none sm:rounded-2xl w-full h-[90vh] sm:h-auto sm:max-w-md p-4 overflow-auto overscroll-contain">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Set price for {name}</h2>
          <button className="px-2 py-1 rounded-md hover:bg-neutral-800 tap" onClick={handleRequestClose} aria-label="Close">✖</button>
        </div>
        <div className="grid gap-3">
          <label className="text-sm text-neutral-300">Price per month (USD)</label>
          <input
            ref={inputRef}
            type="number"
            min="0.01"
            step="0.01"
            value={value}
            onBlur={handleBlur}
            onChange={(e)=>setValue(e.target.value)}
            aria-invalid={requirePrice && invalid}
            aria-describedby={requirePrice && invalid ? 'price-error' : undefined}
            className="w-full rounded-lg bg-app border border-app px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
          />
          {requirePrice && invalid && (
            <div id="price-error" className="text-xs text-rose-500">Enter a valid monthly price to continue.</div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-neutral-300">Cadence</label>
            <select value={cad} onChange={(e)=>setCad(e.target.value as 'month'|'year')} className="rounded-lg bg-app border border-app px-3 py-2 text-sm">
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-sm text-neutral-300">Next charge date (optional)</label>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="rounded-lg bg-app border border-app px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm"><input className="w-5 h-5" type="checkbox" checked={email} onChange={(e)=>setEmail(e.target.checked)} /> Email reminders</label>
            <label className="flex items-center gap-2 text-sm"><input className="w-5 h-5" type="checkbox" checked={push} onChange={(e)=>setPush(e.target.checked)} /> Push reminders</label>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn btn-secondary tap" onClick={handleRequestClose}>{requirePrice ? 'Discard' : 'Cancel'}</button>
            <button className="btn tap" disabled={requirePrice && invalid} onClick={()=>{ const v = Number(value); if (!isNaN(v) && v > 0) { onSave({ price: v, cadence: cad, nextChargeAt: date || undefined, notifyEmail: email, notifyPush: push }); onClose(); } }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


