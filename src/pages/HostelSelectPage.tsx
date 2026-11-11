import { useEffect, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, GraduationCap } from 'lucide-react';
import { supabase, type Hostel } from '@/lib/supabase';
import { ErrorBanner } from '@/components/Feedback';

type HostelSelectPageProps = {
  role: 'warden' | 'student';
  onBack: () => void;
  onSelectHostel: (hostel: Hostel) => void;
};

export function HostelSelectPage({ role, onBack, onSelectHostel }: HostelSelectPageProps) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('hostels')
      .select('*')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setHostels(data ?? []);
        }
        setLoading(false);
      });
  }, []);

  const isWarden = role === 'warden';
  const accent = isWarden ? 'teal' : 'amber';

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
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${
              isWarden ? 'bg-teal-600 shadow-teal-600/25' : 'bg-amber-500 shadow-amber-500/25'
            }`}
          >
            {isWarden ? (
              <ShieldCheck className="h-8 w-8 text-white" strokeWidth={2.5} />
            ) : (
              <GraduationCap className="h-8 w-8 text-white" strokeWidth={2.5} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Select Your Hostel</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isWarden ? 'Choose your hostel to sign in as warden.' : 'Choose your hostel to sign in as a student.'}
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Loading hostels...</p>
          </div>
        ) : hostels.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No hostels yet</p>
            <p className="mt-1 text-xs text-slate-500">
              The app admin needs to add a hostel first. Please contact the app owner.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hostels.map((hostel) => (
              <button
                key={hostel.id}
                onClick={() => onSelectHostel(hostel)}
                className="group flex w-full items-center gap-4 rounded-2xl bg-white p-4 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isWarden ? 'bg-teal-50' : 'bg-amber-50'
                  }`}
                >
                  <Building2
                    className={`h-6 w-6 ${isWarden ? 'text-teal-600' : 'text-amber-600'}`}
                    strokeWidth={2.5}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-900">{hostel.name}</p>
                </div>
                <ChevronRight
                  className={`h-5 w-5 text-slate-300 group-hover:text-${accent}-500 transition-colors`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
