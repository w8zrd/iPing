CREATE OR REPLACE FUNCTION public.increment_post_views(_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET views = views + 1
  WHERE id = _post_id;
END;
$$;