'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type BottomSheetProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export default function BottomSheet({ open, title, onClose, children, actions }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number>(0);
  const lastY = useRef<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [dragging, setDragging] = useState<boolean>(false);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setDragging(true);
    startY.current = e.touches[0].clientY;
    lastY.current = startY.current;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const y = e.touches[0].clientY;
    const delta = Math.max(0, y - startY.current);
    lastY.current = y;
    setTranslateY(delta);
  };

  const onTouchEnd = () => {
    setDragging(false);
    const delta = Math.max(0, lastY.current - startY.current);
    if (delta > 80) {
      onClose();
      setTranslateY(0);
    } else {
      setTranslateY(0);
    }
  };

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onKeyDown]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 sm:bottom-auto sm:inset-y-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[680px] bg-app border border-app rounded-t-2xl sm:rounded-2xl shadow-xl"
        style={{ transform: `translateY(${translateY}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="px-4 py-3 border-b border-app flex items-center justify-between">
          <div className="font-semibold text-sm">{title}</div>
          <div className="flex items-center gap-2">
            {actions}
            <button className="px-2 py-1 rounded-md hover:bg-[color:var(--surface)]" aria-label="Close" onClick={onClose}>✖</button>
          </div>
        </div>
        <div className="p-4 max-h-[70vh] sm:max-h-[70vh] overflow-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}


