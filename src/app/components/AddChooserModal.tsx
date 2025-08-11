'use client';
import { AnimatePresence, motion } from 'framer-motion';

export default function AddChooserModal({ open, onClose, onChoose }: { open: boolean; onClose: () => void; onChoose: (choice: 'directory'|'custom') => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            className="relative card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h2 className="text-lg font-semibold mb-3">Add Subscription</h2>
            <div className="grid gap-3">
              <button className="btn btn-lg tap pressable" onClick={()=>{ onChoose('directory'); onClose(); }}>🔎 Search Directory</button>
              <button className="btn-secondary btn-lg tap pressable" onClick={()=>{ onChoose('custom'); onClose(); }}>✚ Create Custom Subscription</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}



