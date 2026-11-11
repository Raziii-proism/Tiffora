import { useState } from 'react';
import { GraduationCap, ChevronLeft, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Hostel } from '@/lib/supabase';
import { ErrorBanner } from '@/components/Feedback';

type StudentAuthPageProps = {
  hostel: Hostel | null;
  onBack: () => void;
  onSuccess: () => void;
};

export function StudentAuthPage({ hostel, onBack, onSuccess }: StudentAuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Verify the signed-in user is actually a student
      const { data: studentRow } = await supabase
        .from('students')
        .select('id, hostel_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (!studentRow) {
        await supabase.auth.signOut();
        throw new Error('This account is not a student. Use the Warden login instead.');
      }

      if (hostel && studentRow.hostel_id !== hostel.id) {
        await supabase.auth.signOut();
        throw new Error('This student account does not belong to the selected hostel.');
      }

      onSuccess();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={18} /> Back to Home
        </button>

        <div className="mb-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/25">
            <GraduationCap className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Student Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with the account your warden created for you
          </p>
          {hostel && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">{hostel.name}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
              className="input-field"
              required
            />
          </div>

          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
          <p className="text-xs text-teal-700">
            Don't have an account? Ask your warden to add you — students are registered by their warden.
          </p>
        </div>
      </div>
    </div>
  );
}
