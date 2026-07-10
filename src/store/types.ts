export type UserRole = string;

// Normalizes a role value for comparison (e.g. "Super Admin" -> "super_admin")
export const normalizeRole = (role: string): string =>
  role.toLowerCase().replace(/ /g, "_");
export type UserStatus = "active" | "inactive" | "suspended";
export type AppStatus = "active" | "inactive" | "maintenance";
export type LoginStatus = "success" | "failed" | "blocked";
export type ProviderType = "oauth2" | "saml" | "oidc";
export type Permission = "create" | "read" | "update" | "delete";
export type Resource =
  | "users"
  | "roles"
  | "applications"
  | "reports"
  | "settings"
  | "audit_logs";

export interface PermissionMatrix {
  [resource: string]: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PermissionMatrix;
  userCount: number;
  createdAt: string;
  updatedAt: string;
  color: string;
}

export interface Application {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: AppStatus;
  url: string;
  baseUrl: string;
  callbackUrl: string;
  secretKey: string;
  clientId: string;
  allowedRoles: UserRole[];
  lastAccessed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  department?: string;
  twoFactorEnabled: boolean;
  totpSecret?: string;
  password: string;
  favoriteApps: string[];
  lastLogin?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface Session {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface LoginActivity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  applicationId?: string;
  applicationName?: string;
  status: LoginStatus;
  ip: string;
  location: string;
  device: string;
  browser: string;
  timestamp: string;
  failureReason?: string;
}

export interface SSOProvider {
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  metadata?: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  lastTested?: string;
  testStatus?: "success" | "failed" | "untested";
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  enabled: boolean;
  lastUpdated: string;
  type:
    | "welcome"
    | "password_reset"
    | "email_verification"
    | "2fa_code"
    | "login_alert"
    | "account_locked";
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  step: "idle" | "password" | "2fa" | "authenticated";
  pendingUserId?: string;
}

export interface MockStore {
  users: User[];
  roles: Role[];
  applications: Application[];
  loginActivity: LoginActivity[];
  sessions: Session[];
  ssoProviders: SSOProvider[];
  emailTemplates: EmailTemplate[];
  auth: AuthState;
  colorMode: "light" | "dark";
  loading: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean }>;
  register: (data: Partial<User> & { password: string }) => Promise<{ success: boolean; error?: string }>;

  // User actions
  addUser: (user: Omit<User, "id" | "createdAt" | "updatedAt">) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  bulkDeleteUsers: (ids: string[]) => void;
  bulkUpdateRole: (ids: string[], role: UserRole) => void;
  bulkDeactivateUsers: (ids: string[]) => void;

  // Role actions
  addRole: (role: Omit<Role, "id" | "createdAt" | "updatedAt" | "userCount">) => void;
  updateRole: (id: string, updates: Partial<Role>) => void;
  deleteRole: (id: string) => void;

  // Application actions
  addApplication: (app: Omit<Application, "id" | "createdAt" | "updatedAt">) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  regenerateSecretKey: (id: string) => void;

  // App launcher actions
  launchApp: (appId: string) => void;
  toggleFavorite: (appId: string) => void;

  // SSO actions
  updateSSOProvider: (id: string, updates: Partial<SSOProvider>) => void;
  testSSOConnection: (id: string) => Promise<{ success: boolean; message: string }>;

  // Email template actions
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => void;

  // UI
  toggleColorMode: () => void;

  // Session actions
  terminateSession: (sessionId: string) => void;
  terminateAllOtherSessions: () => void;

  // Computed
  getUserById: (id: string) => User | undefined;
  getAppById: (id: string) => Application | undefined;
  getAppsForUser: (user: User) => Application[];

  // Data fetching
  fetchAllData: () => Promise<void>;
}
