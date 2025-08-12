'use client';
import { getBrandAvatarStyle } from '@/lib/brandAvatar';
import { Subscription } from '@/lib/data';
import { motion } from 'framer-motion';

export default function SubscriptionCard({ sub, detected, newlyDetected, onGuide, onCancel, onHide, onEditPrice, isGuiding, expanded=false, onToggle }: {
  sub: Subscription;
  detected?: boolean;
  newlyDetected?: boolean;
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
  const containerHighlight = newlyDetected ? 'ring-2 ring-green-500/40 animate-pulse' : '';
  return (
    <motion.li
      className={`glass-card rounded-2xl p-4 sm:p-5 ${containerHighlight}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {/* Header row */}
      <button type="button" onClick={onToggle} className="pressable w-full grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-4 text-left sm:cursor-default">
        <div aria-hidden className={`w-12 h-12 sm:w-12 sm:h-12 rounded-2xl avatar-depth ${avatar.bgClass} flex items-center justify-center text-white font-extrabold`}>{avatar.initials}</div>
        <div className="min-w-0">
          <div className="font-extrabold flex items-center gap-2 leading-tight">
            <span className="text-base sm:text-sm break-words line-clamp-2">{sub.name}</span>
            {/* Savings badge, shows if price available */}
            {Number.isFinite(sub.pricePerMonthUsd) && sub.pricePerMonthUsd > 0 && (
              <span className="badge-saving">Save {sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
            )}
            {detected && (
              <span className="inline-flex items-center rounded-full bg-green-600/20 text-green-700 dark:text-green-300 text-[10px] font-semibold px-2 py-2 border border-green-700/40">Detected</span>
            )}
            {newlyDetected && (
              <span className="inline-flex items-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-2 border border-amber-700/30">New</span>
            )}
          </div>
          {/* Mobile price/edit below name for breathing room */}
          <div className={`sm:hidden mt-2 text-sm inline-flex items-center gap-2 ${priceClass}`}>
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-[color:var(--surface)] text-[13px] font-semibold text-app/90">
              <span className="font-extrabold price-strong">{sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
              <span className="opacity-70">&nbsp;/ {sub.cadence ?? 'month'}</span>
            </span>
            <button className="btn-quiet h-10 px-3 text-xs tap pressable" onClick={(e)=>{ e.stopPropagation(); onEditPrice(); }}>Edit</button>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 justify-end">
          <div className={`text-sm sm:text-xs flex flex-col items-end ${priceClass} min-w-[152px]`}>
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-[color:var(--surface)] text-[13px] font-semibold text-app/90">
              <span className="font-extrabold price-strong">{sub.pricePerMonthUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
              <span className="opacity-70">&nbsp;/ {sub.cadence ?? 'month'}</span>
            </span>
            <button className="btn-quiet h-10 px-3 text-xs tap pressable mt-1" onClick={(e)=>{ e.stopPropagation(); onEditPrice(); }}>Edit</button>
          </div>
          <span aria-hidden className={`sm:hidden transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* Action row pinned at bottom for mobile discoverability */}
      <div className="grid grid-cols-2 sm:flex gap-2 items-center mt-4">
        <button onClick={onGuide} disabled={isGuiding} className="btn-glass-blue w-full sm:w-auto h-12 tap inline-flex items-center justify-center">
          {isGuiding ? 'Generating…' : 'View Guide'}
        </button>
        <button onClick={onCancel} className="btn-cancel-gradient w-full sm:w-auto h-12 tap">Cancel</button>
      </div>
    </motion.li>
  );
}



