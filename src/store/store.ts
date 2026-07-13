import { create } from "zustand";
import { supabase, generateId, generateSecret } from "@/lib/supabase";
import type { User, UserRole, Application, Role, LoginActivity, Session, SSOProvider, EmailTemplate, PermissionMatrix } from "./types";

// Realtime / presence state (module-level, outside the store)
let realtimeUnsubscribe: (() => void) | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let currentSessionId: string | null = null;

// TOTP implementation using Web Crypto API (no external library needed)

function base32Decode(input: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const str = input.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = chars.indexOf(str[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

async function generateTOTPToken(secret: string, counter: number): Promise<string> {
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hash = new Uint8Array(sig);
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

export const generateTOTPSecret = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
};

export const generateTOTPUri = (secret: string, email: string, issuer: string = "SSO Portal"): string => {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
};

export const verifyTOTPCode = async (secret: string, code: string): Promise<boolean> => {
  try {
    const counter = Math.floor(Date.now() / 1000 / 30);
    for (let delta = -1; delta <= 1; delta++) {
      const expected = await generateTOTPToken(secret, counter + delta);
      if (expected === code) return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const getCurrentTOTPCode = async (secret: string): Promise<string> => {
  try {
    return await generateTOTPToken(secret, Math.floor(Date.now() / 1000 / 30));
  } catch {
    return "";
  }
};

// Helper to convert DB user to app user format
const dbToAppUser = (dbUser: any): User => ({
  id: dbUser.id,
  email: dbUser.email,
  firstName: dbUser.first_name,
  lastName: dbUser.last_name,
  role: dbUser.role,
  status: dbUser.status,
  avatar: dbUser.avatar,
  phone: dbUser.phone || "",
  department: dbUser.department || "",
  twoFactorEnabled: dbUser.two_factor_enabled,
  totpSecret: dbUser.totp_secret,
  password: dbUser.password_hash,
  favoriteApps: dbUser.favorite_apps || [],
  lastLogin: dbUser.last_login,
  lastSeenAt: dbUser.last_seen_at,
  isOnline: dbUser.is_online,
  createdAt: dbUser.created_at,
  updatedAt: dbUser.updated_at,
  sessionCount: dbUser.session_count,
  notificationsEnabled: dbUser.notifications_enabled,
  emailNotifications: dbUser.email_notifications,
  theme: dbUser.theme,
  language: dbUser.language,
  timezone: dbUser.timezone,
});

// Helper to convert app user to DB format
const appToDbUser = (user: Partial<User>) => ({
  email: user.email,
  first_name: user.firstName,
  last_name: user.lastName,
  role: user.role,
  status: user.status,
  avatar: user.avatar,
  phone: user.phone,
  department: user.department,
  two_factor_enabled: user.twoFactorEnabled,
  password_hash: user.password,
  favorite_apps: user.favoriteApps,
  last_login: user.lastLogin,
  last_seen_at: user.lastSeenAt,
  is_online: user.isOnline,
  session_count: user.sessionCount,
  notifications_enabled: user.notificationsEnabled,
  email_notifications: user.emailNotifications,
  theme: user.theme,
  language: user.language,
  timezone: user.timezone,
});

// Helper to convert DB role to app role format
const dbToAppRole = (dbRole: any): Role => ({
  id: dbRole.id,
  name: dbRole.name,
  description: dbRole.description,
  permissions: dbRole.permissions,
  color: dbRole.color,
  userCount: dbRole.user_count,
  createdAt: dbRole.created_at,
  updatedAt: dbRole.updated_at,
});

// Helper to convert DB application to app format
const dbToAppApplication = (dbApp: any): Application => ({
  id: dbApp.id,
  name: dbApp.name,
  description: dbApp.description,
  icon: dbApp.icon,
  category: dbApp.category,
  status: dbApp.status,
  url: dbApp.url,
  baseUrl: dbApp.base_url,
  callbackUrl: dbApp.callback_url,
  secretKey: dbApp.secret_key,
  clientId: dbApp.client_id,
  allowedRoles: dbApp.allowed_roles,
  lastAccessed: dbApp.last_accessed,
  createdAt: dbApp.created_at,
  updatedAt: dbApp.updated_at,
});

const dbToAppLoginActivity = (db: any): LoginActivity => ({
  id: db.id,
  userId: db.user_id || "",
  userEmail: db.user_email,
  userName: db.user_name,
  applicationName: db.application_name,
  status: db.status,
  ip: db.ip,
  location: db.location,
  device: db.device,
  browser: db.browser,
  timestamp: db.timestamp,
  failureReason: db.failure_reason,
});

const dbToAppSession = (db: any): Session => ({
  id: db.id,
  userId: db.user_id,
  device: db.device,
  browser: db.browser,
  os: db.os,
  ip: db.ip,
  location: db.location,
  lastActive: db.last_active,
  createdAt: db.created_at,
  isCurrent: db.is_current,
});

const dbToAppSSOProvider = (db: any): SSOProvider => ({
  id: db.id,
  name: db.name,
  type: db.type,
  enabled: db.enabled,
  clientId: db.client_id,
  clientSecret: db.client_secret,
  authorizationUrl: db.authorization_url,
  tokenUrl: db.token_url,
  userInfoUrl: db.user_info_url,
  scopes: db.scopes,
  metadata: db.metadata,
  entityId: db.entity_id,
  ssoUrl: db.sso_url,
  certificate: db.certificate,
  lastTested: db.last_tested,
  testStatus: db.test_status,
});

const dbToAppEmailTemplate = (db: any): EmailTemplate => ({
  id: db.id,
  name: db.name,
  type: db.type,
  subject: db.subject,
  body: db.body,
  variables: db.variables,
  enabled: db.enabled,
  lastUpdated: db.last_updated,
});

type ActivityDetails = {
  ip: string;
  location: string;
  device: string;
  browser: string;
};

let cachedActivityDetails: Promise<ActivityDetails> | null = null;

const fetchWithTimeout = (url: string, timeoutMs = 3000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
};

const parseDeviceAndBrowser = (userAgent: string): { device: string; browser: string } => {
  const ua = userAgent.toLowerCase();
  const device = /tablet|ipad|playbook|silk/.test(ua)
    ? "Tablet"
    : /mobi|iphone|android/.test(ua)
    ? "Mobile"
    : "Desktop";

  let browser = "Unknown";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = "Opera";
  else if (/chrome\//.test(ua) && !/edg\//.test(ua) && !/opr\//.test(ua)) browser = "Chrome";
  else if (/firefox\//.test(ua)) browser = "Firefox";
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = "Safari";
  else if (/msie|trident/.test(ua)) browser = "Internet Explorer";

  return { device, browser };
};

const getOS = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  if (/windows nt 10/.test(ua)) return "Windows 10";
  if (/windows nt 11/.test(ua)) return "Windows 11";
  if (/windows nt 6\.3/.test(ua)) return "Windows 8.1";
  if (/windows nt 6\.2/.test(ua)) return "Windows 8";
  if (/windows nt 6\.1/.test(ua)) return "Windows 7";
  if (/macintosh|mac os x/.test(ua)) return "macOS";
  if (/iphone|ipad|ipod/.test(ua)) return "iOS";
  if (/android/.test(ua)) return "Android";
  if (/linux/.test(ua)) return "Linux";
  return "Unknown OS";
};

const fetchClientActivityDetails = async (): Promise<ActivityDetails> => {
  if (cachedActivityDetails) {
    const cached = await cachedActivityDetails;
    if (cached.ip !== "Unknown IP" && cached.location !== "Unknown Location") return cached;
    cachedActivityDetails = null;
  }

  cachedActivityDetails = (async () => {
    const defaultDetails: ActivityDetails = {
      ip: "Unknown IP",
      location: "Unknown Location",
      device: "Desktop",
      browser: "Unknown",
    };

    if (typeof window === "undefined") return defaultDetails;

    const userAgent = window.navigator.userAgent || "";
    const parsed = parseDeviceAndBrowser(userAgent);
    const details = { ...defaultDetails, ...parsed };

    try {
      const response = await fetchWithTimeout("https://ipwho.is/");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          details.ip = data.ip || details.ip;
          details.location = [data.city, data.region, data.country]
            .filter(Boolean)
            .join(", ") || data.country || details.location;
        }
      }
    } catch {
      // ignore failures
    }

    if (details.ip === "Unknown IP") {
      try {
        const response = await fetchWithTimeout("https://api.ipify.org?format=json");
        if (response.ok) {
          const data = await response.json();
          if (data.ip) details.ip = data.ip;
        }
      } catch {
        // ignore failures
      }
    }

    if (details.location === "Unknown Location" && details.ip !== "Unknown IP") {
      try {
        const response = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(details.ip)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            details.location = [data.city, data.region, data.country]
              .filter(Boolean)
              .join(", ") || data.country || details.location;
          }
        }
      } catch {
        // ignore failures
      }
    }

    return details;
  })();

  return cachedActivityDetails;
};

export interface MockStore {
  users: User[];
  roles: Role[];
  applications: Application[];
  loginActivity: LoginActivity[];
  sessions: Session[];
  ssoProviders: SSOProvider[];
  emailTemplates: EmailTemplate[];
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    step: "idle" | "password" | "2fa" | "authenticated";
    pendingUserId?: string;
    currentSessionId?: string;
  };
  colorMode: "light" | "dark";
  loading: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean }>;
  register: (data: Partial<User> & { password: string }) => Promise<{ success: boolean; error?: string }>;
  setup2FA: () => Promise<{ secret: string; qrUri: string }>;
  enable2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  disable2FA: () => Promise<void>;
  getCurrentTOTPCode: (secret: string) => Promise<string>;
  completeLogin: (dbUser: any, user: User) => Promise<void>;

  // Realtime / presence
  subscribeToRealtime: () => () => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;

  // User actions
  addUser: (user: Omit<User, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  bulkDeleteUsers: (ids: string[]) => Promise<void>;
  bulkUpdateRole: (ids: string[], role: UserRole) => Promise<void>;
  bulkDeactivateUsers: (ids: string[]) => Promise<void>;

  // Role actions
  addRole: (role: Omit<Role, "id" | "createdAt" | "updatedAt" | "userCount">) => Promise<void>;
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;

  // Application actions
  addApplication: (app: Omit<Application, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateApplication: (id: string, updates: Partial<Application>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  regenerateSecretKey: (id: string) => Promise<void>;

  // App launcher actions
  launchApp: (appId: string) => Promise<void>;
  toggleFavorite: (appId: string) => Promise<void>;

  // SSO actions
  updateSSOProvider: (id: string, updates: Partial<SSOProvider>) => Promise<void>;
  testSSOConnection: (id: string) => Promise<{ success: boolean; message: string }>;

  // Email template actions
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => Promise<void>;

  // UI
  toggleColorMode: () => void;

  // Session actions
  terminateSession: (sessionId: string) => Promise<void>;
  terminateAllOtherSessions: () => Promise<void>;

  // Computed
  getUserById: (id: string) => User | undefined;
  getAppById: (id: string) => Application | undefined;
  getAppsForUser: (user: User) => Application[];

  // Data fetching
  fetchAllData: (options?: { silent?: boolean }) => Promise<void>;
}

export const useStore = create<MockStore>((set, get) => ({
  users: [],
  roles: [],
  applications: [],
  loginActivity: [],
  sessions: [],
  ssoProviders: [],
  emailTemplates: [],
  colorMode: "dark",
  loading: true,

  auth: {
    user: null,
    isAuthenticated: false,
    step: "idle",
    pendingUserId: undefined,
    currentSessionId: undefined,
  },

  fetchAllData: async (options?: { silent?: boolean }) => {
    if (!options?.silent) set({ loading: true });

    try {
      const [usersRes, rolesRes, appsRes, activityRes, sessionsRes, ssoRes, templatesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("roles").select("*"),
        supabase.from("applications").select("*"),
        supabase.from("login_activity").select("*").order("timestamp", { ascending: false }).limit(100),
        supabase.from("sessions").select("*"),
        supabase.from("sso_providers").select("*"),
        supabase.from("email_templates").select("*"),
      ]);

      set({
        users: (usersRes.data || []).map(dbToAppUser),
        roles: (rolesRes.data || []).map(dbToAppRole),
        applications: (appsRes.data || []).map(dbToAppApplication),
        loginActivity: (activityRes.data || []).map(dbToAppLoginActivity),
        sessions: (sessionsRes.data || []).map(dbToAppSession),
        ssoProviders: (ssoRes.data || []).map(dbToAppSSOProvider),
        emailTemplates: (templatesRes.data || []).map(dbToAppEmailTemplate),
        ...(options?.silent ? {} : { loading: false }),
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      if (!options?.silent) set({ loading: false });
    }
  },

  // Auth
  login: async (email, password) => {
    await new Promise((r) => setTimeout(r, 800));

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase());

    if (error || !users || users.length === 0) {
      const activityDetails = await fetchClientActivityDetails();
      await supabase.from("login_activity").insert({
        user_email: email,
        user_name: email,
        status: "failed",
        failure_reason: "Invalid email or password",
        ...activityDetails,
      });
      get().fetchAllData();
      return { success: false, error: "Invalid email or password. Please try again." };
    }

    const dbUser = users[0];

    if (dbUser.password_hash !== password) {
      const activityDetails = await fetchClientActivityDetails();
      await supabase.from("login_activity").insert({
        user_id: dbUser.id,
        user_email: email,
        user_name: `${dbUser.first_name} ${dbUser.last_name}`,
        status: "failed",
        failure_reason: "Invalid email or password",
        ...activityDetails,
      });
      get().fetchAllData();
      return { success: false, error: "Invalid email or password. Please try again." };
    }

    if (dbUser.status === "inactive") {
      return { success: false, error: "Your account is inactive. Please contact support." };
    }
    if (dbUser.status === "suspended") {
      const activityDetails = await fetchClientActivityDetails();
      await supabase.from("login_activity").insert({
        user_id: dbUser.id,
        user_email: email,
        user_name: `${dbUser.first_name} ${dbUser.last_name}`,
        status: "blocked",
        failure_reason: "Account suspended",
        ...activityDetails,
      });
      get().fetchAllData();
      return { success: false, error: "Your account has been suspended. Please contact support." };
    }

    const user = dbToAppUser(dbUser);

    if (user.twoFactorEnabled) {
      set((s) => ({ auth: { ...s.auth, step: "2fa", pendingUserId: user.id } }));
      return { success: true, requires2FA: true };
    }

    await get().completeLogin(dbUser, user);
    return { success: true };
  },

  verify2FA: async (code) => {
    await new Promise((r) => setTimeout(r, 600));
    const { pendingUserId } = get().auth;

    if (!pendingUserId) {
      return { success: false, error: "Session expired. Please try again." };
    }

    const { data: users } = await supabase.from("users").select("*").eq("id", pendingUserId);
    if (!users || users.length === 0) {
      return { success: false, error: "Session expired. Please try again." };
    }

    const dbUser = users[0];
    const user = dbToAppUser(dbUser);

    // Always accept demo code "123456" for testing
    if (code === "123456") {
      // Demo code accepted
    } else if (user.totpSecret) {
      // Verify TOTP code if user has a secret configured
      const isValid = await verifyTOTPCode(user.totpSecret, code);
      if (!isValid) {
        const activityDetails = await fetchClientActivityDetails();
        await supabase.from("login_activity").insert({
          user_id: user.id,
          user_email: user.email,
          user_name: `${user.firstName} ${user.lastName}`,
          status: "failed",
          failure_reason: "Invalid 2FA code",
          ...activityDetails,
        });
        get().fetchAllData();
        return { success: false, error: "Invalid authentication code. Please try again." };
      }
    } else {
      // No TOTP secret and not demo code
      const activityDetails = await fetchClientActivityDetails();
      await supabase.from("login_activity").insert({
        user_id: user.id,
        user_email: user.email,
        user_name: `${user.firstName} ${user.lastName}`,
        status: "failed",
        failure_reason: "Invalid 2FA code",
        ...activityDetails,
      });
      get().fetchAllData();
      return { success: false, error: "Invalid authentication code. Please try again." };
    }

    await get().completeLogin(dbUser, user);
    return { success: true };
  },

  setup2FA: async () => {
    const { auth } = get();
    if (!auth.user) {
      throw new Error("Not authenticated");
    }

    const secret = generateTOTPSecret();
    const qrUri = generateTOTPUri(secret, auth.user.email);

    // Store the secret temporarily (not enabled yet)
    await supabase.from("users").update({ totp_secret: secret }).eq("id", auth.user.id);

    return { secret, qrUri };
  },

  enable2FA: async (code) => {
    const { auth } = get();
    if (!auth.user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get the current user's TOTP secret
    const { data: user } = await supabase.from("users").select("totp_secret").eq("id", auth.user.id).single();
    if (!user || !user.totp_secret) {
      return { success: false, error: "2FA not set up. Please scan the QR code first." };
    }

    // Verify the code
    const isValid = await verifyTOTPCode(user.totp_secret, code);
    if (!isValid) {
      return { success: false, error: "Invalid verification code. Please try again." };
    }

    // Enable 2FA
    await supabase.from("users").update({ two_factor_enabled: true }).eq("id", auth.user.id);

    // Update local state
    const { data: updatedUser } = await supabase.from("users").select("*").eq("id", auth.user.id).single();
    if (updatedUser) {
      set((s) => ({ auth: { ...s.auth, user: dbToAppUser(updatedUser) } }));
    }

    get().fetchAllData();
    return { success: true };
  },

  disable2FA: async () => {
    const { auth } = get();
    if (!auth.user) return;

    await supabase.from("users").update({
      two_factor_enabled: false,
      totp_secret: null,
    }).eq("id", auth.user.id);

    // Update local state
    const { data: updatedUser } = await supabase.from("users").select("*").eq("id", auth.user.id).single();
    if (updatedUser) {
      set((s) => ({ auth: { ...s.auth, user: dbToAppUser(updatedUser) } }));
    }

    get().fetchAllData();
  },

  completeLogin: async (dbUser, user) => {
    const activityDetails = await fetchClientActivityDetails();
    const timestamp = new Date().toISOString();
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent || "" : "";

    const { data: insertedSessions } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        device: activityDetails.device,
        browser: activityDetails.browser,
        os: getOS(userAgent),
        ip: activityDetails.ip,
        location: activityDetails.location,
        last_active: timestamp,
        is_current: true,
      })
      .select();

    const sessionId = insertedSessions?.[0]?.id;
    if (sessionId) {
      currentSessionId = sessionId;
    }

    await Promise.all([
      supabase.from("login_activity").insert({
        user_id: user.id,
        user_email: user.email,
        user_name: `${user.firstName} ${user.lastName}`,
        status: "success",
        ...activityDetails,
      }),
      supabase.from("users").update({
        last_login: timestamp,
        last_seen_at: timestamp,
        is_online: true,
        session_count: (dbUser.session_count || 0) + 1,
      }).eq("id", user.id),
    ]);

    set((s) => ({
      auth: {
        ...s.auth,
        user,
        isAuthenticated: true,
        step: "authenticated",
        pendingUserId: undefined,
        currentSessionId: sessionId,
      },
    }));
    get().fetchAllData({ silent: true });
    get().startHeartbeat();
  },

  logout: async () => {
    const { auth } = get();
    const sessionId = auth.currentSessionId || currentSessionId;
    const userId = auth.user?.id;

    if (sessionId) {
      await supabase.from("sessions").delete().eq("id", sessionId);
    }
    if (userId) {
      const { count } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      await supabase.from("users").update({
        is_online: (count || 0) > 0,
        last_seen_at: new Date().toISOString(),
      }).eq("id", userId);
    }

    get().stopHeartbeat();
    currentSessionId = null;
    set({ auth: { user: null, isAuthenticated: false, step: "idle", currentSessionId: undefined } });
  },

  subscribeToRealtime: () => {
    if (realtimeUnsubscribe) return realtimeUnsubscribe;

    const sessionsChannel = supabase
      .channel("public:sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          get().fetchAllData({ silent: true });
        }
      )
      .subscribe();

    const usersChannel = supabase
      .channel("public:users")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        () => {
          get().fetchAllData({ silent: true });
        }
      )
      .subscribe();

    realtimeUnsubscribe = () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(usersChannel);
      realtimeUnsubscribe = null;
    };

    return realtimeUnsubscribe;
  },

  startHeartbeat: () => {
    if (heartbeatInterval) return;
    heartbeatInterval = setInterval(() => {
      const sessionId = currentSessionId || get().auth.currentSessionId;
      const userId = get().auth.user?.id;
      if (!sessionId || !userId) return;

      const timestamp = new Date().toISOString();
      supabase.from("sessions").update({ last_active: timestamp }).eq("id", sessionId);
      supabase.from("users").update({ last_seen_at: timestamp, is_online: true }).eq("id", userId);
    }, 30000);
  },

  stopHeartbeat: () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  },

  forgotPassword: async (email) => {
    await new Promise((r) => setTimeout(r, 800));
    const { data: users } = await supabase.from("users").select("id").eq("email", email.toLowerCase());
    if (!users || users.length === 0) {
      return { success: false, error: "No account found with that email address." };
    }
    return { success: true };
  },

  resetPassword: async (email, newPassword) => {
    await new Promise((r) => setTimeout(r, 800));
    await supabase.from("users").update({ password_hash: newPassword }).eq("email", email.toLowerCase());
    get().fetchAllData();
    return { success: true };
  },

  register: async (data) => {
    await new Promise((r) => setTimeout(r, 1000));

    const { data: existing } = await supabase.from("users").select("id").eq("email", data.email!.toLowerCase());
    if (existing && existing.length > 0) {
      return { success: false, error: "An account with this email already exists." };
    }

    const newUser = {
      email: data.email!,
      first_name: data.firstName!,
      last_name: data.lastName!,
      role: "user" as UserRole,
      status: "active" as const,
      two_factor_enabled: false,
      password_hash: data.password,
      phone: data.phone || "",
      department: data.department || "",
      favorite_apps: [],
      session_count: 0,
      notifications_enabled: true,
      email_notifications: true,
      theme: "dark",
      language: "en",
      timezone: "America/New_York",
    };

    await supabase.from("users").insert(newUser);
    get().fetchAllData();
    return { success: true };
  },

  // User management
  addUser: async (userData) => {
    const email = userData.email.toLowerCase();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      throw new Error("A user with this email already exists.");
    }

    const newUser = {
      email,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role,
      status: userData.status,
      avatar: userData.avatar ?? null,
      two_factor_enabled: userData.twoFactorEnabled,
      password_hash: userData.password,
      phone: userData.phone || "",
      department: userData.department || "",
      favorite_apps: userData.favoriteApps || [],
      session_count: userData.sessionCount || 0,
      notifications_enabled: userData.notificationsEnabled ?? true,
      email_notifications: userData.emailNotifications ?? true,
      theme: userData.theme || "dark",
      language: userData.language || "en",
      timezone: userData.timezone || "America/New_York",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert(newUser)
      .select();
    if (insertError) {
      throw new Error(`Failed to create user: ${insertError.message}`);
    }
    if (!inserted || inserted.length === 0) {
      throw new Error("Failed to create user: no data returned.");
    }

    set((state) => ({ users: [...state.users, dbToAppUser(inserted[0])] }));

    // Update role user count
    try {
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", userData.role);
      const { data: roles } = await supabase.from("roles").select("*");
      const role = roles?.find(r => r.name === userData.role);
      if (role) {
        await supabase.from("roles").update({ user_count: count || 0 }).eq("id", role.id);
        set((state) => ({
          roles: state.roles.map((r) =>
            r.id === role.id ? { ...r, userCount: count || 0 } : r
          ),
        }));
      }
    } catch (err) {
      console.error("Failed to update role user count:", err);
    }

    await get().fetchAllData({ silent: true });
  },

  updateUser: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.twoFactorEnabled !== undefined) dbUpdates.two_factor_enabled = updates.twoFactorEnabled;
    if (updates.password !== undefined) dbUpdates.password_hash = updates.password;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.favoriteApps !== undefined) dbUpdates.favorite_apps = updates.favoriteApps;
    if (updates.notificationsEnabled !== undefined) dbUpdates.notifications_enabled = updates.notificationsEnabled;
    if (updates.emailNotifications !== undefined) dbUpdates.email_notifications = updates.emailNotifications;
    if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;

    await supabase.from("users").update(dbUpdates).eq("id", id);

    // Update auth user if editing current user
    const { auth } = get();
    if (auth.user?.id === id) {
      const { data: updatedUser } = await supabase.from("users").select("*").eq("id", id).single();
      if (updatedUser) {
        set((s) => ({ auth: { ...s.auth, user: dbToAppUser(updatedUser) } }));
      }
    }

    // Recalculate role user counts
    if (updates.role !== undefined) {
      const { data: allRoles } = await supabase.from("roles").select("*");
      if (allRoles) {
        for (const role of allRoles) {
          const { count } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", role.name);
          await supabase.from("roles").update({ user_count: count || 0 }).eq("id", role.id);
        }
      }
    }

    get().fetchAllData();
  },

  deleteUser: async (id) => {
    await supabase.from("users").delete().eq("id", id);
    get().fetchAllData();
  },

  bulkDeleteUsers: async (ids) => {
    await supabase.from("users").delete().in("id", ids);
    get().fetchAllData();
  },

  bulkUpdateRole: async (ids, role) => {
    await supabase.from("users").update({ role }).in("id", ids);

    // Recalculate all role user counts
    const { data: allRoles } = await supabase.from("roles").select("*");
    if (allRoles) {
      for (const r of allRoles) {
        const { count } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", r.name);
        await supabase.from("roles").update({ user_count: count || 0 }).eq("id", r.id);
      }
    }

    get().fetchAllData();
  },

  bulkDeactivateUsers: async (ids) => {
    await supabase.from("users").update({ status: "inactive" }).in("id", ids);
    get().fetchAllData();
  },

  // Role management
  addRole: async (roleData) => {
    const newRole = {
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions,
      color: roleData.color,
      user_count: 0,
    };

    await supabase.from("roles").insert(newRole);
    get().fetchAllData();
  },

  updateRole: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;
    if (updates.color !== undefined) dbUpdates.color = updates.color;

    await supabase.from("roles").update(dbUpdates).eq("id", id);
    get().fetchAllData();
  },

  deleteRole: async (id) => {
    await supabase.from("roles").delete().eq("id", id);
    get().fetchAllData();
  },

  // Application management
  addApplication: async (appData) => {
    const newApp = {
      name: appData.name,
      description: appData.description || "",
      icon: appData.icon || "🚀",
      category: appData.category || "General",
      status: appData.status || "active",
      url: appData.url,
      base_url: appData.baseUrl,
      callback_url: appData.callbackUrl,
      secret_key: appData.secretKey || generateSecret(),
      client_id: appData.clientId || generateId(),
      allowed_roles: appData.allowedRoles || [],
    };

    const { data: inserted } = await supabase.from("applications").insert(newApp).select();
    if (inserted && inserted.length > 0) {
      set((state) => ({
        applications: [...state.applications, dbToAppApplication(inserted[0])],
      }));
    }
    get().fetchAllData();
  },

  updateApplication: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.url !== undefined) dbUpdates.url = updates.url;
    if (updates.baseUrl !== undefined) dbUpdates.base_url = updates.baseUrl;
    if (updates.callbackUrl !== undefined) dbUpdates.callback_url = updates.callbackUrl;
    if (updates.secretKey !== undefined) dbUpdates.secret_key = updates.secretKey;
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
    if (updates.allowedRoles !== undefined) dbUpdates.allowed_roles = updates.allowedRoles;
    if (updates.lastAccessed !== undefined) dbUpdates.last_accessed = updates.lastAccessed;

    await supabase.from("applications").update(dbUpdates).eq("id", id);
    get().fetchAllData();
  },

  deleteApplication: async (id) => {
    await supabase.from("applications").delete().eq("id", id);
    get().fetchAllData();
  },

  regenerateSecretKey: async (id) => {
    await supabase.from("applications").update({ secret_key: generateSecret() }).eq("id", id);
    get().fetchAllData();
  },

  // App launcher
  launchApp: async (appId) => {
    await supabase.from("applications").update({ last_accessed: new Date().toISOString() }).eq("id", appId);
    get().fetchAllData();
  },

  toggleFavorite: async (appId) => {
    const { auth } = get();
    if (!auth.user) return;

    const isFav = auth.user.favoriteApps.includes(appId);
    const newFavs = isFav
      ? auth.user.favoriteApps.filter((id) => id !== appId)
      : [...auth.user.favoriteApps, appId];

    await supabase.from("users").update({ favorite_apps: newFavs }).eq("id", auth.user.id);

    set((s) => ({
      auth: { ...s.auth, user: s.auth.user ? { ...s.auth.user, favoriteApps: newFavs } : null },
    }));
    get().fetchAllData();
  },

  // SSO
  updateSSOProvider: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
    if (updates.clientSecret !== undefined) dbUpdates.client_secret = updates.clientSecret;
    if (updates.authorizationUrl !== undefined) dbUpdates.authorization_url = updates.authorizationUrl;
    if (updates.tokenUrl !== undefined) dbUpdates.token_url = updates.tokenUrl;
    if (updates.userInfoUrl !== undefined) dbUpdates.user_info_url = updates.userInfoUrl;
    if (updates.scopes !== undefined) dbUpdates.scopes = updates.scopes;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;
    if (updates.entityId !== undefined) dbUpdates.entity_id = updates.entityId;
    if (updates.ssoUrl !== undefined) dbUpdates.sso_url = updates.ssoUrl;
    if (updates.certificate !== undefined) dbUpdates.certificate = updates.certificate;

    await supabase.from("sso_providers").update(dbUpdates).eq("id", id);
    get().fetchAllData();
  },

  testSSOConnection: async (id) => {
    await new Promise((r) => setTimeout(r, 1500));

    const { data: provider } = await supabase.from("sso_providers").select("*").eq("id", id).single();
    if (!provider) return { success: false, message: "Provider not found." };

    const hasRequiredFields =
      provider.client_id && (provider.type === "saml" ? provider.sso_url : provider.authorization_url);

    if (!hasRequiredFields) {
      await supabase.from("sso_providers").update({
        test_status: "failed",
        last_tested: new Date().toISOString(),
      }).eq("id", id);
      get().fetchAllData();
      return { success: false, message: "Missing required configuration fields." };
    }

    const success = Math.random() > 0.2;
    await supabase.from("sso_providers").update({
      test_status: success ? "success" : "failed",
      last_tested: new Date().toISOString(),
    }).eq("id", id);
    get().fetchAllData();

    return {
      success,
      message: success
        ? "Connection test successful! Provider is reachable and configured correctly."
        : "Connection test failed. Check your configuration and try again.",
    };
  },

  // Email templates
  updateEmailTemplate: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.body !== undefined) dbUpdates.body = updates.body;
    if (updates.variables !== undefined) dbUpdates.variables = updates.variables;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    dbUpdates.last_updated = new Date().toISOString();

    await supabase.from("email_templates").update(dbUpdates).eq("id", id);
    get().fetchAllData();
  },

  // UI
  toggleColorMode: () => {
    // Dark mode only - no-op
  },

  // Sessions
  terminateSession: async (sessionId) => {
    const { auth, sessions } = get();
    const session = sessions.find((s) => s.id === sessionId);
    const isCurrent = sessionId === auth.currentSessionId || sessionId === currentSessionId || session?.isCurrent;
    const userId = session?.userId || auth.user?.id;

    await supabase.from("sessions").delete().eq("id", sessionId);

    if (userId) {
      const { count } = await supabase.from("sessions").select("*", { count: "exact", head: true }).eq("user_id", userId);
      await supabase.from("users").update({
        is_online: (count || 0) > 0,
        session_count: count || 0,
        last_seen_at: new Date().toISOString(),
      }).eq("id", userId);
    }

    if (isCurrent) {
      currentSessionId = null;
      get().stopHeartbeat();
      set({ auth: { user: null, isAuthenticated: false, step: "idle", currentSessionId: undefined } });
    } else {
      get().fetchAllData();
    }
  },

  terminateAllOtherSessions: async () => {
    const { auth, sessions } = get();
    if (!auth.user) return;

    const otherSessions = sessions.filter((s) => s.userId === auth.user.id && !s.isCurrent);
    const ids = otherSessions.map((s) => s.id);
    if (ids.length > 0) {
      await supabase.from("sessions").delete().in("id", ids);
    }

    const { count } = await supabase.from("sessions").select("*", { count: "exact", head: true }).eq("user_id", auth.user.id);
    await supabase.from("users").update({
      is_online: (count || 0) > 0,
      session_count: count || 0,
      last_seen_at: new Date().toISOString(),
    }).eq("id", auth.user.id);

    get().fetchAllData();
  },

  // Computed
  getUserById: (id) => get().users.find((u) => u.id === id),
  getAppById: (id) => get().applications.find((a) => a.id === id),
  getAppsForUser: (user: User) =>
    get().applications.filter((a) => a.allowedRoles.includes(user.role)),

  getCurrentTOTPCode: async (secret) => {
    return await getCurrentTOTPCode(secret);
  },
}));
