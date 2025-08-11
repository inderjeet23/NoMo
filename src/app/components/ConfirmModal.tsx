'use client';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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

  return (
    <AnimatePresence>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            className="relative card rounded-xl p-6 w-[90%] max-w-md shadow-xl"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h2 className="text-lg font-semibold mb-3">{title ?? `Did the cancel page for ${serviceName} work?`}</h2>
            <div className="flex gap-2 justify-end">
              <button ref={firstButtonRef} onClick={onCancel} className="btn btn-secondary">{cancelLabel ?? "No, something's wrong"}</button>
              <button onClick={onConfirm} className="btn">{confirmLabel ?? 'Yes, it worked!'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
