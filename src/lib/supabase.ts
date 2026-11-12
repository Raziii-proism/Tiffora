import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Returns a valid, non-expired Supabase access token.
 * Refreshes the token automatically if expired or expiring within 60 seconds.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  // If token is missing expires_at or expires within 60 seconds (or is already expired)
  if (!expiresAt || expiresAt - Date.now() < 60000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed?.session) {
      return refreshed.session.access_token;
    }
    // If refresh failed and token is already expired, it cannot be used
    if (expiresAt && expiresAt <= Date.now()) {
      return null;
    }
  }

  return session.access_token;
}

export type Hostel = {
  id: string;
  name: string;
  upi_id: string | null;
  absence_cutoff_time: string;
  daily_cost: number;
  total_monthly_expense: number | null;
  created_at: string;
};

export type Warden = {
  id: string;
  hostel_id: string;
  created_at: string;
};

export type Student = {
  id: string;
  hostel_id: string;
  full_name: string;
  room_no: string | null;
  phone: string | null;
  created_at: string;
};

export type Absence = {
  id: string;
  student_id: string;
  absent_date: string;
  created_at: string;
};

export type Bill = {
  id: string;
  student_id: string;
  hostel_id: string;
  month: string;
  present_days: number;
  amount: number;
  mess_amount?: number | null;
  common_amount?: number | null;
  allowance_amount?: number | null;
  room_rent_amount?: number | null;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type MessLeave = {
  id: string;
  hostel_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
};

export type ExpenseItemType = 'common_bill' | 'mess_bill' | 'allowance' | 'room_rent';

export type ExpenseItem = {
  id: string;
  hostel_id: string;
  type: ExpenseItemType;
  label: string;
  amount: number;
  month: string;
  created_at: string;
};

export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export type MenuItem = {
  id: string;
  hostel_id: string;
  day_of_week: number;
  meal_type: MealType;
  content: string;
  created_at: string;
  updated_at: string;
};

export type UserRole = 'warden' | 'student' | null;
