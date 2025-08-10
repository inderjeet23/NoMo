'use client';
import { getBrandAvatarStyle } from '@/lib/brandAvatar';
import { Subscription } from '@/lib/data';

export default function SubscriptionCard({ sub, detected, onGuide, onCancel, onHide, onEditPrice, isGuiding, expanded=false, onToggle }: {
  sub: Subscription;
  detected?: boolean;
  onGuide: () => void;
  onCancel: () => void;
  onHide: () => void;
  onEditPrice: () => void;
  isGuiding?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const avatar = getBrandAvatarStyle(sub.name);
  const priceClass = sub.pricePerMonthUsd <= 5 ? 'text-emerald-600 dark:text-emerald-300' : sub.pricePerMonthUsd <= 20 ? 'text-neutral-700 dark:text-neutral-200' : 'text-rose-600 dark:text-rose-300';
  return (
    <li className="card rounded-2xl p-3 sm:p-4">
      {/* Header row */}
      <button type="button" onClick={onToggle} className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 text-left sm:cursor-default">
        <div aria-hidden className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${avatar.bgClass} flex items-center justify-center text-white font-extrabold`}>{avatar.initials}</div>
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-2 leading-tight">
            <span className="truncate text-base sm:text-sm">{sub.name}</span>
            {detected && (
              <span className="inline-flex items-center rounded-full bg-green-600/20 text-green-700 dark:text-green-300 text-[10px] font-semibold px-1.5 py-0.5 border border-green-700/40">Detected</span>
            )}
          </div>
          <div className={`text-sm sm:text-xs inline-flex items-center gap-2 ${priceClass}`}>
            {sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} / {sub.cadence ?? 'month'}
            <button className="text-xs underline underline-offset-2 hover:opacity-80 tap" onClick={(e)=>{ e.stopPropagation(); onEditPrice(); }}>Edit</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden className={`sm:hidden transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* Actions row: collapsed on mobile, always visible on desktop */}
      <div className={`${expanded ? 'grid' : 'hidden'} sm:flex gap-2 items-center mt-3`}>
        <button onClick={onGuide} disabled={isGuiding} className="btn btn-secondary w-full sm:w-auto h-11 tap inline-flex items-center justify-center gap-2">
          <img src="/sparkles.svg" alt="AI" className="w-4 h-4 opacity-90" aria-hidden />
          {isGuiding ? 'Generating…' : 'Guide Me'}
        </button>
        <button onClick={onCancel} className="btn btn-danger w-full sm:w-auto h-11 tap active:animate-[wiggle_200ms_ease-in-out]">🛑 Open cancel page</button>
        <button onClick={onHide} className="btn-quiet h-11 tap inline-flex items-center justify-center">✖ Remove</button>
      </div>
    </li>
  );
}


