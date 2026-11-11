import { useState } from 'react';
import { ChefHat, Sun, Utensils, Coffee, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MenuItem, MealType } from '@/lib/supabase';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEAL_ICONS: Record<MealType, typeof Sun> = {
  breakfast: Sun,
  lunch: Utensils,
  snacks: Coffee,
  dinner: Moon,
};

type StudentMenuProps = {
  menuItems: MenuItem[];
};

export function StudentMenu({ menuItems }: StudentMenuProps) {
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);

  const dayMap = new Map<number, MenuItem[]>();
  for (const item of menuItems) {
    const arr = dayMap.get(item.day_of_week) || [];
    arr.push(item);
    dayMap.set(item.day_of_week, arr);
  }

  const todayItems = dayMap.get(selectedDay) || [];
  const allMeals: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8" />
          <div>
            <p className="text-sm text-teal-100">Weekly Menu</p>
            <h2 className="text-xl font-bold">Food Menu</h2>
          </div>
        </div>
        <p className="mt-2 text-xs text-teal-100">
          Check what's being served each day of the week.
        </p>
      </div>

      {/* Day selector */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedDay((selectedDay + 6) % 7)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <p className="text-base font-bold text-slate-900">
            {selectedDay === today ? 'Today' : DAYS[selectedDay]}
          </p>
          <button
            onClick={() => setSelectedDay((selectedDay + 1) % 7)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((_, d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${
                selectedDay === d
                  ? 'bg-teal-600 text-white shadow-sm'
                  : d === today
                  ? 'bg-teal-50 text-teal-600 ring-1 ring-teal-200'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {DAYS[d].slice(0, 1)}
            </button>
          ))}
        </div>
      </div>

      {/* Meal cards */}
      {todayItems.length === 0 ? (
        <div className="card text-center py-10">
          <ChefHat className="h-10 w-10 mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">No menu set for {DAYS[selectedDay]}</p>
          <p className="text-xs text-slate-400 mt-1">The warden hasn't added a menu for this day yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allMeals.map((mealType) => {
            const item = todayItems.find((i) => i.meal_type === mealType);
            if (!item || !item.content.trim()) return null;
            const Icon = MEAL_ICONS[mealType];
            return (
              <div key={mealType} className="card">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <Icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {mealType}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{item.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
