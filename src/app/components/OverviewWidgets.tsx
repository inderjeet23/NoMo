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
    <section aria-label="Overview" className="px-1">
      <p className="text-sm text-neutral-300">
        <span className="font-extrabold text-app">{total.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
        {" "}/ month across {" "}
        <span className="font-extrabold text-app">{count.toLocaleString()}</span>
        {" "}subscriptions
      </p>
    </section>
  );
}


