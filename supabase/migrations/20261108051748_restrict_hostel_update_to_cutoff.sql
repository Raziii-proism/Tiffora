/*
# Restrict warden hostel update to cutoff column only

## Changes
- Replaces the all-columns UPDATE grant on hostels with a column-restricted
  grant so wardens can only update `absence_cutoff_time` (the mess cut timing),
  not the hostel name or other fields.
- The existing `warden_update_own_hostel` RLS policy is kept as-is; it already
  restricts rows to the warden's own hostel.

## Security
- `authenticated` can now UPDATE only the `absence_cutoff_time` column on hostels.
- RLS still ensures a warden can only update their own hostel row.
*/

REVOKE UPDATE ON hostels FROM authenticated;
GRANT UPDATE (absence_cutoff_time) ON hostels TO authenticated;
