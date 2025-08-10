'use client';
import { getBrandAvatarStyle } from '@/lib/brandAvatar';
import { Subscription } from '@/lib/data';

export default function SubscriptionCard({ sub, detected, onGuide, onCancel, onHide, onEditPrice, isGuiding }: {
  sub: Subscription;
  detected?: boolean;
  onGuide: () => void;
  onCancel: () => void;
  onHide: () => void;
  onEditPrice: () => void;
  isGuiding?: boolean;
}) {
  const avatar = getBrandAvatarStyle(sub.name);
  const priceClass = sub.pricePerMonthUsd <= 5 ? 'text-emerald-600 dark:text-emerald-300' : sub.pricePerMonthUsd <= 20 ? 'text-neutral-700 dark:text-neutral-200' : 'text-rose-600 dark:text-rose-300';
  return (
    <li className="grid grid-cols-[auto_1fr] sm:flex sm:items-center sm:justify-between card rounded-2xl p-5 gap-3">
      <div className="flex items-center gap-3">
        <div aria-hidden className={`w-12 h-12 rounded-2xl ${avatar.bgClass} flex items-center justify-center text-white font-extrabold`}>{avatar.initials}</div>
        <div className="font-medium flex items-center gap-2">
          <span>{sub.name}</span>
          {detected && (
            <span className="inline-flex items-center rounded-full bg-green-600/20 text-green-700 dark:text-green-300 text-xs font-semibold px-2 py-0.5 border border-green-700/40">Detected</span>
          )}
        </div>
        <div className={`text-base sm:text-sm inline-flex items-center gap-2 ${priceClass}`}>
          {sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} / {sub.cadence ?? 'month'}
          <button className="text-xs underline underline-offset-2 hover:opacity-80 tap" onClick={onEditPrice}>Edit</button>
        </div>
      </div>
      <div className="flex gap-2 items-center col-span-2 sm:col-span-1">
        <button onClick={onGuide} disabled={isGuiding} className="btn btn-secondary btn-lg sm:btn tap inline-flex items-center gap-2">
          <img src="/sparkles.svg" alt="AI" className="w-4 h-4 opacity-90" aria-hidden />
          {isGuiding ? 'Generating…' : 'Guide Me'}
        </button>
        <button onClick={onCancel} className="btn btn-danger btn-lg sm:btn tap active:animate-[wiggle_200ms_ease-in-out]">🛑 Go to Cancel Page</button>
        <button onClick={onHide} className="rounded-lg w-8 h-8 text-xs sm:text-xs border border-app hover:bg-[color:var(--surface)] tap inline-flex items-center justify-center" aria-label="Hide">✖</button>
      </div>
    </li>
  );
}


