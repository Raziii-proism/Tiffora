import { useState, useEffect } from 'react';
import { X, Copy, Loader2, ArrowRight } from 'lucide-react';
import type { ExpenseItem, ExpenseItemType } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getMonthName } from '@/lib/utils';
import { ErrorBanner } from '@/components/Feedback';

type CopyItemState = {
  id: string;
  label: string;
  type: ExpenseItemType;
  amount: string;
  selected: boolean;
};

type CopyPreviousExpensesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  hostelId: string;
  targetMonthStr: string;
  previousMonthStr: string;
  previousMonthItems: ExpenseItem[];
  onSwitchToPreviousMonth?: () => void;
};

const EXPENSE_TYPES: { value: ExpenseItemType; label: string; color: string }[] = [
  { value: 'common_bill', label: 'Common Bill', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'mess_bill', label: 'Mess Bill', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'allowance', label: 'Allowance', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'room_rent', label: 'Room Rent', color: 'bg-violet-50 text-violet-600 border-violet-200' },
];

function typeLabel(type: ExpenseItemType): string {
  return EXPENSE_TYPES.find((t) => t.value === type)?.label || type;
}

function typeColor(type: ExpenseItemType): string {
  return EXPENSE_TYPES.find((t) => t.value === type)?.color || 'bg-slate-50 text-slate-600 border-slate-200';
}

function getMonthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return `${getMonthName(m - 1)} ${y}`;
}

export function CopyPreviousExpensesModal({
  isOpen,
  onClose,
  onSuccess,
  hostelId,
  targetMonthStr,
  previousMonthStr,
  previousMonthItems,
  onSwitchToPreviousMonth,
}: CopyPreviousExpensesModalProps) {
  const [items, setItems] = useState<CopyItemState[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItems(
        previousMonthItems.map((item) => ({
          id: item.id,
          label: item.label,
          type: item.type,
          amount: String(item.amount),
          selected: true,
        }))
      );
      setError(null);
    }
  }, [isOpen, previousMonthItems]);

  if (!isOpen) return null;

  const sourceLabel = getMonthLabel(previousMonthStr);
  const targetLabel = getMonthLabel(targetMonthStr);

  if (previousMonthItems.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Add Previous Month Items</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Copy size={24} />
            </div>
            <p className="text-base font-semibold text-slate-800">No items found in {sourceLabel}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              There are no expense items recorded for {sourceLabel}. You can switch to {sourceLabel} to add expenses directly.
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Close
            </button>
            {onSwitchToPreviousMonth && (
              <button
                type="button"
                onClick={() => {
                  onSwitchToPreviousMonth();
                  onClose();
                }}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                <span>Go to {sourceLabel}</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const allSelected = items.length > 0 && items.every((it) => it.selected);
  const selectedItems = items.filter((it) => it.selected);
  const selectedCount = selectedItems.length;
  const selectedTotal = selectedItems.reduce((sum, it) => {
    const val = parseFloat(it.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  }

  function updateAmount(id: string, amount: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, amount } : it))
    );
    setError(null);
  }

  function toggleSelectAll() {
    setItems((prev) => prev.map((it) => ({ ...it, selected: !allSelected })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCount === 0) {
      setError('Please select at least one expense item to add.');
      return;
    }

    for (const item of selectedItems) {
      const amt = parseFloat(item.amount);
      if (isNaN(amt) || amt <= 0) {
        setError(`Please enter a valid amount for "${item.label}".`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    const rows = selectedItems.map((item) => ({
      hostel_id: hostelId,
      label: item.label.trim(),
      type: item.type,
      amount: parseFloat(item.amount),
      month: targetMonthStr,
    }));

    const { error: insertErr } = await supabase.from('expense_items').insert(rows);
    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSuccess(rows.length);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-2 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Add Previous Month Items</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Copying from <span className="font-semibold text-slate-700">{sourceLabel}</span> into{' '}
              <span className="font-semibold text-teal-700">{targetLabel}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Action bar (Select all) */}
        <div className="flex items-center justify-between py-2 text-xs text-slate-500">
          <span>{selectedCount} of {items.length} items selected</span>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="font-medium text-teal-600 hover:text-teal-700"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Scrollable Items List */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 transition-all ${
                  item.selected
                    ? 'border-teal-200 bg-teal-50/30 ring-1 ring-teal-400/40'
                    : 'border-slate-200 bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${typeColor(
                            item.type
                          )}`}
                        >
                          {typeLabel(item.type)}
                        </span>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Editable Amount */}
                  <div className="w-28 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={item.amount}
                        disabled={!item.selected}
                        onChange={(e) => updateAmount(item.id, e.target.value)}
                        placeholder="Amount"
                        className="input-field pl-6 py-1.5 text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-2">
              <ErrorBanner message={error} />
            </div>
          )}

          {/* Footer Summary & Buttons */}
          <div className="pt-3 border-t border-slate-100 mt-2 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Total to Add:</span>
              <span className="font-bold text-slate-900">{formatCurrency(selectedTotal)}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || selectedCount === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Add {selectedCount} Item{selectedCount === 1 ? '' : 's'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
