import { create } from "zustand";
import type { MockStore, User, UserRole, Application } from "./types";
import {
  initialUsers,
  initialRoles,
  initialApplications,
  initialLoginActivity,
  initialSessions,
  initialSSOProviders,
  initialEmailTemplates,
} from "./mockData";

const generateId = () => Math.random().toString(36).slice(2, 11);
const generateSecret = () => "sk_live_" + Math.random().toString(36).slice(2, 26);

export const useStore = create<MockStore>((set, get) => ({
  users: initialUsers,
  roles: initialRoles,
  applications: initialApplications,
  loginActivity: initialLoginActivity,
  sessions: initialSessions,
  ssoProviders: initialSSOProviders,
  emailTemplates: initialEmailTemplates,
  colorMode: "light",

  auth: {
    user: null,
    isAuthenticated: false,
    step: "idle",
    pendingUserId: undefined,
  },

  // Auth
  login: async (email, password) => {
    await new Promise((r) => setTimeout(r, 800));
    const users = get().users;
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      return { success: false, error: "Invalid email or password. Please try again." };
    }
    if (user.status === "inactive") {
      return { success: false, error: "Your account is inactive. Please contact support." };
    }
    if (user.status === "suspended") {
      return { success: false, error: "Your account has been suspended. Please contact support." };
    }
    if (user.twoFactorEnabled) {
      set((s) => ({ auth: { ...s.auth, step: "2fa", pendingUserId: user.id } }));
      return { success: true, requires2FA: true };
    }
    // Log activity
    const activityEntry = {
      id: generateId(),
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      status: "success" as const,
      ip: "192.168.1." + Math.floor(Math.random() * 254 + 1),
      location: "Current Location",
      device: "Desktop",
      browser: "Chrome",
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      auth: { user, isAuthenticated: true, step: "authenticated" },
      users: s.users.map((u) =>
        u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
      ),
      loginActivity: [activityEntry, ...s.loginActivity],
    }));
    return { success: true };
  },

  verify2FA: async (code) => {
    await new Promise((r) => setTimeout(r, 600));
    if (code !== "123456") {
      return { success: false, error: "Invalid authentication code. Please try again." };
    }
    const { pendingUserId } = get().auth;
    const users = get().users;
    const user = users.find((u) => u.id === pendingUserId);
    if (!user) return { success: false, error: "Session expired. Please try again." };
    const activityEntry = {
      id: generateId(),
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      status: "success" as const,
      ip: "192.168.1." + Math.floor(Math.random() * 254 + 1),
      location: "Current Location",
      device: "Desktop",
      browser: "Chrome",
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      auth: { user, isAuthenticated: true, step: "authenticated", pendingUserId: undefined },
      users: s.users.map((u) =>
        u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
      ),
      loginActivity: [activityEntry, ...s.loginActivity],
    }));
    return { success: true };
  },

  logout: () => {
    set({ auth: { user: null, isAuthenticated: false, step: "idle" } });
  },

  forgotPassword: async (email) => {
    await new Promise((r) => setTimeout(r, 800));
    const user = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: "No account found with that email address." };
    }
    return { success: true };
  },

  resetPassword: async (email, newPassword) => {
    await new Promise((r) => setTimeout(r, 800));
    set((s) => ({
      users: s.users.map((u) =>
        u.email.toLowerCase() === email.toLowerCase()
          ? { ...u, password: newPassword, updatedAt: new Date().toISOString() }
          : u
      ),
    }));
    return { success: true };
  },

  register: async (data) => {
    await new Promise((r) => setTimeout(r, 1000));
    const existing = get().users.find(
      (u) => u.email.toLowerCase() === data.email!.toLowerCase()
    );
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }
    const newUser: User = {
      id: generateId(),
      email: data.email!,
      firstName: data.firstName!,
      lastName: data.lastName!,
      role: "user",
      status: "active",
      twoFactorEnabled: false,
      password: data.password,
      favoriteApps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessionCount: 0,
      notificationsEnabled: true,
      emailNotifications: true,
      theme: "light",
      language: "en",
      timezone: "America/New_York",
      phone: data.phone || "",
      department: data.department || "",
    };
    set((s) => ({ users: [...s.users, newUser] }));
    return { success: true };
  },

  // User management
  addUser: (userData) => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ users: [...s.users, newUser] }));
  },

  updateUser: (id, updates) => {
    set((s) => ({
      users: s.users.map((u) =>
        u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u
      ),
      auth:
        s.auth.user?.id === id
          ? { ...s.auth, user: { ...s.auth.user!, ...updates } }
          : s.auth,
    }));
  },

  deleteUser: (id) => {
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
  },

  bulkDeleteUsers: (ids) => {
    set((s) => ({ users: s.users.filter((u) => !ids.includes(u.id)) }));
  },

  bulkUpdateRole: (ids, role) => {
    set((s) => ({
      users: s.users.map((u) =>
        ids.includes(u.id) ? { ...u, role, updatedAt: new Date().toISOString() } : u
      ),
    }));
  },

  bulkDeactivateUsers: (ids) => {
    set((s) => ({
      users: s.users.map((u) =>
        ids.includes(u.id)
          ? { ...u, status: "inactive" as const, updatedAt: new Date().toISOString() }
          : u
      ),
    }));
  },

  // Role management
  addRole: (roleData) => {
    const newRole = {
      ...roleData,
      id: generateId(),
      userCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ roles: [...s.roles, newRole] }));
  },

  updateRole: (id, updates) => {
    set((s) => ({
      roles: s.roles.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));
  },

  deleteRole: (id) => {
    set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
  },

  // Application management
  addApplication: (appData) => {
    const newApp: Application = {
      ...appData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ applications: [...s.applications, newApp] }));
  },

  updateApplication: (id, updates) => {
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    }));
  },

  deleteApplication: (id) => {
    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) }));
  },

  regenerateSecretKey: (id) => {
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? { ...a, secretKey: generateSecret(), updatedAt: new Date().toISOString() }
          : a
      ),
    }));
  },

  // App launcher
  launchApp: (appId) => {
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === appId
          ? { ...a, lastAccessed: new Date().toISOString() }
          : a
      ),
    }));
  },

  toggleFavorite: (appId) => {
    const { auth } = get();
    if (!auth.user) return;
    const user = auth.user;
    const isFav = user.favoriteApps.includes(appId);
    const newFavs = isFav
      ? user.favoriteApps.filter((id) => id !== appId)
      : [...user.favoriteApps, appId];
    set((s) => ({
      users: s.users.map((u) =>
        u.id === user.id ? { ...u, favoriteApps: newFavs } : u
      ),
      auth: {
        ...s.auth,
        user: s.auth.user ? { ...s.auth.user, favoriteApps: newFavs } : null,
      },
    }));
  },

  // SSO
  updateSSOProvider: (id, updates) => {
    set((s) => ({
      ssoProviders: s.ssoProviders.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  testSSOConnection: async (id) => {
    await new Promise((r) => setTimeout(r, 1500));
    const provider = get().ssoProviders.find((p) => p.id === id);
    if (!provider) return { success: false, message: "Provider not found." };
    const hasRequiredFields =
      provider.clientId && (provider.type === "saml" ? provider.ssoUrl : provider.authorizationUrl);
    if (!hasRequiredFields) {
      set((s) => ({
        ssoProviders: s.ssoProviders.map((p) =>
          p.id === id ? { ...p, testStatus: "failed", lastTested: new Date().toISOString() } : p
        ),
      }));
      return { success: false, message: "Missing required configuration fields." };
    }
    const success = Math.random() > 0.2;
    set((s) => ({
      ssoProviders: s.ssoProviders.map((p) =>
        p.id === id
          ? {
              ...p,
              testStatus: success ? "success" : "failed",
              lastTested: new Date().toISOString(),
            }
          : p
      ),
    }));
    return {
      success,
      message: success
        ? "Connection test successful! Provider is reachable and configured correctly."
        : "Connection test failed. Check your configuration and try again.",
    };
  },

  // Email templates
  updateEmailTemplate: (id, updates) => {
    set((s) => ({
      emailTemplates: s.emailTemplates.map((t) =>
        t.id === id ? { ...t, ...updates, lastUpdated: new Date().toISOString() } : t
      ),
    }));
  },

  // UI
  toggleColorMode: () => {
    set((s) => ({ colorMode: s.colorMode === "light" ? "dark" : "light" }));
  },

  // Sessions
  terminateSession: (sessionId) => {
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== sessionId),
    }));
  },

  terminateAllOtherSessions: () => {
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.isCurrent),
    }));
  },

  // Computed
  getUserById: (id) => get().users.find((u) => u.id === id),
  getAppById: (id) => get().applications.find((a) => a.id === id),
  getAppsForUser: (user: User) =>
    get().applications.filter((a) => a.allowedRoles.includes(user.role)),
}));
