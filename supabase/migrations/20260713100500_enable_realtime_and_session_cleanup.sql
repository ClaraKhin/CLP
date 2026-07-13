-- Enable realtime for presence/session tables
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE sessions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- Function to clean up a session and update user presence when a tab/browser closes
CREATE OR REPLACE FUNCTION cleanup_session(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM sessions WHERE id = session_id;
  DELETE FROM sessions WHERE id = session_id;
  IF v_user_id IS NOT NULL THEN
    UPDATE users
    SET is_online = EXISTS (SELECT 1 FROM sessions WHERE user_id = v_user_id),
        session_count = (SELECT count(*) FROM sessions WHERE user_id = v_user_id),
        last_seen_at = now()
    WHERE id = v_user_id;
  END IF;
END;
$$;
