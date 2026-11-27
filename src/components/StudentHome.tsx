
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

import {
  getDaysInMonth,
  getMonthName,
  todayString,
  formatDate
} from '@/lib/utils';

type StudentHomeProps = {
  student: Student;
  hostel: Hostel;
  isAbsentToday: boolean;
  absences: Absence[];
  onNavigate: (tab: string) => void;
  onAbsenceChange: () => void;
};

export function StudentHome({
  student,
  hostel,
  isAbsentToday,
  absences,
  onNavigate,
  onAbsenceChange
}: StudentHomeProps) {

  const [showMarkAbsent, setShowMarkAbsent] = useState(false);

  const [selectedDates, setSelectedDates] =
    useState<string[]>([]);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);

    return new Date(
      today.getFullYear(),
      today.getMonth(),
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

  const presentDays = daysInMonth - monthAbsences.length;

  // Allowed date range
  function getDateLimits(reference: Date) {
    const tomorrow = new Date(reference);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const lastDay = new Date(
      reference.getFullYear(),
      reference.getMonth() + 2,
      0
    ).getDate();

    const maximum = new Date(
      reference.getFullYear(),
      reference.getMonth() + 1,
      Math.min(reference.getDate(), lastDay)
    );

    return {
      min: formatDate(tomorrow),
      max: formatDate(maximum)
    };
  }

  const {
    min: tomorrowStr,
    max: maxDateStr
  } = getDateLimits(now);

  const calendarYear = calendarMonth.getFullYear();

  const calendarMonthIndex = calendarMonth.getMonth();

  const firstWeekday = new Date(
    calendarYear,
    calendarMonthIndex,
    1
  ).getDay();

  const calendarDays = getDaysInMonth(
    calendarYear,
    calendarMonthIndex
  );

  const calendarMonthKey =
    formatDate(calendarMonth).slice(0, 7);

  const alreadyAbsent = new Set(
    absences.map((a) => a.absent_date)
  );

  const upcomingAbsences = absences
    .filter((a) => a.absent_date >= todayString())
    .sort((a, b) =>
      a.absent_date.localeCompare(b.absent_date)
    );

  // Navigate calendar months
  function moveCalendar(offset: number) {
    setCalendarMonth((previous) => {
      const next = new Date(
        previous.getFullYear(),
        previous.getMonth() + offset,
        1
      );

      const key = formatDate(next).slice(0, 7);

      if (
        key < tomorrowStr.slice(0, 7) ||
        key > maxDateStr.slice(0, 7)
      ) {
        return previous;
      }

      return next;
    });
  }

  // Check attendance deadline
  function canMarkAbsentForDate(dateStr: string): {
    allowed: boolean;
    reason: string;
  } {
    const currentTime = new Date();

    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);

    const target = new Date(dateStr + 'T00:00:00');
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / 86400000
    );

    if (diffDays < 1) {
      return {
        allowed: false,
        reason: 'You can only mark absence for future dates.'
      };
    }

    if (
      diffDays > 31 ||
      dateStr > getDateLimits(currentTime).max
    ) {
      return {
        allowed: false,
        reason: 'You can only mark absence up to 1 month in advance.'
      };
    }

    const dayBefore = new Date(target);
    dayBefore.setDate(dayBefore.getDate() - 1);

    const [ch, cm] = (
      hostel.absence_cutoff_time || '12:10'
    ).split(':').map(Number);

    const cutoff = new Date(dayBefore);
    cutoff.setHours(ch, cm, 0, 0);

    if (currentTime > cutoff) {
      const cutoffDateLabel =
        dayBefore.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });

      const cutoffTimeLabel =
        cutoff.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

      return {
        allowed: false,
        reason: `The cutoff was ${cutoffTimeLabel} on ${cutoffDateLabel}. It is too late to mark this date.`
      };
    }

    return {
      allowed: true,
      reason: ''
    };
  }

  // Select or deselect a date
  function toggleDate(date: string) {
    if (marking) return;

    setMessage(null);

    if (selectedDates.includes(date)) {
      setSelectedDates((previous) =>
        previous.filter((d) => d !== date)
      );

      return;
    }

    const check = canMarkAbsentForDate(date);

    if (!check.allowed || alreadyAbsent.has(date)) {
      setMessage({
        type: 'error',
        text: alreadyAbsent.has(date)
          ? 'You are already marked absent for this date.'
          : check.reason
      });

      return;
    }

    setSelectedDates((previous) =>
      [...new Set([...previous, date])].sort()
    );
  }

  // Save all selected absences
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

    // Validate every selected date again
    for (const date of dates) {
      const check = canMarkAbsentForDate(date);

      if (!check.allowed) {
        setMessage({
          type: 'error',
          text: `${date}: ${check.reason}`
        });

        return;
      }

      if (alreadyAbsent.has(date)) {
        setMessage({
          type: 'error',
          text: `${date} is already marked absent.`
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
            ? 'A selected date is already marked absent. Refresh and select again.'
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

    target.setHours(0, 0, 0, 0);

    const dayBefore = new Date(target);
    dayBefore.setDate(dayBefore.getDate() - 1);

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
        const dateLabel = new Date(
          absence.absent_date + 'T00:00:00'
        ).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });

        setMessage({
          type: 'success',
          text: `Removed absence for ${dateLabel}. You will be marked present.`
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

  const cutoffLabel = (() => {
    const [h, m] = (
      hostel.absence_cutoff_time || '12:10'
    ).split(':').map(Number);

    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  })();

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

      {/* Multiple date absence marking */}
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
              Each date must be marked before {cutoffLabel}
              {' '}on the previous day.
            </p>

          </div>
        </div>

        {!showMarkAbsent ? (

          <button
            type="button"
            onClick={() => {
              const tomorrow = new Date(
                getDateLimits(new Date()).min + 'T00:00:00'
              );

              setCalendarMonth(
                new Date(
                  tomorrow.getFullYear(),
                  tomorrow.getMonth(),
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
              Mark Absent for Multiple Dates
            </span>

          </button>

        ) : (

          <div className="mt-3 space-y-3 animate-scale-in">

            {/* Calendar */}
            <div className="rounded-xl border border-slate-200 p-3">

              <div className="mb-3 flex items-center justify-between">

                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => moveCalendar(-1)}
                  disabled={
                    marking ||
                    calendarMonthKey <= tomorrowStr.slice(0, 7)
                  }
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft size={20} />
                </button>

                <p className="text-sm font-bold text-slate-900">
                  {getMonthName(calendarMonthIndex)} {calendarYear}
                </p>

                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => moveCalendar(1)}
                  disabled={
                    marking ||
                    calendarMonthKey >= maxDateStr.slice(0, 7)
                  }
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronRight size={20} />
                </button>

              </div>

              {/* Calendar weekdays */}
              <div className="grid grid-cols-7 gap-1">

                {[
                  'Sun',
                  'Mon',
                  'Tue',
                  'Wed',
                  'Thu',
                  'Fri',
                  'Sat'
                ].map((day) => (

                  <div
                    key={day}
                    className="pb-1 text-center text-[10px] font-medium text-slate-500"
                  >
                    {day}
                  </div>

                ))}

                {Array.from(
                  { length: firstWeekday },
                  (_, i) => (
                    <div key={`empty-${i}`} aria-hidden="true" />
                  )
                )}

                {/* Calendar dates */}
                {Array.from(
                  { length: calendarDays },
                  (_, i) => {

                    const day = i + 1;

                    const date = formatDate(
                      new Date(
                        calendarYear,
                        calendarMonthIndex,
                        day
                      )
                    );

                    const selected =
                      selectedDates.includes(date);

                    const booked =
                      alreadyAbsent.has(date);

                    const check =
                      canMarkAbsentForDate(date);

                    const unavailable =
                      date < tomorrowStr ||
                      date > maxDateStr ||
                      booked ||
                      !check.allowed;

                    const label = new Date(
                      date + 'T00:00:00'
                    ).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (

                      <button
                        key={date}
                        type="button"
                        aria-label={`${label}${
                          booked
                            ? ', already absent'
                            : unavailable
                              ? ', unavailable'
                              : ''
                        }`}
                        aria-pressed={selected}
                        title={
                          booked
                            ? 'Already marked absent'
                            : unavailable
                              ? check.reason || 'Unavailable'
                              : label
                        }
                        disabled={
                          marking ||
                          (unavailable && !selected)
                        }
                        onClick={() => toggleDate(date)}
                        className={`aspect-square rounded-lg text-sm font-semibold transition-all ${
                          selected
                            ? 'bg-teal-600 text-white shadow-sm'
                            : booked
                              ? 'bg-rose-100 text-rose-600 line-through'
                              : unavailable
                                ? 'bg-slate-50 text-slate-300'
                                : 'bg-slate-100 text-slate-800 hover:bg-teal-100'
                        }`}
                      >
                        {day}
                      </button>

                    );
                  }
                )}

              </div>

              {/* Calendar legend */}
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">

                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-teal-600" />
                  Selected
                </span>

                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-rose-100" />
                  Already absent
                </span>

                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-slate-100 border border-slate-200" />
                  Unavailable
                </span>

              </div>

            </div>

            {/* Selected dates */}
            <div className="flex items-center justify-between">

              <p className="text-sm font-semibold text-slate-900">
                Selected Dates ({selectedDates.length})
              </p>

              <button
                type="button"
                disabled={marking || selectedDates.length === 0}
                onClick={() => {
                  setSelectedDates([]);
                  setMessage(null);
                }}
                className="text-xs font-medium text-teal-700 disabled:opacity-40"
              >
                Clear All
              </button>

            </div>

            {selectedDates.length > 0 ? (

              <>

                <div className="flex flex-wrap gap-2">

                  {selectedDates.map((date) => (

                    <button
                      key={date}
                      type="button"
                      disabled={marking}
                      onClick={() => toggleDate(date)}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 border border-teal-100"
                    >

                      {new Date(
                        date + 'T00:00:00'
                      ).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short'
                      })}

                      <XCircle size={14} aria-hidden="true" />

                    </button>

                  ))}

                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3">

                  <p className="text-sm text-slate-600">

                    You are about to mark yourself{' '}

                    <span className="font-semibold text-rose-600">
                      absent
                    </span>

                    {' '}for{' '}

                    <span className="font-bold text-slate-900">

                      {selectedDates.length}{' '}

                      {selectedDates.length === 1
                        ? 'day'
                        : 'days'}

                    </span>.

                    These dates will count as absences
                    for mess billing.

                  </p>

                </div>

              </>

            ) : (

              <p className="text-xs text-slate-500">
                Tap any available dates to select them.
                Tap again to remove a selection.
              </p>

            )}

            {/* Confirmation buttons */}
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
                  : selectedDates.length === 0
                    ? 'Confirm Absences'
                    : `Confirm ${selectedDates.length} ${
                        selectedDates.length === 1
                          ? 'Absence'
                          : 'Absences'
                      }`
                }

              </button>

            </div>

          </div>

        )}

        {/* Success or error message */}
        {message && (

          <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>

            {message.text}

          </div>

        )}

      </div>

      {/* Upcoming absences */}
      {upcomingAbsences.length > 0 && (

        <div className="card">

          <p className="text-sm font-bold text-slate-900 mb-3">
            Upcoming Absences ({upcomingAbsences.length})
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

                    {new Date(
                      a.absent_date + 'T00:00:00'
                    ).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}

                  </span>

                </div>

                {canRemoveAbsence(a.absent_date) ? (

                  <button
                    type="button"
                    onClick={() => handleRemoveAbsence(a)}
                    disabled={marking || removingId !== null}
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

      {/* Attendance statistics */}
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
