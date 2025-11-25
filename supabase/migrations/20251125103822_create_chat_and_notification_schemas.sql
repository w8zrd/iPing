-- Create chats table
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_name TEXT,
    is_group_chat BOOLEAN DEFAULT FALSE,
    last_message_id UUID
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_id UUID REFERENCES public.chats(id),
    sender_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE
);

-- Add foreign key constraint for last_message_id in chats table after messages table is created
ALTER TABLE public.chats
ADD CONSTRAINT fk_last_message
FOREIGN KEY (last_message_id) REFERENCES public.messages(id);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_id UUID REFERENCES public.chats(id),
    user_id UUID REFERENCES auth.users(id),
    last_read_at TIMESTAMPTZ
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    source_entity_id UUID,
    source_entity_type TEXT
);

-- Enable Row Level Security (RLS) for new tables
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for chats table
CREATE POLICY "Allow authenticated users to view their chats" ON public.chats
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.chats.id AND user_id = auth.uid())
);

CREATE POLICY "Allow authenticated users to create chats" ON public.chats
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.chats.id AND user_id = auth.uid())
);

-- Create policies for messages table
CREATE POLICY "Allow authenticated users to view messages in their chats" ON public.messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.messages.chat_id AND user_id = auth.uid())
);

CREATE POLICY "Allow authenticated users to send messages to their chats" ON public.messages
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.messages.chat_id AND user_id = auth.uid()) AND sender_id = auth.uid()
);

-- Create policies for chat_participants table
CREATE POLICY "Allow authenticated users to view their chat participants" ON public.chat_participants
FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chat_participants cp2 WHERE cp2.chat_id = public.chat_participants.chat_id AND cp2.user_id = auth.uid()));

CREATE POLICY "Allow authenticated users to manage their chat participants" ON public.chat_participants
FOR INSERT WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chat_participants cp2 WHERE cp2.chat_id = public.chat_participants.chat_id AND cp2.user_id = auth.uid()));

CREATE POLICY "Allow authenticated users to update their chat participants (e.g., last_read_at)" ON public.chat_participants
FOR UPDATE USING (user_id = auth.uid());

-- Create policies for notifications table
CREATE POLICY "Allow authenticated users to view their notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow authenticated users to dismiss their notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());