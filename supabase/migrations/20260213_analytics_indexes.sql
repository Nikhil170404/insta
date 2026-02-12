-- Composite covering index for the analytics RPC function.
-- Covers all filter columns used in the dashboard queries.
CREATE INDEX IF NOT EXISTS idx_dm_logs_analytics
  ON public.dm_logs(user_id, created_at DESC, reply_sent, is_clicked);
