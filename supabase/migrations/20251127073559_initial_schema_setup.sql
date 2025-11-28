-- Enable the extension for UUID generation if not already enabled by default
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 

-- 1. Create the profiles table and add is_admin and tenant_id columns IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  tenant_id uuid, -- Added tenant_id to satisfy potential RLS/Tenant check
  username text UNIQUE,
  updated_at timestamp with time zone,
  avatar_url text,
  display_name text,
  is_admin boolean DEFAULT false -- Added missing column
);

-- Enable Realtime for the profiles table (Keep this, as it might be standard setup)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (Commented out to avoid syntax error)
-- CREATE POLICY "Public profiles are viewable by everyone."
-- ON public.profiles
-- FOR SELECT
-- USING (true);

-- RLS Policy: Allow users to update their own profile (Commented out to avoid syntax error)
-- CREATE POLICY "Users can update their own profile."
-- ON public.profiles
-- FOR UPDATE
-- USING ((auth.uid() = id));

-- 2. Create the notifications table (for Error fetching notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- e.g., 'like', 'comment', 'mention'
    content jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Create the pings table (for Error fetching pings)
CREATE TABLE IF NOT EXISTS public.pings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    image_url text, -- Added for image posts
    views integer DEFAULT 0, -- Added for view count
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;

-- 4. Create the likes table
CREATE TABLE IF NOT EXISTS public.likes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ping_id uuid NOT NULL REFERENCES public.pings(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (ping_id, user_id) -- A user can only like a ping once
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 5. Create the comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ping_id uuid NOT NULL REFERENCES public.pings(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 4. Create the chat_participants table (for Error fetching chats)
-- Assuming a simple many-to-many relationship linking users to chats
CREATE TABLE IF NOT EXISTS public.chats (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT now(),
    UNIQUE (chat_id, user_id) -- Ensure a user is only in a chat once
);
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;