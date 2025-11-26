-- Add indexes to frequently queried columns for performance optimization

-- Add indexes safely using DO block to check for table existence

DO $$
BEGIN
    -- Index for pings table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pings') THEN
        CREATE INDEX IF NOT EXISTS pings_user_id_idx ON public.pings (user_id);
        CREATE INDEX IF NOT EXISTS pings_created_at_idx ON public.pings (created_at DESC);
    END IF;

    -- Index for profiles table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
    END IF;

    -- Index for likes table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'likes') THEN
        -- Check if columns exist before indexing
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'likes' AND column_name = 'post_id') THEN
            CREATE INDEX IF NOT EXISTS likes_user_id_post_id_idx ON public.likes (user_id, post_id);
            CREATE INDEX IF NOT EXISTS likes_post_id_idx ON public.likes (post_id);
        END IF;
    END IF;

    -- Index for comments table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments (user_id);
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'ping_id') THEN
            CREATE INDEX IF NOT EXISTS comments_ping_id_idx ON public.comments (ping_id);
        END IF;
        
        CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments (created_at DESC);
    END IF;

    -- Index for friend_requests table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friend_requests') THEN
        CREATE INDEX IF NOT EXISTS friend_requests_from_user_id_idx ON public.friend_requests (from_user_id);
        CREATE INDEX IF NOT EXISTS friend_requests_to_user_id_idx ON public.friend_requests (to_user_id);
    END IF;
END $$;