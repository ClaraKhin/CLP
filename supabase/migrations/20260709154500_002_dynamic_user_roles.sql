/*
# Dynamic User Roles

This migration removes the fixed `user_role` enum constraint so that roles
created dynamically in the `roles` table can be assigned to users and applications.

Changes:
- `users.role` is changed from `user_role` enum to `text`
- `applications.allowed_roles` is changed from `user_role[]` to `text[]`
- The `user_role` enum is dropped after both columns are converted
*/

BEGIN;

-- Convert user role from enum to plain text so any created role can be stored
ALTER TABLE users
  ALTER COLUMN role TYPE text USING role::text;

-- Convert application allowed roles from enum array to text array
ALTER TABLE applications
  ALTER COLUMN allowed_roles TYPE text[] USING allowed_roles::text[];

-- Drop the enum now that nothing references it
DROP TYPE IF EXISTS user_role;

COMMIT;
