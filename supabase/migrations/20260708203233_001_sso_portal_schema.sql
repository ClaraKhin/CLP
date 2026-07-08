/*
# SSO Portal Schema

This migration creates the complete schema for the SSO Portal application including:

1. New Tables:
   - `users`: Portal user profiles
     - id (uuid, primary key)
     - email (text, unique)
     - first_name, last_name (text)
     - role (enum: super_admin, admin, user, viewer)
     - status (enum: active, inactive, suspended)
     - password_hash (text - for demo purposes)
     - two_factor_enabled (boolean)
     - phone, department (text, optional)
     - favorite_apps (text array)
     - session_count (integer)
     - notifications_enabled, email_notifications (booleans)
     - theme, language, timezone (text preferences)
     - last_login, created_at, updated_at (timestamps)

   - `roles`: Role definitions with permission matrix
     - id (uuid, primary key)
     - name (text, unique)
     - description (text)
     - permissions (jsonb - permission matrix)
     - color (text)
     - user_count (integer)
     - created_at, updated_at (timestamps)

   - `applications`: SSO-integrated applications
     - id (uuid, primary key)
     - name, description, icon, category (text)
     - status (enum: active, inactive, maintenance)
     - url, base_url, callback_url (text)
     - secret_key, client_id (text)
     - allowed_roles (text array)
     - last_accessed, created_at, updated_at (timestamps)

   - `login_activity`: Audit log of all login attempts
     - id (uuid, primary key)
     - user_id (uuid, references users)
     - user_email, user_name, application_name (text)
     - status (enum: success, failed, blocked)
     - ip, location, device, browser (text)
     - timestamp (timestamptz)
     - failure_reason (text, optional)

   - `sessions`: User session tracking
     - id (uuid, primary key)
     - user_id (uuid, references users)
     - device, browser, os, ip, location (text)
     - last_active, created_at (timestamps)
     - is_current (boolean)

   - `sso_providers`: External identity provider configs
     - id (uuid, primary key)
     - name, type (text)
     - enabled (boolean)
     - client_id, client_secret, authorization_url, token_url, user_info_url (text)
     - scopes (text array)
     - metadata, entity_id, sso_url, certificate (text, for SAML)
     - last_tested (timestamptz)
     - test_status (enum: success, failed, untested)

   - `email_templates`: Email notification templates
     - id (uuid, primary key)
     - name, type (text)
     - subject, body (text)
     - variables (text array)
     - enabled (boolean)
     - last_updated (timestamptz)

2. Security:
   - RLS enabled on all tables
   - Policies for anon + authenticated access (single-tenant demo app)

3. Important Notes:
   - Uses `TO anon, authenticated` for all policies since this is a demo portal
   - Password stored in plain text for demo simplicity (NOT production-ready)
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user', 'viewer');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE app_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE login_status AS ENUM ('success', 'failed', 'blocked');
CREATE TYPE provider_type AS ENUM ('oauth2', 'saml', 'oidc');
CREATE TYPE test_status AS ENUM ('success', 'failed', 'untested');
CREATE TYPE email_template_type AS ENUM (
  'welcome', 
  'password_reset', 
  'email_verification', 
  '2fa_code', 
  'login_alert', 
  'account_locked'
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  status user_status NOT NULL DEFAULT 'active',
  avatar text,
  phone text DEFAULT '',
  department text DEFAULT '',
  two_factor_enabled boolean NOT NULL DEFAULT false,
  password_hash text NOT NULL,
  favorite_apps text[] DEFAULT '{}',
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  session_count integer DEFAULT 0,
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  theme text DEFAULT 'dark',
  language text DEFAULT 'en',
  timezone text DEFAULT 'America/New_York'
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  color text DEFAULT 'blue',
  user_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roles" ON roles;
CREATE POLICY "anon_select_roles" ON roles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_roles" ON roles;
CREATE POLICY "anon_insert_roles" ON roles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_roles" ON roles;
CREATE POLICY "anon_update_roles" ON roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_roles" ON roles;
CREATE POLICY "anon_delete_roles" ON roles FOR DELETE TO anon, authenticated USING (true);

-- APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '🚀',
  category text DEFAULT 'General',
  status app_status NOT NULL DEFAULT 'active',
  url text NOT NULL,
  base_url text NOT NULL,
  callback_url text NOT NULL,
  secret_key text NOT NULL,
  client_id text NOT NULL,
  allowed_roles user_role[] NOT NULL DEFAULT '{}',
  last_accessed timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_applications" ON applications;
CREATE POLICY "anon_select_applications" ON applications FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_applications" ON applications;
CREATE POLICY "anon_insert_applications" ON applications FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_applications" ON applications;
CREATE POLICY "anon_update_applications" ON applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_applications" ON applications;
CREATE POLICY "anon_delete_applications" ON applications FOR DELETE TO anon, authenticated USING (true);

-- LOGIN ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  application_name text,
  status login_status NOT NULL,
  ip text NOT NULL,
  location text NOT NULL,
  device text NOT NULL,
  browser text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  failure_reason text
);

CREATE INDEX IF NOT EXISTS idx_login_activity_user ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_timestamp ON login_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_status ON login_activity(status);

ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_login_activity" ON login_activity;
CREATE POLICY "anon_select_login_activity" ON login_activity FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_login_activity" ON login_activity;
CREATE POLICY "anon_insert_login_activity" ON login_activity FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_login_activity" ON login_activity;
CREATE POLICY "anon_update_login_activity" ON login_activity FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_login_activity" ON login_activity;
CREATE POLICY "anon_delete_login_activity" ON login_activity FOR DELETE TO anon, authenticated USING (true);

-- SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  device text NOT NULL,
  browser text NOT NULL,
  os text NOT NULL,
  ip text NOT NULL,
  location text NOT NULL,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE TO anon, authenticated USING (true);

-- SSO PROVIDERS TABLE
CREATE TABLE IF NOT EXISTS sso_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type provider_type NOT NULL,
  enabled boolean DEFAULT false,
  client_id text DEFAULT '',
  client_secret text DEFAULT '',
  authorization_url text DEFAULT '',
  token_url text DEFAULT '',
  user_info_url text DEFAULT '',
  scopes text[] DEFAULT '{}',
  metadata text,
  entity_id text,
  sso_url text,
  certificate text,
  last_tested timestamptz,
  test_status test_status DEFAULT 'untested'
);

ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sso_providers" ON sso_providers;
CREATE POLICY "anon_select_sso_providers" ON sso_providers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sso_providers" ON sso_providers;
CREATE POLICY "anon_insert_sso_providers" ON sso_providers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sso_providers" ON sso_providers;
CREATE POLICY "anon_update_sso_providers" ON sso_providers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sso_providers" ON sso_providers;
CREATE POLICY "anon_delete_sso_providers" ON sso_providers FOR DELETE TO anon, authenticated USING (true);

-- EMAIL TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type email_template_type NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  enabled boolean DEFAULT true,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_email_templates" ON email_templates;
CREATE POLICY "anon_select_email_templates" ON email_templates FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_email_templates" ON email_templates;
CREATE POLICY "anon_insert_email_templates" ON email_templates FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_email_templates" ON email_templates;
CREATE POLICY "anon_update_email_templates" ON email_templates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_email_templates" ON email_templates;
CREATE POLICY "anon_delete_email_templates" ON email_templates FOR DELETE TO anon, authenticated USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial admin user and role
INSERT INTO roles (name, description, permissions, color, user_count)
VALUES (
  'Super Admin',
  'Full system access with all permissions',
  '{
    "users": {"create": true, "read": true, "update": true, "delete": true},
    "roles": {"create": true, "read": true, "update": true, "delete": true},
    "applications": {"create": true, "read": true, "update": true, "delete": true},
    "reports": {"create": true, "read": true, "update": true, "delete": true},
    "settings": {"create": true, "read": true, "update": true, "delete": true},
    "audit_logs": {"create": true, "read": true, "update": true, "delete": true}
  }'::jsonb,
  'purple',
  1
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (email, first_name, last_name, role, status, password_hash, two_factor_enabled)
VALUES (
  'admin@example.com',
  'Demo',
  'Admin',
  'super_admin',
  'active',
  'Admin@123',
  true
)
ON CONFLICT (email) DO NOTHING;