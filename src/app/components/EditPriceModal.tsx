'use client';
import { useEffect, useRef, useState } from 'react';

export default function EditPriceModal({ open, name, price, cadence='month', nextChargeAt, notifyEmail=false, notifyPush=false, onSave, onClose }: { open: boolean; name: string; price: number; cadence?: 'month'|'year'; nextChargeAt?: string; notifyEmail?: boolean; notifyPush?: boolean; onSave: (p: { price: number; cadence: 'month'|'year'; nextChargeAt?: string; notifyEmail: boolean; notifyPush: boolean }) => void; onClose: () => void }) {
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

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative card rounded-t-none sm:rounded-2xl w-full h-[90vh] sm:h-auto sm:max-w-md p-4 overflow-auto overscroll-contain">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Set price for {name}</h2>
          <button className="px-2 py-1 rounded-md hover:bg-neutral-800 tap" onClick={onClose} aria-label="Close">✖</button>
        </div>
        <div className="grid gap-3">
          <label className="text-sm text-neutral-300">Price per month (USD)</label>
          <input ref={inputRef} type="number" min="0" step="0.01" value={value} onChange={(e)=>setValue(e.target.value)} className="w-full rounded-lg bg-app border border-app px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
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
            <button className="btn btn-secondary tap" onClick={onClose}>Cancel</button>
            <button className="btn tap" onClick={()=>{ const v = Number(value); if (!isNaN(v)) onSave({ price: v, cadence: cad, nextChargeAt: date || undefined, notifyEmail: email, notifyPush: push }); onClose(); }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}


