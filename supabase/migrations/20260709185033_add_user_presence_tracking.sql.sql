-- Add presence tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- Update enum type to include online status representation (optional - we'll use is_online boolean instead)
-- Create index for quick online user queries
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online) WHERE is_online = true;

-- Set all existing users to offline
UPDATE users SET is_online = false, last_seen_at = COALESCE(last_login, created_at) WHERE is_online IS NULL;

-- Add comment
COMMENT ON COLUMN users.is_online IS 'True when user has an active session, false otherwise';
COMMENT ON COLUMN users.last_seen_at IS 'Timestamp of last user activity';