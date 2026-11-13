
import { useState } from 'react';
import {
  UserCircle,
  LogOut,
  Building2,
  DoorOpen,
  Phone,
  Clock,
  LockKeyhole,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import type { Student, Hostel } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

type StudentSettingsProps = {
  student: Student;
  hostel: Hostel;
  onSignOut: () => void;
};

export function StudentSettings({ student, hostel, onSignOut }: StudentSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setSuccess(false);

    if (newPassword.length < 6) {
      setMessage('New password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setMessage('Your new password must be different from the current password.');
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user?.email) {
        throw new Error('Unable to verify your account. Please sign in again.');
      }

      // Verify the current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error('Your current password is incorrect.');
      }

      // Update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setMessage('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-900">Settings</h2>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            <UserCircle className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{student.full_name}</p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
        </div>

        <div className="space-y-3">
          <InfoRow icon={Building2} label="Hostel" value={hostel?.name || '-'} />
          <InfoRow icon={DoorOpen} label="Room No" value={student.room_no || '-'} />
          <InfoRow icon={Phone} label="Phone" value={student.phone || '-'} />
        </div>
      </div>

      {/* Hostel info */}
      <div className="card">
        <p className="text-sm font-bold text-slate-900 mb-3">Hostel Settings</p>
        <div className="space-y-3">
          <InfoRow icon={Clock} label="Absence Cutoff" value="12:10 PM" />
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
            <LockKeyhole className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Change Password</p>
            <p className="text-xs text-slate-500">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Current Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Confirm New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center gap-2 text-xs font-medium text-slate-500"
          >
            {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPasswords ? 'Hide passwords' : 'Show passwords'}
          </button>

          {message && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                success
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {success && <CheckCircle size={16} className="shrink-0" />}
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                <LockKeyhole size={17} />
                Update Password
              </>
            )}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="btn-secondary w-full text-rose-600 hover:bg-rose-50 border-rose-200"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
