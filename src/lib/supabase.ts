import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type UserRole = string;
export type UserStatus = "active" | "inactive" | "suspended";
export type AppStatus = "active" | "inactive" | "maintenance";
export type LoginStatus = "success" | "failed" | "blocked";
export type ProviderType = "oauth2" | "saml" | "oidc";

export interface DbUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  department?: string;
  two_factor_enabled: boolean;
  password_hash: string;
  favorite_apps: string[];
  last_login?: string;
  last_seen_at?: string;
  is_online?: boolean;
  created_at: string;
  updated_at: string;
  session_count: number;
  notifications_enabled: boolean;
  email_notifications: boolean;
  theme: string;
  language: string;
  timezone: string;
}

export interface DbRole {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, Record<string, boolean>>;
  color: string;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbApplication {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: AppStatus;
  url: string;
  base_url: string;
  callback_url: string;
  secret_key: string;
  client_id: string;
  allowed_roles: UserRole[];
  last_accessed?: string;
  created_at: string;
  updated_at: string;
}

export interface DbLoginActivity {
  id: string;
  user_id?: string;
  user_email: string;
  user_name: string;
  application_name?: string;
  status: LoginStatus;
  ip: string;
  location: string;
  device: string;
  browser: string;
  timestamp: string;
  failure_reason?: string;
}

export interface DbSession {
  id: string;
  user_id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
}

export interface DbSSOProvider {
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;
  client_id: string;
  client_secret: string;
  authorization_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  metadata?: string;
  entity_id?: string;
  sso_url?: string;
  certificate?: string;
  last_tested?: string;
  test_status?: "success" | "failed" | "untested";
}

export interface DbEmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
  variables: string[];
  enabled: boolean;
  last_updated: string;
}

// Helper function to generate UUID-like IDs
export const generateId = () => crypto.randomUUID();

// Helper function to generate secret keys
export const generateSecret = () => "sk_live_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
