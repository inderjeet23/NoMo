'use client';

export default function AddChooserModal({ open, onClose, onChoose }: { open: boolean; onClose: () => void; onChoose: (choice: 'directory'|'custom') => void }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5">
        <h2 className="text-lg font-semibold mb-3">Add Subscription</h2>
        <div className="grid gap-3">
          <button className="btn btn-lg tap" onClick={()=>{ onChoose('directory'); onClose(); }}>🔎 Search Directory</button>
          <button className="btn-secondary btn-lg tap" onClick={()=>{ onChoose('custom'); onClose(); }}>✚ Create Custom Subscription</button>
        </div>
      </div>
    </div>
  );
}


