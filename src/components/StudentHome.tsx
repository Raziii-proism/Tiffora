// src/components/StudentHome.tsx
// Complete replacement: direct multiple-date selection.
// Test attendance submission after deployment.

import { useState } from 'react';
import {
  CalendarX,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  CalendarPlus,
  Trash2
} from 'lucide-react';

import type { Student, Hostel, Absence } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { getDaysInMonth, getMonthName } from '@/lib/utils';

type StudentHomeProps = {
  student: Student;
  hostel: Hostel;
  isAbsentToday: boolean;
  absences: Absence[];
  onNavigate: (tab: string) => void;
  onAbsenceChange: () => void;
};

// Local date conversion without UTC date shifting
function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function dateLimits(now: Date) {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const nextMonthLastDay = new Date(
    now.getFullYear(),
    now.getMonth() + 2,
    0
  ).getDate();

  const maximum = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    Math.min(now.getDate(), nextMonthLastDay)
  );

  return {
    min: localDate(tomorrow),
    max: localDate(maximum)
  };
}

function dateLabel(date: string): string {
  return new Date(date + 'T00:00:00')
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
}

export function StudentHome({
  student,
  hostel,
  isAbsentToday,
  absences,
  onNavigate,
  onAbsenceChange
}: StudentHomeProps) {

  const [showMarkAbsent, setShowMarkAbsent] =
    useState(false);

  const [selectedDates, setSelectedDates] =
    useState<string[]>([]);

  const [calendarMonth, setCalendarMonth] =
    useState(() => {
      const first = new Date(
        dateLimits(new Date()).min + 'T00:00:00'
      );

      return new Date(
        first.getFullYear(),
        first.getMonth(),
        1
      );
    });

  const [marking, setMarking] = useState(false);

  const [removingId, setRemovingId] =
    useState<string | null>(null);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const daysInMonth = getDaysInMonth(year, month);

  const monthAbsences = absences.filter((a) => {
    const d = new Date(a.absent_date + 'T00:00:00');

    return (
      d.getMonth() === month &&
      d.getFullYear() === year
    );
  });

  const presentDays =
    daysInMonth - monthAbsences.length;

  const {
    min: tomorrowStr,
    max: maxDateStr
  } = dateLimits(now);

  const calendarYear = calendarMonth.getFullYear();

  const calendarIndex = calendarMonth.getMonth();

  const calendarKey =
    localDate(calendarMonth).slice(0, 7);

  const firstWeekday = new Date(
    calendarYear,
    calendarIndex,
    1
  ).getDay();

  const calendarDays = getDaysInMonth(
    calendarYear,
    calendarIndex
  );

  const upcomingAbsences = absences
    .filter((a) => a.absent_date >= localDate(now))
    .sort((a, b) =>
      a.absent_date.localeCompare(b.absent_date)
    );

  const cutoffLabel = (() => {
    const [h, m] = (
      hostel.absence_cutoff_time || '12:10'
    ).split(':').map(Number);

    const period = h >= 12 ? 'PM' : 'AM';

    const h12 =
      h === 0 ? 12 : h > 12 ? h - 12 : h;

    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  })();

  // Validate attendance date
  function canMarkAbsentForDate(dateStr: string): {
    allowed: boolean;
    reason: string;
  } {
    const currentTime = new Date();
    const limits = dateLimits(currentTime);

    const target = new Date(
      dateStr + 'T00:00:00'
    );

    if (
      !dateStr ||
      !Number.isFinite(target.getTime()) ||
      localDate(target) !== dateStr
    ) {
      return {
        allowed: false,
        reason: 'Please select a valid date.'
      };
    }

    if (dateStr < limits.min) {
      return {
        allowed: false,
        reason: 'You can only mark absence for future dates starting tomorrow.'
      };
    }

    if (dateStr > limits.max) {
      return {
        allowed: false,
        reason: 'You can only mark absence up to 1 month in advance.'
      };
    }

    const dayBefore = new Date(target);

    dayBefore.setDate(
      dayBefore.getDate() - 1
    );

    const [ch, cm] = (
      hostel.absence_cutoff_time || '12:10'
    ).split(':').map(Number);

    const cutoff = new Date(dayBefore);

    cutoff.setHours(ch, cm, 0, 0);

    if (currentTime > cutoff) {
      const cutoffDateLabel =
        dayBefore.toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric'
        });

      return {
        allowed: false,
        reason: `The cutoff for ${dateLabel(dateStr)} was ${cutoffLabel} on ${cutoffDateLabel}. It is too late to mark this date.`
      };
    }

    return {
      allowed: true,
      reason: ''
    };
  }

  function validateDate(date: string): string | null {
    const check = canMarkAbsentForDate(date);

    if (!check.allowed) {
      return check.reason;
    }

    if (
      absences.some((a) => a.absent_date === date)
    ) {
      return 'You are already marked absent for this date.';
    }

    return null;
  }

  // Move between calendar months
  function moveCalendar(offset: number) {
    if (marking) return;

    const limits = dateLimits(new Date());

    setCalendarMonth((previous) => {
      const next = new Date(
        previous.getFullYear(),
        previous.getMonth() + offset,
        1
      );

      const key = localDate(next).slice(0, 7);

      if (
        key < limits.min.slice(0, 7) ||
        key > limits.max.slice(0, 7)
      ) {
        return previous;
      }

      return next;
    });
  }

  // Select or deselect multiple dates directly
  function toggleDate(date: string) {
    if (marking) return;

    setMessage(null);

    if (selectedDates.includes(date)) {
      setSelectedDates((previous) =>
        previous.filter((d) => d !== date)
      );

      return;
    }

    const error = validateDate(date);

    if (error) {
      setMessage({
        type: 'error',
        text: error
      });

      return;
    }

    setSelectedDates((previous) =>
      [...new Set([...previous, date])].sort()
    );
  }

  // Confirm all selected dates together
  async function handleMarkAbsent() {
    if (marking || removingId !== null) return;

    const dates = [...new Set(selectedDates)].sort();

    if (dates.length === 0) {
      setMessage({
        type: 'error',
        text: 'Please select at least one date.'
      });

      return;
    }

    // Revalidate every date before submission
    for (const date of dates) {
      const error = validateDate(date);

      if (error) {
        setMessage({
          type: 'error',
          text: `${dateLabel(date)}: ${error}`
        });

        return;
      }
    }

    setMarking(true);
    setMessage(null);

    try {
      const records = dates.map((date) => ({
        student_id: student.id,
        absent_date: date
      }));

      const { error } = await supabase
        .from('absences')
        .insert(records);

      if (error) {
        setMessage({
          type: 'error',
          text: error.code === '23505'
            ? 'One of the selected dates is already marked absent. Refresh and check your upcoming absences.'
            : error.message
        });

        if (error.code === '23505') {
          onAbsenceChange();
        }

        return;
      }

      setMessage({
        type: 'success',
        text: `Successfully marked absent for ${dates.length} ${
          dates.length === 1 ? 'day' : 'days'
        }.`
      });

      setSelectedDates([]);
      setShowMarkAbsent(false);

      onAbsenceChange();

    } catch {
      setMessage({
        type: 'error',
        text: 'Unable to confirm absences. Refresh and check your upcoming absences before retrying.'
      });

    } finally {
      setMarking(false);
    }
  }

  // Check whether an absence can be removed
  function canRemoveAbsence(absentDate: string): boolean {
    const target = new Date(
      absentDate + 'T00:00:00'
    );

    const dayBefore = new Date(target);

    dayBefore.setDate(
      dayBefore.getDate() - 1
    );

    const [ch, cm] = (
      hostel.absence_cutoff_time || '12:10'
    ).split(':').map(Number);

    const cutoff = new Date(dayBefore);

    cutoff.setHours(ch, cm, 0, 0);

    return new Date() <= cutoff;
  }

  // Remove an existing absence
  async function handleRemoveAbsence(absence: Absence) {
    if (marking || removingId !== null) return;

    if (!canRemoveAbsence(absence.absent_date)) {
      setMessage({
        type: 'error',
        text: 'The cutoff for this date has passed. You can no longer change your attendance.'
      });

      return;
    }

    setRemovingId(absence.id);

    try {
      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', absence.id)
        .eq('student_id', student.id);

      if (error) {
        setMessage({
          type: 'error',
          text: error.message
        });

      } else {
        setMessage({
          type: 'success',
          text: `Removed absence for ${dateLabel(absence.absent_date)}. You will be marked present.`
        });

        onAbsenceChange();
      }

    } catch {
      setMessage({
        type: 'error',
        text: 'Unable to remove absence. Please try again.'
      });

    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Welcome card */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20">

        <p className="text-sm text-teal-100">
          Welcome back,
        </p>

        <h2 className="text-xl font-bold">
          {student.full_name}
        </h2>

        <div className="mt-3 flex items-center gap-4 text-xs text-teal-100">

          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            {hostel?.name}
          </span>

          {student.room_no && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-200" />
              Room {student.room_no}
            </span>
          )}

        </div>

      </div>

      {/* Today's status */}
      <div className="card">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-xs font-medium text-slate-500">
              Today's Status
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">

              {now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}

            </p>

          </div>

          {isAbsentToday ? (

            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2">

              <XCircle className="h-5 w-5 text-rose-500" />

              <span className="text-sm font-semibold text-rose-600">
                Absent
              </span>

            </div>

          ) : (

            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">

              <CheckCircle2 className="h-5 w-5 text-emerald-500" />

              <span className="text-sm font-semibold text-emerald-600">
                Present
              </span>

            </div>

          )}

        </div>

      </div>

      {/* Mark Absent */}
      <div className="card">

        <div className="flex items-start gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">

            <CalendarX className="h-6 w-6 text-amber-500" />

          </div>

          <div className="flex-1">

            <p className="text-sm font-bold text-slate-900">
              Mark Absent
            </p>

            <p className="mt-0.5 text-xs text-slate-500">

              Select multiple dates up to 1 month ahead.
              Each date must be marked before
              {' '}{cutoffLabel} on the previous day.

            </p>

          </div>

        </div>

        {!showMarkAbsent ? (

          <button
            type="button"
            onClick={() => {

              const first = new Date(
                dateLimits(new Date()).min + 'T00:00:00'
              );

              setCalendarMonth(
                new Date(
                  first.getFullYear(),
                  first.getMonth(),
                  1
                )
              );

              setSelectedDates([]);
              setShowMarkAbsent(true);
              setMessage(null);

            }}
            className="btn-danger mt-3 w-full"
          >

            <span className="flex items-center justify-center gap-2">

              <CalendarPlus size={18} />

              Mark Absent for Dates

            </span>

          </button>

        ) : (

          <div className="mt-3 space-y-3 animate-scale-in">

            {/* Minimal white calendar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">

              {/* Month navigation */}
              <div className="mb-4 flex items-center justify-between">

                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => moveCalendar(-1)}
                  disabled={
                    marking ||
                    calendarKey <= tomorrowStr.slice(0, 7)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                >

                  <ChevronLeft size={20} />

                </button>

                <p className="text-sm font-semibold text-slate-900">

                  {getMonthName(calendarIndex)} {calendarYear}

                </p>

                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => moveCalendar(1)}
                  disabled={
                    marking ||
                    calendarKey >= maxDateStr.slice(0, 7)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                >

                  <ChevronRight size={20} />

                </button>

              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 gap-1">

                {[
                  'Su',
                  'Mo',
                  'Tu',
                  'We',
                  'Th',
                  'Fr',
                  'Sa'
                ].map((day) => (

                  <div
                    key={day}
                    className="pb-3 text-center text-xs font-medium text-slate-500"
                  >

                    {day}

                  </div>

                ))}

                {/* Empty cells before first date */}
                {Array.from(
                  { length: firstWeekday },
                  (_, i) => (

                    <div
                      key={`blank-${i}`}
                      aria-hidden="true"
                    />

                  )
                )}

                {/* Calendar dates */}
                {Array.from(
                  { length: calendarDays },
                  (_, i) => {

                    const day = i + 1;

                    const date = localDate(
                      new Date(
                        calendarYear,
                        calendarIndex,
                        day
                      )
                    );

                    const selected =
                      selectedDates.includes(date);

                    const booked =
                      absences.some(
                        (a) => a.absent_date === date
                      );

                    const error = validateDate(date);

                    return (

                      <button
                        key={date}
                        type="button"
                        aria-label={`${dateLabel(date)}, ${calendarYear}${error ? `, ${error}` : ''}`}
                        aria-pressed={selected}
                        title={error || dateLabel(date)}
                        disabled={
                          marking ||
                          (!!error && !selected)
                        }
                        onClick={() => toggleDate(date)}
                        className={`mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          selected
                            ? 'bg-teal-600 text-white'
                            : booked
                              ? 'text-slate-400 line-through'
                              : error
                                ? 'text-slate-300'
                                : 'bg-white text-slate-900 hover:bg-slate-100'
                        }`}
                      >

                        {day}

                      </button>

                    );
                  }
                )}

              </div>

              <p className="mt-4 text-center text-xs text-slate-500">

                Tap multiple dates to select them.
                Tap again to deselect.

              </p>

              <p className="mt-1 text-center text-[11px] text-slate-400">

                Grey dates are unavailable.
                Crossed-out dates are already marked absent.

              </p>

            </div>

            {/* Selected dates */}
            <div className="flex items-center justify-between">

              <p className="text-sm font-semibold text-slate-900">

                Selected Dates ({selectedDates.length})

              </p>

              <button
                type="button"
                disabled={
                  marking ||
                  selectedDates.length === 0
                }
                onClick={() => {
                  setSelectedDates([]);
                  setMessage(null);
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40"
              >

                Clear all

              </button>

            </div>

            {selectedDates.length > 0 && (

              <div className="flex flex-wrap gap-2">

                {selectedDates.map((date) => (

                  <button
                    key={date}
                    type="button"
                    disabled={marking}
                    aria-label={`Remove ${dateLabel(date)}`}
                    onClick={() => toggleDate(date)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
                  >

                    {dateLabel(date)}

                    <XCircle
                      size={15}
                      className="text-slate-400"
                    />

                  </button>

                ))}

              </div>

            )}

            {/* Confirmation summary */}
            {selectedDates.length > 0 && (

              <div className="rounded-xl bg-slate-50 px-4 py-3">

                <p className="text-sm text-slate-600">

                  You are about to mark yourself{' '}

                  <span className="font-semibold text-rose-600">
                    absent
                  </span>

                  {' '}for{' '}

                  <span className="font-semibold text-slate-900">

                    {selectedDates.length}{' '}

                    {selectedDates.length === 1
                      ? 'day'
                      : 'days'}

                  </span>.

                  These dates will count as absences
                  for mess billing.

                </p>

              </div>

            )}

            {/* Cancel and confirm */}
            <div className="flex gap-2">

              <button
                type="button"
                disabled={marking}
                onClick={() => {
                  setShowMarkAbsent(false);
                  setSelectedDates([]);
                  setMessage(null);
                }}
                className="btn-secondary flex-1"
              >

                Cancel

              </button>

              <button
                type="button"
                onClick={handleMarkAbsent}
                disabled={
                  marking ||
                  removingId !== null ||
                  selectedDates.length === 0
                }
                className="btn-danger flex-1 disabled:opacity-50"
              >

                {marking
                  ? 'Marking...'
                  : selectedDates.length > 1
                    ? `Confirm ${selectedDates.length} Absences`
                    : 'Confirm Absence'}

              </button>

            </div>

          </div>

        )}

        {/* Success and error messages */}
        {message && (

          <div
            className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}
          >

            {message.text}

          </div>

        )}

      </div>

      {/* Upcoming absences */}
      {upcomingAbsences.length > 0 && (

        <div className="card">

          <p className="text-sm font-bold text-slate-900 mb-3">

            Upcoming Absences

          </p>

          <div className="space-y-2">

            {upcomingAbsences.map((a) => (

              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5"
              >

                <div className="flex items-center gap-2">

                  <XCircle className="h-4 w-4 text-rose-400" />

                  <span className="text-sm font-medium text-rose-700">

                    {dateLabel(a.absent_date)}

                  </span>

                </div>

                {canRemoveAbsence(a.absent_date) ? (

                  <button
                    type="button"
                    onClick={() => handleRemoveAbsence(a)}
                    disabled={
                      marking ||
                      removingId !== null
                    }
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                  >

                    <Trash2 size={14} />

                    {removingId === a.id
                      ? 'Removing...'
                      : 'Remove'}

                  </button>

                ) : (

                  <span className="text-xs font-medium text-slate-400">

                    Locked

                  </span>

                )}

              </div>

            ))}

          </div>

          <p className="mt-2 text-xs text-slate-400">

            You can remove an upcoming absence before
            its cutoff to be marked present again.

          </p>

        </div>

      )}

      {/* Pay mess fee */}
      <button
        type="button"
        onClick={() => onNavigate('fees')}
        className="card w-full text-left active:scale-[0.99] transition-transform"
      >

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">

            <Receipt className="h-6 w-6 text-teal-600" />

          </div>

          <div className="flex-1">

            <p className="text-sm font-bold text-slate-900">

              Pay Mess Fee

            </p>

            <p className="mt-0.5 text-xs text-slate-500">

              {presentDays} days present this month — tap to view your bill

            </p>

          </div>

          <ChevronRight className="h-5 w-5 text-slate-300" />

        </div>

      </button>

      {/* Quick statistics */}
      <div className="grid grid-cols-2 gap-3">

        <div className="card">

          <div className="flex items-center gap-2">

            <TrendingUp className="h-4 w-4 text-emerald-500" />

            <p className="text-xs font-medium text-slate-500">

              Days Present

            </p>

          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">

            {presentDays}

            <span className="text-sm font-normal text-slate-400">

              {' '}/ {daysInMonth}

            </span>

          </p>

          <p className="text-xs text-slate-400">

            {getMonthName(month)} {year}

          </p>

        </div>

        <div className="card">

          <div className="flex items-center gap-2">

            <Clock className="h-4 w-4 text-amber-500" />

            <p className="text-xs font-medium text-slate-500">

              Days Absent

            </p>

          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">

            {monthAbsences.length}

            <span className="text-sm font-normal text-slate-400">

              {' '}/ {daysInMonth}

            </span>

          </p>

          <p className="text-xs text-slate-400">

            {getMonthName(month)} {year}

          </p>

        </div>

      </div>

    </div>
  );
}