/*
# Admin Delete Hostel function

## Changes
- Creates `admin_delete_hostel` function with SECURITY DEFINER
- Validates admin credentials before deleting
- Cascades deletion to all related records in students, wardens, bills, absences, mess leaves, expense items, and menu items
*/

CREATE OR REPLACE FUNCTION admin_delete_hostel(p_hostel_id uuid, p_admin_email text, p_admin_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hostel_name text;
BEGIN
  IF p_admin_email IS NULL OR p_admin_password IS NULL
     OR LOWER(TRIM(p_admin_email)) <> 'mhdrazikp2007@gmail.com'
     OR p_admin_password <> 'Razi@2007' THEN
    RETURN jsonb_build_object('error', 'Invalid admin credentials.');
  END IF;

  SELECT name INTO v_hostel_name FROM hostels WHERE id = p_hostel_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Hostel not found.');
  END IF;

  DELETE FROM hostels WHERE id = p_hostel_id;

  RETURN jsonb_build_object('success', true, 'hostelName', v_hostel_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_delete_hostel(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_hostel(uuid, text, text) TO anon, authenticated;
