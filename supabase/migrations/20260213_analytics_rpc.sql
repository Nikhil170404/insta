-- Analytics Dashboard RPC
-- Replaces ~50+ sequential REST queries with a single database call.
-- Returns all analytics data as a JSON object.

CREATE OR REPLACE FUNCTION public.get_analytics_dashboard(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_today_start TIMESTAMPTZ := date_trunc('day', v_now);
  v_period_start TIMESTAMPTZ := v_now - (p_days || ' days')::INTERVAL;
  v_this_month_start TIMESTAMPTZ := date_trunc('month', v_now);
  v_last_month_start TIMESTAMPTZ := date_trunc('month', v_now - INTERVAL '1 month');
  v_last_month_end TIMESTAMPTZ := v_this_month_start - INTERVAL '1 second';
  v_24h_ago TIMESTAMPTZ := v_now - INTERVAL '24 hours';
  v_6months_ago TIMESTAMPTZ := date_trunc('month', v_now - INTERVAL '5 months');
BEGIN
  SELECT jsonb_build_object(
    -- === Scalar counts ===
    'today_count',        COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND reply_sent = true AND created_at >= v_today_start), 0),
    'period_count',       COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND reply_sent = true AND created_at >= v_period_start), 0),
    'total_count',        COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND reply_sent = true), 0),
    'attempted_count',    COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id), 0),
    'click_count',        COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND is_clicked = true), 0),

    -- === This month ===
    'this_month_dms',     COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND reply_sent = true AND created_at >= v_this_month_start), 0),
    'this_month_clicks',  COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND is_clicked = true  AND created_at >= v_this_month_start), 0),
    'this_month_success', COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND reply_sent = true AND created_at >= v_this_month_start), 0),

    -- === Last month ===
    'last_month_dms',     COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND reply_sent = true AND created_at >= v_last_month_start AND created_at <= v_last_month_end), 0),
    'last_month_clicks',  COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND is_clicked = true  AND created_at >= v_last_month_start AND created_at <= v_last_month_end), 0),
    'last_month_success', COALESCE((SELECT COUNT(*) FROM dm_logs WHERE user_id = p_user_id AND reply_sent = true AND created_at >= v_last_month_start AND created_at <= v_last_month_end), 0),

    -- === Daily stats (last N days) ===
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d) ORDER BY d.day)
      FROM (
        SELECT
          date_trunc('day', created_at)::DATE AS day,
          COUNT(*) AS count
        FROM dm_logs
        WHERE user_id = p_user_id
          AND reply_sent = true
          AND created_at >= (v_today_start - (p_days || ' days')::INTERVAL)
        GROUP BY date_trunc('day', created_at)::DATE
      ) d
    ), '[]'::jsonb),

    -- === Hourly stats (last 24 hours) ===
    'hourly', COALESCE((
      SELECT jsonb_agg(row_to_json(h) ORDER BY h.hour)
      FROM (
        SELECT
          date_trunc('hour', created_at) AS hour,
          COUNT(*) AS count
        FROM dm_logs
        WHERE user_id = p_user_id
          AND reply_sent = true
          AND created_at >= v_24h_ago
        GROUP BY date_trunc('hour', created_at)
      ) h
    ), '[]'::jsonb),

    -- === Monthly trend (last 6 months) ===
    'monthly_trend', COALESCE((
      SELECT jsonb_agg(row_to_json(m) ORDER BY m.month)
      FROM (
        SELECT
          date_trunc('month', created_at) AS month,
          COUNT(*) FILTER (WHERE reply_sent = true) AS dms,
          COUNT(*) FILTER (WHERE is_clicked = true) AS clicks
        FROM dm_logs
        WHERE user_id = p_user_id
          AND created_at >= v_6months_ago
        GROUP BY date_trunc('month', created_at)
      ) m
    ), '[]'::jsonb),

    -- === Top keywords (this month, top 5) ===
    'top_keywords', COALESCE((
      SELECT jsonb_agg(row_to_json(k))
      FROM (
        SELECT
          COALESCE(keyword_matched, 'ANY') AS keyword,
          COUNT(*) AS count,
          (array_agg(automation_id))[1]::TEXT AS automation_id
        FROM dm_logs
        WHERE user_id = p_user_id
          AND created_at >= v_this_month_start
        GROUP BY COALESCE(keyword_matched, 'ANY')
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) k
    ), '[]'::jsonb),

    -- === Recent logs (last 100) ===
    'logs', COALESCE((
      SELECT jsonb_agg(row_to_json(l))
      FROM (
        SELECT id, instagram_username, keyword_matched, comment_text, reply_sent, is_clicked, created_at
        FROM dm_logs
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 100
      ) l
    ), '[]'::jsonb)

  ) INTO result;

  RETURN result;
END;
$$;
