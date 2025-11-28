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

-- 4. RLS Policy for likes: Allow authenticated users to insert, delete, and read their own likes
CREATE POLICY "Users can like/unlike their own pings."
ON public.likes
FOR ALL
USING ((auth.uid() = user_id));

-- 5. RLS Policy for comments: Allow authenticated users to insert, delete, and read their own comments
CREATE POLICY "Users can comment on pings."
ON public.comments
FOR ALL
USING ((auth.uid() = user_id));

-- 6. RLS Policy for notifications: Allow authenticated users to read their own notifications
CREATE POLICY "Users can view their own notifications."
ON public.notifications
FOR SELECT
USING ((auth.uid() = user_id));

-- 7. RLS Policy for chats: Allow authenticated users to read chats they are participants of
CREATE POLICY "Users can view chats they are part of."
ON public.chats
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = chats.id AND user_id = auth.uid()));

-- 8. RLS Policy for chat_participants: Allow authenticated users to manage their own chat participation
CREATE POLICY "Users can manage their own chat participation."
ON public.chat_participants
FOR ALL
USING ((auth.uid() = user_id));