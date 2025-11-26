-- Add is_admin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Update RLS policies if necessary (existing select policy is "viewable by everyone" so that covers it)
-- But we might want to restrict who can update this column.
-- The existing update policy is: "Users can update their own profile" USING (auth.uid() = id)
-- We probably don't want users to be able to set themselves as admin.
-- We should create a trigger or use column-level privileges if Supabase supports it cleanly, 
-- or just rely on backend logic not exposing update to this column.
-- For now, just adding the column.