import { useState } from 'react';
import { ChefHat, Loader2, CheckCircle2, Save } from 'lucide-react';
import type { Hostel, MenuItem, MealType } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { ErrorBanner } from '@/components/Feedback';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'dinner', label: 'Dinner' },
];

type WardenMenuProps = {
  hostel: Hostel;
  menuItems: MenuItem[];
  onDataChange: () => void;
};

type MenuGrid = Record<number, Record<MealType, string>>;

function buildGrid(items: MenuItem[]): MenuGrid {
  const grid: MenuGrid = {};
  for (let d = 0; d < 7; d++) {
    grid[d] = { breakfast: '', lunch: '', snacks: '', dinner: '' };
  }
  for (const item of items) {
    if (grid[item.day_of_week]) {
      grid[item.day_of_week][item.meal_type] = item.content;
    }
  }
  return grid;
}

export function WardenMenu({ hostel, menuItems, onDataChange }: WardenMenuProps) {
  const [grid, setGrid] = useState<MenuGrid>(() => buildGrid(menuItems));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCell(day: number, meal: MealType, value: string) {
    setGrid((prev) => ({ ...prev, [day]: { ...prev[day], [meal]: value } }));
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const upserts: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>[] = [];
      for (let d = 0; d < 7; d++) {
        for (const meal of MEALS) {
          const content = grid[d][meal.key].trim();
          if (content) {
            upserts.push({
              hostel_id: hostel.id,
              day_of_week: d,
              meal_type: meal.key,
              content,
            });
          }
        }
      }

      // Delete all existing then re-insert to keep it simple and in sync.
      const { error: delError } = await supabase
        .from('menu_items')
        .delete()
        .eq('hostel_id', hostel.id);
      if (delError) throw delError;

      if (upserts.length > 0) {
        const { error: insError } = await supabase.from('menu_items').insert(upserts);
        if (insError) throw insError;
      }

      setSuccess(true);
      onDataChange();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8" />
          <div>
            <p className="text-sm text-teal-100">Weekly Menu</p>
            <h2 className="text-xl font-bold">Edit Food Menu</h2>
          </div>
        </div>
        <p className="mt-2 text-xs text-teal-100">
          Set the meals for each day. Students will see this week's menu in their app.
        </p>
      </div>

      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700">Menu saved successfully.</p>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="space-y-3">
        {DAYS.map((dayName, d) => (
          <div key={d} className="card">
            <p className="mb-3 text-sm font-bold text-slate-900">{dayName}</p>
            <div className="space-y-2.5">
              {MEALS.map((meal) => (
                <div key={meal.key}>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {meal.label}
                  </label>
                  <input
                    type="text"
                    value={grid[d][meal.key]}
                    onChange={(e) => updateCell(d, meal.key, e.target.value)}
                    placeholder={`e.g. Rice, Dal, Curry`}
                    className="input-field mt-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full sticky bottom-20 z-30 shadow-lg"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Saving...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Save size={16} /> Save Menu
          </span>
        )}
      </button>
    </div>
  );
}
