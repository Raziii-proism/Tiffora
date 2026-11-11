import { useState } from 'react';
import { X, Loader2, Shuffle } from 'lucide-react';
import type { Student, Absence } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { ErrorBanner } from '@/components/Feedback';
import { getDaysInMonth, getMonthName } from '@/lib/utils';

type RandomAttendanceModalProps = {
  student: Student;
  absences: Absence[];
  messLeaveDates: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
};

type MonthOffset = 0 | -1;

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function RandomAttendanceModal({ student, absences, messLeaveDates, onClose, onSuccess }: RandomAttendanceModalProps) {
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState<MonthOffset>(0);
  const [countInput, setCountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthOptions: { offset: MonthOffset; date: Date }[] = [
    { offset: 0, date: new Date(now.getFullYear(), now.getMonth(), 1) },
    { offset: -1, date: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
  ];
  const target = monthOptions.find((m) => m.offset === monthOffset)!.date;
  const year = target.getFullYear();
  const month = target.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const monthLabel = `${getMonthName(month)} ${year}`;

  const absentDates = new Set(absences.map((a) => a.absent_date));
  const openDates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = monthPrefix + String(d).padStart(2, '0');
    if (!absentDates.has(dateStr) && !messLeaveDates.has(dateStr)) {
      openDates.push(dateStr);
    }
  }

  const count = Number(countInput);
  const isValid = Number.isInteger(count) && count >= 1 && count <= openDates.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);

    const rows = pickRandom(openDates, count).map((absent_date) => ({
      student_id: student.id,
      absent_date,
    }));
    const { error: insertError } = await supabase.from('absences').insert(rows);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Random Attendance</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {monthOptions.map((m) => (
            <button
              key={m.offset}
              type="button"
              onClick={() => {
                setMonthOffset(m.offset);
                setCountInput('');
                setError(null);
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                monthOffset === m.offset
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {getMonthName(m.date.getMonth())} {m.date.getFullYear()}
              {m.offset === 0 ? ' (Current)' : ''}
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Mark random days of <span className="font-semibold text-slate-900">{monthLabel}</span> as
          absent for <span className="font-semibold text-slate-900">{student.full_name}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label-text">Number of absent days</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={openDates.length}
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              placeholder={openDates.length > 0 ? `1 to ${openDates.length}` : 'No open days'}
              className="input-field"
              required
              disabled={openDates.length === 0}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              {openDates.length} open day{openDates.length !== 1 ? 's' : ''} left in {monthLabel}. Days already marked absent or on mess leave are skipped.
            </p>
          </div>
          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading || !isValid} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Marking...
              </>
            ) : (
              <>
                <Shuffle size={16} /> Mark Random Days
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
