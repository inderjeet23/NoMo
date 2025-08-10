'use client';
import { useMemo } from 'react';
import type { Subscription } from '@/lib/data';

export default function OverviewWidgets({ items }: { items: Subscription[] }) {
  const { total, count } = useMemo(() => {
    const prices = items.map((s) => s.pricePerMonthUsd || 0).filter((n) => n > 0);
    const total = prices.reduce((a, b) => a + b, 0);
    const count = items.length;
    return { total, count };
  }, [items]);

  return (
    <section aria-label="Overview" className="overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-app px-3 py-1.5 bg-[color:var(--surface-2)]">
          <span className="text-xs text-neutral-400">Monthly total</span>
          <span className="text-sm font-extrabold">{total.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-app px-3 py-1.5 bg-[color:var(--surface-2)]">
          <span className="text-xs text-neutral-400">Active subscriptions</span>
          <span className="text-sm font-extrabold">{count.toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
}


