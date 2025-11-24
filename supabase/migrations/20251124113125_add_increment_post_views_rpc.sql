CREATE OR REPLACE FUNCTION public.increment_ping_views(_ping_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pings
  SET views = views + 1
  WHERE id = _ping_id;
END;
$$;