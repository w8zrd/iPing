CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_name TEXT,
    is_group_chat BOOLEAN DEFAULT FALSE,
    last_message_id UUID
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_id UUID REFERENCES chats(id),
    sender_id UUID REFERENCES auth.users(id),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    chat_id UUID REFERENCES chats(id),
    user_id UUID REFERENCES auth.users(id),
    last_read_at TIMESTAMPTZ
);