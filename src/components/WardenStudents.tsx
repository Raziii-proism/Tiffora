import { useState } from 'react';
import { UserPlus, Users, User, Trash2, X, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Search, DoorOpen, Phone, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Student, Hostel, Absence, MessLeave } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { EmptyState, ErrorBanner } from '@/components/Feedback';
import { StudentActionsMenu } from '@/components/StudentActionsMenu';
import { EditStudentModal } from '@/components/EditStudentModal';
import { RandomAttendanceModal } from '@/components/RandomAttendanceModal';
import { createStudentAccount, deleteStudentAccount, bulkCreateStudents, type BulkCreateStudentsResult } from '@/lib/students';
import { getDaysInMonth, getMonthName, formatCurrency, todayString, dateRange } from '@/lib/utils';

type WardenStudentsProps = {
  students: Student[];
  absences: Absence[];
  messLeaves: MessLeave[];
  hostel: Hostel;
  onDataChange: () => void;
};

export function WardenStudents({ students, absences, messLeaves, hostel, onDataChange }: WardenStudentsProps) {
  const { session } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();
  const filteredStudents = students.filter(
    (s) => !q || s.full_name.toLowerCase().includes(q) || (s.room_no || '').toLowerCase().includes(q),
  );

  async function removeStudent(student: Student): Promise<boolean> {
    if (!confirm(`Remove ${student.full_name}? This will delete their account.`)) return false;
    setRemovingId(student.id);
    setActionError(null);
    try {
      await deleteStudentAccount(student.id);
      onDataChange();
      return true;
    } catch (err) {
      setActionError((err as Error).message);
      return false;
    } finally {
      setRemovingId(null);
    }
  }

  const messLeaveDates = new Set<string>();
  for (const ml of messLeaves) {
    for (const d of dateRange(ml.start_date, ml.end_date)) {
      messLeaveDates.add(d);
    }
  }
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
  const monthMessLeaveDays = Array.from(messLeaveDates).filter((d) => d.startsWith(monthPrefix)).length;
  const daysInViewMonth = getDaysInMonth(viewYear, viewMonth);
  const isViewingCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Students</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkAdd(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Users size={15} /> Bulk Add
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <UserPlus size={16} /> Add Student
          </button>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {students.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">{getMonthName(viewMonth)} {viewYear}</p>
            {isViewingCurrentMonth && <p className="text-[11px] text-teal-600 font-medium">Current Month</p>}
          </div>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {students.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name or room..."
            className="input-field pl-9"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          icon={User}
          title="No students yet"
          description="Add your first student to get started with mess management."
        />
      ) : (
        <div className="space-y-3">
          {filteredStudents.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No students match &ldquo;{searchQuery.trim()}&rdquo;.
            </p>
          )}
          {filteredStudents.map((student) => {
            const studentAbsences = absences.filter(
              (a) => a.student_id === student.id && a.absent_date.startsWith(monthPrefix),
            );
            const presentDays = daysInViewMonth - studentAbsences.length - monthMessLeaveDays;

            return (
              <div key={student.id} className="card flex items-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  className="flex flex-1 min-w-0 items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <User className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{student.full_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {student.room_no && <span>Room {student.room_no}</span>}
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        {presentDays} present
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle size={12} className="text-rose-400" />
                        {studentAbsences.length + monthMessLeaveDays} absent
                      </span>
                    </div>
                  </div>
                </button>
                <StudentActionsMenu
                  onEdit={() => setEditingStudent(student)}
                  onRandomAttendance={() => setRandomStudent(student)}
                  onRemove={() => removeStudent(student)}
                  removing={removingId === student.id}
                />
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddStudentModal
          hostel={hostel}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            onDataChange();
          }}
        />
      )}

      {showBulkAdd && (
        <BulkAddStudentsModal
          hostel={hostel}
          onClose={() => setShowBulkAdd(false)}
          onSuccess={() => {
            setShowBulkAdd(false);
            onDataChange();
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            onDataChange();
          }}
        />
      )}

      {randomStudent && (
        <RandomAttendanceModal
          student={randomStudent}
          absences={absences.filter((a) => a.student_id === randomStudent.id)}
          messLeaveDates={messLeaveDates}
          onClose={() => setRandomStudent(null)}
          onSuccess={() => {
            setRandomStudent(null);
            onDataChange();
          }}
        />
      )}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          absences={absences.filter((a) => a.student_id === selectedStudent.id)}
          messLeaveDates={messLeaveDates}
          hostel={hostel}
          removing={removingId === selectedStudent.id}
          onClose={() => setSelectedStudent(null)}
          onRemove={async () => {
            if (await removeStudent(selectedStudent)) setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({
  hostel,
  onClose,
  onSuccess,
}: {
  hostel: Hostel;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getAccessToken } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Your session has expired. Please sign out and sign in again.");
      return;
    }

    setLoading(true);

    try {
      await createStudentAccount(
        {
          email,
          password,
          fullName,
          hostelId: hostel.id,
        },
        token
      );

      setFullName("");
      setEmail("");
      setPassword("");

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Create student error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Add Student</h3>
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
              placeholder="Student name"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password"
              className="input-field"
              required
              minLength={6}
            />
          </div>
          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creating...
              </>
            ) : (
              'Create Student Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function downloadCSV(results: BulkCreateStudentsResult[]) {
  const rows = [
    ['Name', 'Email', 'Password', 'Status'],
    ...results.map((r) => [r.name, r.email, r.password, r.status]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'student-credentials.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function BulkAddStudentsModal({
  hostel,
  onClose,
  onSuccess,
}: {
  hostel: Hostel;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [namesText, setNamesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkCreateStudentsResult[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const created = results?.filter((r) => r.status === 'created') ?? [];
  const failed = results?.filter((r) => r.status === 'failed') ?? [];
  const displayResults = showAll ? (results ?? []) : (results ?? []).slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const names = namesText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) {
      setError('Please enter at least one name.');
      return;
    }

    setLoading(true);
    try {
      const res = await bulkCreateStudents(hostel.id, names);
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Bulk Add Students</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {!results ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-slate-500">
              Paste one student name per line. Emails and a common password will be auto-generated.
            </p>
            <div>
              <label className="label-text">Student Names (one per line)</label>
              <textarea
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder={'FARIS MUHAMMED PS\nJINSHAD M\n...'}
                rows={12}
                className="input-field font-mono text-sm resize-y"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                {namesText.split('\n').filter((n) => n.trim()).length} name(s) entered
              </p>
            </div>
            {error && <ErrorBanner message={error} />}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Creating accounts…
                </>
              ) : (
                'Create All Accounts'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-2xl bg-teal-50 border border-teal-100 p-3 text-center">
                <p className="text-2xl font-bold text-teal-700">{created.length}</p>
                <p className="text-xs text-teal-600 font-medium">Created</p>
              </div>
              {failed.length > 0 && (
                <div className="flex-1 rounded-2xl bg-red-50 border border-red-100 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{failed.length}</p>
                  <p className="text-xs text-red-500 font-medium">Failed</p>
                </div>
              )}
            </div>

            {/* Download button */}
            {created.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCSV(results)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Download size={15} /> Download Credentials CSV
              </button>
            )}

            {/* Results list */}
            <div className="space-y-2">
              {displayResults.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
                    r.status === 'created'
                      ? 'bg-teal-50 border border-teal-100'
                      : 'bg-red-50 border border-red-100'
                  }`}
                >
                  {r.status === 'created' ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-600" />
                  ) : (
                    <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                    <p className="text-slate-500 truncate">{r.email}</p>
                    {r.status === 'created' && (
                      <p className="text-slate-400 text-xs">Password: {r.password}</p>
                    )}
                    {r.error && <p className="text-red-500 text-xs">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>

            {(results ?? []).length > 10 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-sm text-teal-600 font-medium hover:underline w-full text-center"
              >
                {showAll ? 'Show less' : `Show all ${results?.length} results`}
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Close
              </button>
              {created.length > 0 && (
                <button type="button" onClick={onSuccess} className="btn-primary flex-1">
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentDetailModal({
  student,
  absences,
  messLeaveDates,
  hostel,
  removing,
  onClose,
  onRemove,
}: {
  student: Student;
  absences: Absence[];
  messLeaveDates: Set<string>;
  hostel: Hostel;
  removing: boolean;
  onClose: () => void;
  onRemove: () => void;
}) {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  const monthAbsences = absences.filter((a) => {
    const d = new Date(a.absent_date);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });
  const monthMessLeaveDays = Array.from(messLeaveDates).filter((d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.getMonth() === calMonth && dt.getFullYear() === calYear;
  }).length;
  const absenceDates = new Set(monthAbsences.map((a) => a.absent_date));
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const presentDays = daysInMonth - monthAbsences.length - monthMessLeaveDays;
  const estimatedBill = presentDays * (hostel.daily_cost || 0);
  const today = todayString();

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Student Details</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
            <User className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{student.full_name}</p>
            <p className="text-xs text-slate-500">{hostel.name}</p>
          </div>
        </div>

        <div className="space-y-3">
          {student.room_no && <DetailRow icon={DoorOpen} label="Room" value={`Room ${student.room_no}`} />}
          {student.phone && <DetailRow icon={Phone} label="Phone" value={student.phone} />}
        </div>

        {/* Attendance Calendar */}
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <p className="text-sm font-bold text-slate-900">
              {getMonthName(calMonth)} {calYear}
            </p>
            <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isAbsent = absenceDates.has(dateStr) || messLeaveDates.has(dateStr);
              const isToday = dateStr === today;
              const isFuture = dateStr > today;

              return (
                <div
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-lg text-sm relative ${
                    isAbsent
                      ? 'bg-rose-50 text-rose-500'
                      : isFuture
                      ? 'bg-slate-50 text-slate-300'
                      : 'bg-emerald-50 text-emerald-700'
                  } ${isToday ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}
                >
                  {day}
                  {isAbsent && (
                    <XCircle className="absolute top-0.5 right-0.5 h-3 w-3 text-rose-400" />
                  )}
                  {!isAbsent && !isFuture && (
                    <CheckCircle2 className="absolute top-0.5 right-0.5 h-3 w-3 text-emerald-400" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-200" />
              Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-rose-50 border border-rose-200" />
              Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slate-50 border border-slate-200" />
              Future
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500 mb-2">
            {getMonthName(calMonth)} {calYear} Summary
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Days present</span>
              <span className="font-semibold text-slate-900">{presentDays} / {daysInMonth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Days absent</span>
              <span className="font-semibold text-rose-500">{monthAbsences.length + monthMessLeaveDays}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
              <span className="font-medium text-slate-700">Estimated bill</span>
              <span className="font-bold text-teal-600">{formatCurrency(estimatedBill)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRemove}
          disabled={removing}
          className="btn-secondary mt-4 w-full text-rose-600 hover:bg-rose-50 border-rose-200 disabled:opacity-50"
        >
          {removing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          {removing ? 'Removing...' : 'Remove Student'}
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{value}</span>
    </div>
  );
}
