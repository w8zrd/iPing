-- Enable the extension for UUID generation if not already enabled by default
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 

-- Create the profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  updated_at timestamp with time zone,
  avatar_url text,
  full_name text
);

-- Enable Realtime for the profiles table
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access
-- CREATE POLICY "Public profiles are viewable by everyone."
-- ON public.profiles
-- FOR SELECT
-- USING (true);

-- RLS Policy: Allow users to update their own profile
-- CREATE POLICY "Users can update their own profile."
-- ON public.profiles
-- FOR UPDATE
-- USING ((auth.uid() = id));