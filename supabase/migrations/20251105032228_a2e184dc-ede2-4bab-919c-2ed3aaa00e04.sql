-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  verified BOOLEAN DEFAULT false,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pings table
CREATE TABLE public.pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create likes table
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ping_id UUID REFERENCES public.pings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ping_id UUID REFERENCES public.pings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Alter chats table
ALTER TABLE public.chats
ADD COLUMN chat_name TEXT,
ADD COLUMN is_group_chat BOOLEAN DEFAULT FALSE,
ADD COLUMN last_message_id UUID;

-- Alter messages table
ALTER TABLE public.messages
RENAME COLUMN user_id TO sender_id; -- Rename user_id to sender_id
ALTER TABLE public.messages
ALTER COLUMN sender_id DROP NOT NULL; -- Make sender_id nullable if needed for system messages
ALTER TABLE public.messages
DROP COLUMN status; -- Remove status column
ALTER TABLE public.messages
ADD COLUMN is_read BOOLEAN DEFAULT FALSE; -- Add is_read column
ALTER TABLE public.messages
ALTER COLUMN content SET NOT NULL; -- Ensure content is NOT NULL

-- Alter chat_participants table
ALTER TABLE public.chat_participants
ADD COLUMN last_read_at TIMESTAMPTZ;

-- Alter notifications table
ALTER TABLE public.notifications
DROP COLUMN from_user_id,
DROP COLUMN ping_id,
DROP COLUMN friend_request_id,
ADD COLUMN type TEXT, -- Adjust type to be more general
ADD COLUMN title TEXT,
ADD COLUMN content TEXT,
ADD COLUMN source_entity_id UUID,
ADD COLUMN source_entity_type TEXT;

ALTER TABLE public.notifications
ALTER COLUMN type DROP NOT NULL; -- Make type nullable for initial update, then set as NOT NULL if needed
ALTER TABLE public.notifications
ALTER COLUMN title SET NOT NULL; -- Ensure title is NOT NULL
ALTER TABLE public.notifications
ALTER COLUMN content SET NOT NULL; -- Ensure content is NOT NULL

-- Add foreign key constraint to chats.last_message_id
ALTER TABLE public.chats
ADD CONSTRAINT fk_last_message
FOREIGN KEY (last_message_id)
REFERENCES public.messages(id)
ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for pings
CREATE POLICY "Pings are viewable by everyone" ON public.pings FOR SELECT USING (true);
CREATE POLICY "Users can create their own pings" ON public.pings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pings" ON public.pings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pings" ON public.pings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can like pings" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike pings" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow others" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for friend_requests
CREATE POLICY "Users can view their own friend requests" ON public.friend_requests FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can create friend requests" ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update friend requests they received" ON public.friend_requests FOR UPDATE USING (auth.uid() = to_user_id);

-- RLS Policies for chats
CREATE POLICY "Users can view chats they're part of" ON public.chats FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = chats.id AND user_id = auth.uid()
  )
);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view chat participants" ON public.chat_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid()
  )
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Users can send messages in their chats" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();