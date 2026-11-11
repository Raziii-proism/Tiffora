import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { ErrorBanner } from '@/components/Feedback';

type EditStudentModalProps = {
  student: Student;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditStudentModal({ student, onClose, onSuccess }: EditStudentModalProps) {
  const [fullName, setFullName] = useState(student.full_name);
  const [roomNo, setRoomNo] = useState(student.room_no ?? '');
  const [phone, setPhone] = useState(student.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('students')
      .update({
        full_name: fullName.trim(),
        room_no: roomNo.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', student.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Edit Student</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label-text">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-text">Room Number</label>
            <input
              type="text"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              placeholder="e.g. 301"
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="input-field"
            />
          </div>
          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading || !fullName.trim()} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
