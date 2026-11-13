
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  KeyRound,
  UserPlus,
  Building2,
  CheckCircle2,
  Loader2,
  Trash2,
  ShieldCheck,
  Lock,
  Mail,
  LogOut,
  Users,
  Search,
  RefreshCw,
  Copy,
} from 'lucide-react';

import { supabase, type Hostel } from '@/lib/supabase';
import { ErrorBanner, EmptyState } from '@/components/Feedback';

type AdminPageProps = {
  onBack: () => void;
};

type Tab = 'hostels' | 'wardens' | 'students';

type AdminCredentials = {
  email: string;
  password: string;
  sessionToken: string;
};

type ManagedStudent = {
  id: string;
  full_name: string;
  email: string;
  hostel_id: string;
  hostel_name: string;
  room_no: string | null;
};

export function AdminPage({ onBack }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>('hostels');

  const [admin, setAdmin] = useState<AdminCredentials | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(true);

  async function refreshHostels() {
    setLoadingHostels(true);

    const { data, error } = await supabase
      .from('hostels')
      .select('*')
      .order('name');

    if (error) {
      console.error('Could not load hostels:', error.message);
    }

    setHostels(data ?? []);
    setLoadingHostels(false);
  }

  useEffect(() => {
    if (admin) {
      refreshHostels();
    }
  }, [admin]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setAuthenticating(true);
    setLoginError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/verify-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.authorized || !data.token) {
        throw new Error(data.error || 'Invalid admin credentials');
      }

      setAdmin({
        email: loginEmail,
        password: loginPassword,
        sessionToken: data.token,
      });

      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Login failed'
      );
    } finally {
      setAuthenticating(false);
    }
  }

  function handleLogout() {
    setAdmin(null);
    setHostels([]);
    setLoadingHostels(true);
    setTab('hostels');
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="mx-auto w-full max-w-md flex-1 px-6 py-8">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={18} />
            Back to Home
          </button>

          <div className="mb-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
              <KeyRound
                className="h-8 w-8 text-white"
                strokeWidth={2.5}
              />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Admin Login
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Sign in to manage hostels, wardens and students.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-text">Admin Email</label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-text">Password</label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {loginError && <ErrorBanner message={loginError} />}

            <button
              type="submit"
              disabled={authenticating}
              className="btn-primary w-full"
            >
              {authenticating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck size={16} />
                  Sign In
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="mb-6 flex items-start justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={18} />
            Back to Home
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="mb-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
            <KeyRound
              className="h-8 w-8 text-white"
              strokeWidth={2.5}
            />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Admin Panel
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage hostels, wardens and student accounts.
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setTab('hostels')}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
              tab === 'hostels'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={15} />
            Hostels
          </button>

          <button
            onClick={() => setTab('wardens')}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
              tab === 'wardens'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck size={15} />
            Wardens
          </button>

          <button
            onClick={() => setTab('students')}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
              tab === 'students'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={15} />
            Students
          </button>
        </div>

        {tab === 'hostels' ? (
          <HostelsTab
            admin={admin}
            hostels={hostels}
            loadingHostels={loadingHostels}
            onChanged={refreshHostels}
          />
        ) : tab === 'wardens' ? (
          <WardensTab admin={admin} hostels={hostels} />
        ) : (
          <StudentsTab admin={admin} />
        )}
      </div>
    </div>
  );
}

/* =====================================================
   HOSTELS TAB
===================================================== */

function HostelsTab({
  admin,
  hostels,
  loadingHostels,
  onChanged,
}: {
  admin: AdminCredentials;
  hostels: Hostel[];
  loadingHostels: boolean;
  onChanged: () => void;
}) {
  const [hostelName, setHostelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-hostel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            adminEmail: admin.email,
            adminPassword: admin.password,
            hostelName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add hostel');
      }

      setSuccess(`Hostel "${hostelName.trim()}" added.`);
      setHostelName('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label-text">Hostel Name</label>

          <input
            type="text"
            value={hostelName}
            onChange={(e) => setHostelName(e.target.value)}
            placeholder="e.g. Block A Hostel"
            className="input-field"
            required
          />
        </div>

        {error && <ErrorBanner message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Adding...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Building2 size={16} />
              Add Hostel
            </span>
          )}
        </button>
      </form>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Existing Hostels
        </p>

        {loadingHostels ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : hostels.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No hostels yet"
            description="Add your first hostel above."
          />
        ) : (
          <div className="space-y-2">
            {hostels.map((hostel) => (
              <div
                key={hostel.id}
                className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                  <Building2 className="h-5 w-5 text-teal-600" />
                </div>

                <span className="flex-1 text-sm font-semibold text-slate-900">
                  {hostel.name}
                </span>

                <Trash2 className="h-4 w-4 text-slate-300" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   WARDENS TAB
===================================================== */

function WardensTab({
  admin,
  hostels,
}: {
  admin: AdminCredentials;
  hostels: Hostel[];
}) {
  const [hostelId, setHostelId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-warden`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            adminEmail: admin.email,
            adminPassword: admin.password,
            email,
            password,
            hostelId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create warden');
      }

      setSuccess(`Warden account created for ${email}. They can now sign in.`);
      setEmail('');
      setPassword('');
      setHostelId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700">{success}</p>
        </div>
      )}

      {hostels.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Add a hostel first"
          description="You need at least one hostel before you can assign a warden. Switch to the Hostels tab."
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label-text">Hostel</label>

            <select
              value={hostelId}
              onChange={(e) => setHostelId(e.target.value)}
              className="input-field"
              required
            >
              <option value="" disabled>
                Select a hostel
              </option>

              {hostels.map((hostel) => (
                <option key={hostel.id} value={hostel.id}>
                  {hostel.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text">Warden Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="warden@example.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label-text">Warden Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for the warden"
              className="input-field"
              required
              minLength={6}
            />
          </div>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserPlus size={16} />
                Create Warden Account
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

/* =====================================================
   STUDENTS TAB
===================================================== */

function StudentsTab({ admin }: { admin: AdminCredentials }) {
  const [students, setStudents] = useState<ManagedStudent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [temporaryStudent, setTemporaryStudent] = useState('');

  const functionUrl =
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-student-management`;

  async function callAdminFunction(body: Record<string, unknown>) {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'X-Admin-Session': admin.sessionToken,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Admin request failed.');
    }

    return data;
  }

  async function loadStudents() {
    setLoading(true);
    setError(null);

    try {
      const data = await callAdminFunction({ action: 'list' });
      setStudents(data.students || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load students.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function handleReset(student: ManagedStudent) {
    const confirmed = window.confirm(
      `Generate a new temporary password for ${student.full_name}?\n\nTheir current password will stop working.`
    );

    if (!confirmed) return;

    setResettingId(student.id);
    setError(null);
    setSuccess(null);
    setTemporaryPassword('');
    setTemporaryStudent('');

    try {
      const data = await callAdminFunction({
        action: 'reset',
        studentId: student.id,
      });

      setTemporaryStudent(data.studentName || student.full_name);
      setTemporaryPassword(data.temporaryPassword);
      setSuccess('Password reset successfully.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Password reset failed.'
      );
    } finally {
      setResettingId(null);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setSuccess('Temporary password copied.');
    } catch {
      setError(
        'Could not copy automatically. Please select and copy the password.'
      );
    }
  }

  const filteredStudents = students.filter((student) =>
    `${student.full_name} ${student.email} ${student.hostel_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Student Password Management
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          View student accounts and generate temporary passwords.
        </p>
      </div>

      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {temporaryPassword && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <KeyRound size={18} />
            <p className="font-bold text-sm">
              New Temporary Password
            </p>
          </div>

          <p className="text-xs text-amber-700">
            For {temporaryStudent}. Save this password and share it securely
            with the student. It will not be shown again after leaving this screen.
          </p>

          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-white border border-amber-200 p-3 text-sm font-bold text-slate-900">
              {temporaryPassword}
            </code>

            <button
              onClick={copyPassword}
              className="rounded-lg bg-white border border-amber-200 p-3 text-amber-800"
              title="Copy password"
            >
              <Copy size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              setTemporaryPassword('');
              setTemporaryStudent('');
            }}
            className="text-xs font-semibold text-amber-800 underline"
          >
            Hide temporary password
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or hostel..."
            className="input-field pl-9"
          />
        </div>

        <button
          onClick={loadStudents}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-3 text-slate-600"
          title="Refresh students"
        >
          <RefreshCw
            size={17}
            className={loading ? 'animate-spin' : ''}
          />
        </button>
      </div>

      <div className="text-xs font-semibold text-slate-500">
        {filteredStudents.length} student(s)
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-6 text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />

          <p className="text-sm font-semibold text-slate-700">
            No students found
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Try another search.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="rounded-xl border border-slate-100 bg-white p-3 space-y-3"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {student.full_name}
                </p>

                <p className="mt-1 break-all text-xs text-slate-500">
                  {student.email || 'No email found'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{student.hostel_name}</span>
                <span>Room: {student.room_no || '-'}</span>
              </div>

              <button
                onClick={() => handleReset(student)}
                disabled={resettingId !== null || !student.email}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {resettingId === student.id ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    Generate Temporary Password
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
