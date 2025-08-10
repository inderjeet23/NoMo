'use client';
import { useMemo } from 'react';
import type { Subscription } from '@/lib/data';

export default function OverviewWidgets({ items }: { items: Subscription[] }) {
  const { total, count, avg } = useMemo(() => {
    const prices = items.map((s) => s.pricePerMonthUsd || 0).filter((n) => n > 0);
    const total = prices.reduce((a, b) => a + b, 0);
    const count = prices.length;
    const avg = count ? total / count : 0;
    return { total, count, avg };
  }, [items]);

  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="card rounded-2xl p-4">
        <div className="text-sm text-neutral-400">Average consumption</div>
        <div className="mt-1 text-2xl font-extrabold">{avg.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</div>
        <div className="text-xs text-neutral-400 mt-1">Based on {count} subscriptions</div>
      </div>
    </div>
  );
}


