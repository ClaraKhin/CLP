import type { User, Role, Application, LoginActivity, Session, SSOProvider, EmailTemplate, PermissionMatrix } from "./types";

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

const superAdminPerms: PermissionMatrix = {
  users: { create: true, read: true, update: true, delete: true },
  roles: { create: true, read: true, update: true, delete: true },
  applications: { create: true, read: true, update: true, delete: true },
  reports: { create: true, read: true, update: true, delete: true },
  settings: { create: true, read: true, update: true, delete: true },
  audit_logs: { create: true, read: true, update: true, delete: true },
};

export const initialRoles: Role[] = [
  {
    id: "role-1",
    name: "Super Admin",
    description: "Full system access with all permissions",
    permissions: superAdminPerms,
    userCount: 1,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
    color: "purple",
  },
];

export const initialApplications: Application[] = [];

export const initialUsers: User[] = [
  {
    id: "user-1",
    email: "admin@example.com",
    firstName: "Demo",
    lastName: "Admin",
    role: "super_admin",
    status: "active",
    twoFactorEnabled: true,
    password: "Admin@123",
    favoriteApps: [],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
    sessionCount: 0,
    notificationsEnabled: true,
    emailNotifications: true,
    theme: "light",
    language: "en",
    timezone: "America/New_York",
    phone: "",
    department: "",
  },
];

export const initialLoginActivity: LoginActivity[] = [];
export const initialSessions: Session[] = [];
export const initialSSOProviders: SSOProvider[] = [];
export const initialEmailTemplates: EmailTemplate[] = [];
