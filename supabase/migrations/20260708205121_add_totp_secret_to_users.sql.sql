-- Add TOTP secret column for authenticator-based 2FA
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS totp_secret TEXT;

-- Add index for faster lookups on totp_secret (for users who have 2FA enabled)
CREATE INDEX IF NOT EXISTS idx_users_totp_secret ON public.users(totp_secret) WHERE totp_secret IS NOT NULL;