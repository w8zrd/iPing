-- Fix RLS Policies and Triggers

-- 1. Allow authenticated users to insert pings
CREATE POLICY "Users can create pings."
ON public.pings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Allow authenticated users to update their own pings
CREATE POLICY "Users can update their own pings."
ON public.pings
FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Allow authenticated users to delete their own pings
CREATE POLICY "Users can delete their own pings."
ON public.pings
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    COALESCE(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN new;
END;
$$;

-- 5. Trigger to call handle_new_user on auth.users insert
-- Drop if exists to avoid errors on multiple runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Fix Notifications RLS (Enable Insert for system/triggers, usually handled by service role, but for now ensure users can read)
-- Ensure 'Users can view their own notifications' exists (already in previous migration)
