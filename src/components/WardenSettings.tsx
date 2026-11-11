import { useState } from 'react';
import { ShieldCheck, Building2, LogOut, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import type { Hostel } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { ErrorBanner } from '@/components/Feedback';

type WardenSettingsProps = {
  hostel: Hostel;
  onSignOut: () => void;
  onDataChange: () => void;
};

function formatCutoffLabel(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function WardenSettings({ hostel, onSignOut, onDataChange }: WardenSettingsProps) {
  const [cutoffTime, setCutoffTime] = useState(hostel.absence_cutoff_time || '12:10');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveCutoff() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const { error: err } = await supabase
      .from('hostels')
      .update({ absence_cutoff_time: cutoffTime })
      .eq('id', hostel.id);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      onDataChange();
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-900">Settings</h2>

      {/* Warden profile */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            <ShieldCheck className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Warden</p>
            <p className="text-xs text-slate-500">{hostel.name}</p>
          </div>
        </div>

        <div className="space-y-3">
          <InfoRow icon={Building2} label="Hostel" value={hostel.name} />
        </div>
      </div>

      {/* Mess cut timing */}
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Mess Cut Timing</p>
            <p className="text-xs text-slate-500">
              Set the deadline before which students must mark their absence. The cutoff applies on the day before the absent date.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-text">Cutoff Time</label>
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => {
                setCutoffTime(e.target.value);
                setSuccess(false);
              }}
              className="input-field"
            />
            <p className="mt-1 text-xs text-slate-400">
              Current: students must mark absence before{' '}
              <span className="font-semibold text-slate-600">{formatCutoffLabel(cutoffTime)}</span> on the previous day.
            </p>
          </div>

          {error && <ErrorBanner message={error} />}

          {success && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-xs font-medium text-emerald-700">Mess cut timing updated.</p>
            </div>
          )}

          <button
            onClick={handleSaveCutoff}
            disabled={saving || cutoffTime === hostel.absence_cutoff_time}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Clock size={16} /> Save Cutoff Time
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button onClick={onSignOut} className="btn-secondary w-full text-rose-600 hover:bg-rose-50 border-rose-200">
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
