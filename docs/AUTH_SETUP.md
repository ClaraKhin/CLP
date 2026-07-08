# Authentication Documentation

This document provides comprehensive guidance on implementing and configuring authentication in the SSO Portal.

## Table of Contents

1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
4. [SSO Provider Configuration](#sso-provider-configuration)
5. [User Management](#user-management)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The SSO Portal uses Supabase for backend authentication and data persistence. Key features include:

- Email/password authentication
- Time-based One-Time Password (TOTP) 2FA via authenticator apps
- SSO via OAuth2/OIDC and SAML providers
- Role-based access control (RBAC)
- Session management
- Login activity auditing

### Architecture

```
Frontend (React + Zustand)
    |
    v
Supabase Client
    |
    v
PostgreSQL Database (with RLS policies)
    |
    +-- users table (authentication + profile data)
    +-- roles table (RBAC permissions)
    +-- sso_providers table (SSO configuration)
    +-- login_activity table (audit logging)
    +-- sessions table (active sessions)
```

---

## Database Setup

### Required Tables

All tables are created automatically via Supabase migrations. Key tables:

#### `users`

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  password_hash TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  totp_secret TEXT,
  -- ... additional profile fields
);
```

#### `roles`

```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  color TEXT,
  user_count INTEGER DEFAULT 0
);
```

#### `sso_providers`

```sql
CREATE TABLE public.sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'oauth2' or 'saml'
  enabled BOOLEAN DEFAULT false,
  client_id TEXT,
  client_secret TEXT,
  authorization_url TEXT,
  token_url TEXT,
  user_info_url TEXT,
  scopes TEXT[],
  -- SAML-specific fields
  entity_id TEXT,
  sso_url TEXT,
  certificate TEXT,
  metadata TEXT,
  test_status TEXT,
  last_tested TIMESTAMPTZ
);
```

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- Users can read/update their own data
- Admins can manage all users
- SSO providers readable by authenticated users, modifiable by admins
- Login activity visible to own user and admins

---

## Two-Factor Authentication (2FA)

### Overview

The 2FA implementation uses TOTP (Time-based One-Time Password) compatible with Google Authenticator, Authy, 1Password, and other authenticator apps.

### How It Works

1. **Setup**: User scans a QR code containing a TOTP secret
2. **Verification**: User enters a 6-digit code to verify setup
3. **Login**: When 2FA is enabled, users must provide a valid code after password authentication

### Setup Flow

#### For Users

1. Navigate to Account Settings -> 2FA tab
2. Click "Set up 2FA"
3. Scan the displayed QR code with an authenticator app
4. Enter the 6-digit code from the app to verify
5. 2FA is now enabled

#### Technical Implementation

```typescript
// Generate TOTP secret
const secret = generateTOTPSecret(); // 20-character base32 string

// Generate otpauth:// URI
const uri = generateTOTPUri(secret, email, "SSO Portal");

// Generate QR code image
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(uri)}`;

// Verify TOTP code
const isValid = await verifyTOTPCode(secret, userCode);
```

### Using otplib Library

The implementation uses the `otplib` library for TOTP operations:

```typescript
import { authenticator } from 'otplib';

// Generate secret
const secret = authenticator.generateSecret();

// Verify code
const isValid = authenticator.verify(code, secret);
```

### Manual Code Entry

If users cannot scan the QR code, they can manually enter the secret key:

- The secret is displayed in a formatted view (groups of 4 characters)
- Users enter this in their authenticator app's "manual entry" option

### Login with 2FA

1. User enters email and password
2. If 2FA is enabled, the login returns `requires2FA: true`
3. UI shows 2FA code input
4. User enters 6-digit code from authenticator app
5. Code is verified against stored secret
6. Login completes if code is valid

### Disabled 2FA

When a user disables 2FA:
- The `totp_secret` is cleared from the database
- The `two_factor_enabled` flag is set to false
- No code is required on next login

---

## SSO Provider Configuration

### Adding a New Provider

1. Go to Admin -> SSO Configuration
2. Click "Add Provider"
3. Enter provider name (e.g., "Google", "Okta")
4. Select type: OAuth2/OIDC or SAML
5. Configure credentials (see below)

### OAuth2/OIDC Configuration

Required fields:

| Field | Description | Example |
|-------|-------------|---------|
| Client ID | OAuth2 client identifier | `123456789.apps.googleusercontent.com` |
| Client Secret | OAuth2 client secret | `GOCSPX-xxxxx` |
| Authorization URL | OAuth2 authorize endpoint | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token URL | OAuth2 token endpoint | `https://oauth2.googleapis.com/token` |
| User Info URL | User profile endpoint | `https://www.googleapis.com/oauth2/v2/userinfo` |
| Scopes | Permission scopes | `openid, email, profile` |

#### Common OAuth2 Providers

**Google**
```
Authorization URL: https://accounts.google.com/o/oauth2/v2/auth
Token URL: https://oauth2.googleapis.com/token
User Info URL: https://www.googleapis.com/oauth2/v2/userinfo
Scopes: openid, email, profile
```

**GitHub**
```
Authorization URL: https://github.com/login/oauth/authorize
Token URL: https://github.com/login/oauth/access_token
User Info URL: https://api.github.com/user
Scopes: user:email, read:user
```

**Microsoft Azure AD**
```
Authorization URL: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
Token URL: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
User Info URL: https://graph.microsoft.com/v1.0/me
Scopes: openid, email, profile
```

### SAML Configuration

Required fields:

| Field | Description |
|-------|-------------|
| Entity ID | Service provider identifier |
| SSO URL | Identity provider SSO endpoint |
| X.509 Certificate | Identity provider public certificate |
| SP Metadata XML | Optional service provider metadata |

#### Common SAML Providers

**Okta**
```
Entity ID: {your-entity-id}
SSO URL: https://{org}.okta.com/app/{app-id}/sso/saml
Certificate: (from Okta admin console)
```

**Azure AD**
```
Entity ID: https://sts.windows.net/{tenant-id}/
SSO URL: https://login.microsoftonline.com/{tenant-id}/saml2
Certificate: (from Azure AD app registration)
```

### Testing SSO Connections

Each provider has a "Test Connection" button that:
1. Validates required fields are present
2. Simulates a connection test
3. Updates test status and timestamp

### Enabling Providers

Toggle the switch to enable/disable a provider:
- Enabled providers appear on the login page
- Disabled providers are hidden from users

---

## User Management

### Role System

Default roles:

| Role | Permissions |
|------|-------------|
| Super Admin | Full system access, manage all users and settings |
| Admin | Manage users, view activity, configure apps |
| User | Access assigned applications, manage own profile |
| Viewer | Read-only access to assigned applications |

### Creating Custom Roles

1. Go to Admin -> Roles
2. Click "Add Role"
3. Configure permissions matrix
4. Save the role

Roles created in the system automatically appear in:
- User creation dropdown
- User edit form
- Role filter options

### User Status

| Status | Description |
|--------|-------------|
| Active | Normal user, can login |
| Inactive | Cannot login, account disabled |
| Suspended | Account suspended, cannot login |

---

## Security Best Practices

### Password Requirements

- Minimum 8 characters
- Must contain uppercase letter
- Must contain number
- Recommended: special characters

### Session Security

- Tokens stored securely in Zustand state
- Session timeout handled by Supabase
- Users can view and terminate other sessions

### RLS Policies

All data access is protected by Row Level Security:
- Users can only access their own data
- Admins have elevated access
- Check policies before modifying queries

### Secrets Management

- SSO client secrets are stored in database
- TOTP secrets are stored securely
- Never log or expose secrets client-side

### Audit Logging

All login attempts are logged:
- Successful logins
- Failed attempts (with reason)
- Blocked attempts (suspended users)

View logs in Admin -> Activity

---

## Troubleshooting

### 2FA Issues

**Problem**: QR code won't scan
- **Solution**: Use manual secret entry option
- Verify the authenticator app supports TOTP

**Problem**: Code validation fails
- **Solution**: Ensure device time is synchronized
- TOTP codes are time-sensitive (30-second windows)

**Problem**: Lost access to authenticator
- **Solution**: Contact admin to disable 2FA
- Admin can clear `totp_secret` and `two_factor_enabled`

### SSO Issues

**Problem**: Connection test fails
- **Solution**: Verify all required fields are filled
- Check URLs are correct and reachable
- Ensure client ID/secret are valid

**Problem**: Users can't sign in with SSO
- **Solution**: Verify provider is enabled
- Check callback URL matches provider config
- Review login activity for errors

### Login Issues

**Problem**: "Invalid email or password"
- **Solution**: Verify credentials are correct
- Check user status (active)
- Caps lock might be on

**Problem**: "Account suspended"
- **Solution**: Contact admin to reactive account
- Admin can change user status to active

**Problem**: 2FA required but not set up
- **Solution**: Contact admin to disable 2FA flag
- User can then login and set up 2FA properly

---

## API Reference

### Store Actions

```typescript
// Authentication
login(email, password): Promise<{ success, error?, requires2FA? }>
verify2FA(code): Promise<{ success, error? }>
logout(): void
register(data): Promise<{ success, error? }>

// 2FA Management
setup2FA(): Promise<{ secret, qrUri }>
enable2FA(code): Promise<{ success, error? }>
disable2FA(): Promise<void>

// SSO
updateSSOProvider(id, updates): Promise<void>
testSSOConnection(id): Promise<{ success, message }>

// Users
addUser(userData): Promise<void>
updateUser(id, updates): Promise<void>
deleteUser(id): Promise<void>
```

### Type Definitions

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  twoFactorEnabled: boolean;
  totpSecret?: string;
  // ... other fields
}

interface SSOProvider {
  id: string;
  name: string;
  type: 'oauth2' | 'saml';
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  // ... other fields
}
```

---

## Environment Variables

Required environment variables (in `.env`):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Next Steps

After completing authentication setup:

1. Create initial admin user
2. Configure default roles
3. Set up SSO providers as needed
4. Enable 2FA for admin accounts
5. Review audit logs regularly
