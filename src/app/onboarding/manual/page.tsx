'use client';
import { FormEvent, useState } from 'react';
import { addLocalSubscription } from '@/lib/localSubs';
import { useRouter } from 'next/navigation';

export default function ManualAdd() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !price) return;
    setLoading(true);
    addLocalSubscription({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      pricePerMonthUsd: Number(price),
      cancelUrl: cancelUrl || 'https://example.com',
    });
    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 300);
  }

  return (
    <main className="min-h-screen bg-white text-black p-6">
      <h1 className="text-3xl font-extrabold mb-6">Add a subscription</h1>
      <form onSubmit={onSubmit} className="max-w-md grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Name</span>
          <input className="rounded-lg border border-neutral-300 px-3 py-2" value={name} onChange={e=>setName(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Price per month (USD)</span>
          <input type="number" min="0" step="0.01" className="rounded-lg border border-neutral-300 px-3 py-2" value={price} onChange={e=>setPrice(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Cancel URL (optional)</span>
          <input className="rounded-lg border border-neutral-300 px-3 py-2" value={cancelUrl} onChange={e=>setCancelUrl(e.target.value)} />
        </label>
        <button className="btn" disabled={loading}>{loading ? 'Saving…' : 'Save & Finish'}</button>
      </form>
    </main>
  );
}


