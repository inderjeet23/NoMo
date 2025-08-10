'use client';
import { useEffect, useRef } from 'react';

type ConfirmModalProps = {
  open: boolean;
  serviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ConfirmModal({ open, serviceName, onConfirm, onCancel, title, confirmLabel, cancelLabel }: ConfirmModalProps) {
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative card rounded-xl p-6 w-[90%] max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-3">{title ?? `Did the cancel page for ${serviceName} work?`}</h2>
        <div className="flex gap-2 justify-end">
          <button ref={firstButtonRef} onClick={onCancel} className="btn btn-secondary">{cancelLabel ?? "No, something's wrong"}</button>
          <button onClick={onConfirm} className="btn">{confirmLabel ?? 'Yes, it worked!'}</button>
        </div>
      </div>
    </div>
  );
}
