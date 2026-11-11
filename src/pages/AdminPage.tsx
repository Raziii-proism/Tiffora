import { useEffect, useState } from 'react';
import { ChevronLeft, KeyRound, UserPlus, Building2, CheckCircle2, Loader2, Trash2, ShieldCheck, Lock, Mail, LogOut } from 'lucide-react';
import { supabase, type Hostel } from '@/lib/supabase';
import { ErrorBanner, EmptyState } from '@/components/Feedback';

type AdminPageProps = {
  onBack: () => void;
};

type Tab = 'hostels' | 'wardens';

type AdminCredentials = { email: string; password: string };

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
    const { data } = await supabase.from('hostels').select('*').order('name');
    setHostels(data ?? []);
    setLoadingHostels(false);
  }

  useEffect(() => {
    if (admin) refreshHostels();
  }, [admin]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthenticating(true);
    setLoginError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid credentials');

      setAdmin({ email: loginEmail, password: loginPassword });
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      setLoginError((err as Error).message);
    } finally {
      setAuthenticating(false);
    }
  }

  function handleLogout() {
    setAdmin(null);
    setHostels([]);
    setLoadingHostels(true);
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="mx-auto w-full max-w-md flex-1 px-6 py-8">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={18} /> Back to Home
          </button>

          <div className="mb-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
              <KeyRound className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to manage hostels and wardens.</p>
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
            <button type="submit" disabled={authenticating} className="btn-primary w-full">
              {authenticating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck size={16} /> Sign In
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
            <ChevronLeft size={18} /> Back to Home
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div className="mb-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
            <KeyRound className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="mt-1 text-sm text-slate-500">Add hostels and assign wardens to them.</p>
        </div>

        <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setTab('hostels')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === 'hostels' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={16} /> Hostels
          </button>
          <button
            onClick={() => setTab('wardens')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === 'wardens' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck size={16} /> Wardens
          </button>
        </div>

        {tab === 'hostels' ? (
          <HostelsTab admin={admin} hostels={hostels} loadingHostels={loadingHostels} onChanged={refreshHostels} />
        ) : (
          <WardensTab admin={admin} hostels={hostels} />
        )}
      </div>
    </div>
  );
}

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-hostel`, {
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
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add hostel');

      setSuccess(`Hostel "${hostelName.trim()}" added.`);
      setHostelName('');
      onChanged();
    } catch (err) {
      setError((err as Error).message);
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
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Adding...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Building2 size={16} /> Add Hostel
            </span>
          )}
        </button>
      </form>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Existing Hostels</p>
        {loadingHostels ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : hostels.length === 0 ? (
          <EmptyState icon={Building2} title="No hostels yet" description="Add your first hostel above." />
        ) : (
          <div className="space-y-2">
            {hostels.map((hostel) => (
              <div key={hostel.id} className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                  <Building2 className="h-5 w-5 text-teal-600" />
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-900">{hostel.name}</span>
                <Trash2 className="h-4 w-4 text-slate-300" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WardensTab({ admin, hostels }: { admin: AdminCredentials; hostels: Hostel[] }) {
  const [hostelId, setHostelId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-warden`, {
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
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create warden');

      setSuccess(`Warden account created for ${email}. They can now sign in.`);
      setEmail('');
      setPassword('');
      setHostelId('');
    } catch (err) {
      setError((err as Error).message);
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
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for the warden"
              className="input-field"
              required
              minLength={6}
            />
          </div>

          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Creating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserPlus size={16} /> Create Warden Account
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
