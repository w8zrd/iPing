-- Migration for RLS Policy Fix: Allow authenticated users to read all posts and profiles.

-- 1. RLS Policy for pings: Allow authenticated users to read all posts (for the global feed).
CREATE POLICY "Authenticated users can read all pings."
ON public.pings
FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. RLS Policy for profiles: Allow public read access (Uncommenting from initial migration)
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles
FOR SELECT
USING (true);

-- 3. RLS Policy for profiles: Allow users to update their own profile (Uncommenting from initial migration)
CREATE POLICY "Users can update their own profile."
ON public.profiles
FOR UPDATE
USING ((auth.uid() = id));