/*
# Pin search path for generate_monthly_bills

## Changes
- Sets the function's search path to the public schema so it cannot be redirected by other schemas.

## Security
- Hardening only. No change to who can call the function or what it returns.
*/

ALTER FUNCTION generate_monthly_bills(uuid, date) SET search_path = public, pg_temp;
