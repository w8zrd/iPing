-- Migration for Performance Improvements: Index on Posts and View Count RPC

-- 1. Add Index for faster feed ordering (Addresses Todo #1)
CREATE INDEX IF NOT EXISTS idx_pings_created_at_desc
ON public.pings USING btree (created_at DESC);

-- 2. Define the increment_ping_views RPC (Addresses Todo #2)
CREATE OR REPLACE FUNCTION increment_ping_views(_ping_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    SET search_path = public, pg_temp;
    UPDATE public.pings
    SET views = views + 1
    WHERE id = _ping_id;
END;
$$;