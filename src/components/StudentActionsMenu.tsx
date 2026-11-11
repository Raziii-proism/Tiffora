import { useEffect, useState } from 'react';
import { MoreVertical, Pencil, Shuffle, Trash2 } from 'lucide-react';

type StudentActionsMenuProps = {
  onEdit: () => void;
  onRandomAttendance: () => void;
  onRemove: () => void;
  removing: boolean;
};

export function StudentActionsMenu({ onEdit, onRandomAttendance, onRemove, removing }: StudentActionsMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Student options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
      >
        <MoreVertical size={18} className="text-slate-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-100 bg-white p-1 shadow-lg animate-fade-in"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Pencil size={14} className="text-slate-500" /> Edit details
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRandomAttendance();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Shuffle size={14} className="text-slate-500" /> Random attendance
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={removing}
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} /> Remove student
            </button>
          </div>
        </>
      )}
    </div>
  );
}
