-- Rename the 'posts' table to 'pings'
ALTER TABLE public.posts RENAME TO pings;

-- Update foreign key references in other tables
-- For 'likes' table
ALTER TABLE public.likes
RENAME CONSTRAINT likes_ping_id_fkey TO likes_post_id_fkey; -- Rename old foreign key constraint
ALTER TABLE public.likes
DROP CONSTRAINT likes_ping_id_fkey; -- This might fail if the constraint name is not as expected, so manually check in your DB

ALTER TABLE public.likes
ADD CONSTRAINT likes_ping_id_fkey FOREIGN KEY (ping_id) REFERENCES public.pings(id) ON DELETE CASCADE;

-- For 'comments' table
ALTER TABLE public.comments
RENAME CONSTRAINT comments_ping_id_fkey TO comments_post_id_fkey; -- Rename old foreign key constraint
ALTER TABLE public.comments
DROP CONSTRAINT comments_ping_id_fkey; -- This might fail if the constraint name is not as expected, so manually check in your DB

ALTER TABLE public.comments
ADD CONSTRAINT comments_ping_id_fkey FOREIGN KEY (ping_id) REFERENCES public.pings(id) ON DELETE CASCADE;

-- For 'notifications' table
ALTER TABLE public.notifications
RENAME CONSTRAINT notifications_ping_id_fkey TO notifications_post_id_fkey; -- Rename old foreign key constraint
ALTER TABLE public.notifications
DROP CONSTRAINT notifications_ping_id_fkey; -- This might fail if the constraint name is not as expected, so manually check in your DB

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_ping_id_fkey FOREIGN KEY (ping_id) REFERENCES public.pings(id) ON DELETE CASCADE;

-- Update the RPC function to reflect the new table name
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