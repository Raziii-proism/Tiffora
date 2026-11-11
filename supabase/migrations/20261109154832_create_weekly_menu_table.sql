/*
# Create weekly food menu table

1. New Tables
- `menu_items`
  - `id` (uuid, primary key)
  - `hostel_id` (uuid, foreign key -> hostels.id ON DELETE CASCADE)
  - `day_of_week` (int, 0=Sunday ... 6=Saturday)
  - `meal_type` (text: 'breakfast' | 'lunch' | 'snacks' | 'dinner')
  - `content` (text, the menu description, e.g. "Idli, Sambar, Chutney")
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - Unique constraint on (hostel_id, day_of_week, meal_type) so each hostel has
    one entry per meal per day.

2. Security
- Enable RLS on `menu_items`.
- Grant SELECT to `anon, authenticated` (students read via anon-key client;
  the public Entries page may also display the menu).
- Grant INSERT, UPDATE, DELETE to `authenticated` (warden-only writes).
- Policies:
  - Anyone can read (anon + authenticated) — the menu is shared hostel info.
  - Wardens can insert/update/delete only items for their own hostel, verified
    via the `wardens` table join.
*/

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snacks', 'dinner')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (hostel_id, day_of_week, meal_type)
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON menu_items TO authenticated;

DROP POLICY IF EXISTS "anon_read_menu_items" ON menu_items;
CREATE POLICY "anon_read_menu_items" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "warden_insert_menu_items" ON menu_items;
CREATE POLICY "warden_insert_menu_items" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM wardens w WHERE w.id = auth.uid() AND w.hostel_id = menu_items.hostel_id)
  );

DROP POLICY IF EXISTS "warden_update_menu_items" ON menu_items;
CREATE POLICY "warden_update_menu_items" ON menu_items FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM wardens w WHERE w.id = auth.uid() AND w.hostel_id = menu_items.hostel_id))
  WITH CHECK (EXISTS (SELECT 1 FROM wardens w WHERE w.id = auth.uid() AND w.hostel_id = menu_items.hostel_id));

DROP POLICY IF EXISTS "warden_delete_menu_items" ON menu_items;
CREATE POLICY "warden_delete_menu_items" ON menu_items FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM wardens w WHERE w.id = auth.uid() AND w.hostel_id = menu_items.hostel_id));
