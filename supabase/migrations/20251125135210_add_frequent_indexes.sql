-- Add indexes to frequently queried columns for performance optimization

-- Index for pings table
CREATE INDEX pings_user_id_idx ON public.pings (user_id);
CREATE INDEX pings_created_at_idx ON public.pings (created_at DESC);

-- Index for profiles table
CREATE INDEX profiles_username_idx ON public.profiles (username);

-- Index for likes table
CREATE INDEX likes_user_id_post_id_idx ON public.likes (user_id, post_id);
CREATE INDEX likes_post_id_idx ON public.likes (post_id);

-- Index for comments table
CREATE INDEX comments_user_id_idx ON public.comments (user_id);
CREATE INDEX comments_ping_id_idx ON public.comments (ping_id);
CREATE INDEX comments_created_at_idx ON public.comments (created_at DESC);

-- Index for friend_requests table
CREATE INDEX friend_requests_from_user_id_idx ON public.friend_requests (from_user_id);
CREATE INDEX friend_requests_to_user_id_idx ON public.friend_requests (to_user_id);