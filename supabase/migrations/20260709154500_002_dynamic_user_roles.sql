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

-- Drop enum-based defaults first so the type can be dropped
ALTER TABLE users
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE applications
  ALTER COLUMN allowed_roles DROP DEFAULT;

-- Convert user role from enum to plain text so any created role can be stored
ALTER TABLE users
  ALTER COLUMN role TYPE text USING role::text;

-- Convert application allowed roles from enum array to text array
ALTER TABLE applications
  ALTER COLUMN allowed_roles TYPE text[] USING allowed_roles::text[];

-- Restore defaults as plain text values
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'user';

ALTER TABLE applications
  ALTER COLUMN allowed_roles SET DEFAULT '{}';

-- Drop the enum now that nothing references it
DROP TYPE IF EXISTS user_role;

COMMIT;
