import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './SupabaseAuthContext';

export interface Chat {
  id: string;
  created_at: string;
  chat_name: string | null;
  is_group_chat: boolean;
  last_message_id: string | null;
  messages?: Message[];
  participants?: ChatParticipant[];
  last_message?: Message; // For displaying in chat list
}

export interface Message {
  id: string;
  created_at: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  sender?: {
    display_name: string;
    username: string;
    verified: boolean;
    avatar_url: string;
  };
}

export interface ChatParticipant {
  id: string;
  created_at: string;
  chat_id: string;
  user_id: string;
  last_read_at: string | null;
  profiles?: {
    display_name: string;
    username: string;
    verified: boolean;
    avatar_url: string;
  };
}

interface ChatContextType {
  chats: Chat[];
  loadingChats: boolean;
  fetchChats: () => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  subscribeToChatMessages: (chatId: string, onNewMessage: (message: Message) => void) => () => void;
  createPersonalChat: (participantId: string) => Promise<Chat | null>;
  fetchChatDetails: (chatId: string) => Promise<Chat | null>;
  fetchChatMessages: (chatId: string) => Promise<Message[]>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!user) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const { data, error } = await supabase
      .from('chat_participants')
      .select(`
        last_read_at,
        chats (
          id, created_at, chat_name, is_group_chat, last_message_id,
          chat_participants (
            id, user_id,
            profiles (display_name, username, verified, avatar_url)
          ),
          last_message:messages!last_message_id (
            id, created_at, chat_id, sender_id, content, is_read,
            sender:profiles (display_name, username, verified, avatar_url)
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { foreignTable: 'chats', ascending: false });

    if (error) {
      console.error('Error fetching chats:', error.message);
      setChats([]);
    } else {
      const formattedChats: Chat[] = data.map((cp: any) => {
        const chat = cp.chats as Chat;
        return {
          ...chat,
          last_read_at: cp.last_read_at,
          unread: chat.last_message && new Date(chat.last_message.created_at) > new Date(cp.last_read_at || 0),
        };
      });
      setChats(formattedChats);
    }
    setLoadingChats(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      // If no user, clear chats and don't set up listeners
      setChats([]);
      setLoadingChats(false);
      return;
    }

    fetchChats(); // Initial fetch

    // Function to re-fetch chats on relevant changes
    const handleChatUpdate = () => {
      fetchChats();
    };

    const chatChannel = supabase.channel(`user_chats:${user.id}`);

    // Listen for changes in chat_participants relevant to the current user
    chatChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Chat participant change received!', payload);
        fetchChats(); // Re-fetch all chats if a participant record changes
      }
    );

    // Listen for updates to chats the user is part of
    // This filter will be applied dynamically based on current chats state
    // Listen for updates to chats the user is part of (any chat ID)
    chatChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chats',
        filter: `last_message_id=neq.null` // Listen for any chat updates that have a last message (i.e., active chats)
      },
      (payload) => {
        console.log('Chat update received!', payload);
        // Check if the updated chat is one the user is a participant of
        // This is a more general listener, we re-fetch to ensure data consistency
        if (chats.some(chat => chat.id === payload.new.id)) {
          handleChatUpdate();
        }
      }
    );

    // Listen for new messages in any chat the user might be a part of
    chatChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=neq.null` // Listen for any new messages
      },
      (payload) => {
        console.log('New message received!', payload);
        // Check if the new message belongs to a chat the user is a participant of
        if (chats.some(chat => chat.id === payload.new.chat_id)) {
          handleChatUpdate();
        }
      }
    );
    
    chatChannel.subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [fetchChats, user]); // Removed 'chats' from dependencies

  const markChatAsRead = async (chatId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking chat as read:', error.message);
    } else {
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId ? { ...chat, unread: false, last_read_at: new Date().toISOString() } : chat
        )
      );
    }
  };

  const sendMessage = async (chatId: string, content: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: user.id, content })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error.message);
    } else {
      // Update the last_message_id in the chats table
      await supabase
        .from('chats')
        .update({ last_message_id: data.id })
        .eq('id', chatId);
    }
  };

  const subscribeToChatMessages = (chatId: string, onNewMessage: (message: Message) => void) => {
    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMessage = payload.new as Message;
          onNewMessage(newMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createPersonalChat = async (participantId: string) => {
    if (!user) return null;

    // Check if a chat already exists between these two users
    const { data: existingChats, error: existingChatError } = await supabase
      .from('chat_participants')
      .select(`
        chat_id,
        chats!inner(id, is_group_chat, chat_participants(user_id))
      `)
      .eq('user_id', user.id);

    if (existingChatError) {
      console.error('Error checking for existing chat:', existingChatError.message);
      return null;
    }

    const existingPersonalChat = existingChats.find((cp: any) =>
      !cp.chats.is_group_chat &&
      cp.chats.chat_participants.some((p: any) => p.user_id === participantId)
    );

    if (existingPersonalChat) {
      const { data: chatData, error: fetchChatError } = await supabase
        .from('chats')
        .select(`
          id, created_at, chat_name, is_group_chat, last_message_id,
          messages (
            id, created_at, chat_id, sender_id, content, is_read,
            sender:profiles (display_name, username, verified, avatar_url)
          ),
          chat_participants (
            id, user_id,
            profiles (display_name, username, verified, avatar_url)
          )
        `)
        .eq('id', existingPersonalChat.chat_id)
        .single();
      if (fetchChatError) {
        console.error('Error fetching existing chat:', fetchChatError.message);
        return null;
      }
      return chatData;
    }

    // Create a new chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({ is_group_chat: false })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating chat:', chatError.message);
      return null;
    }

    // Add participants to the new chat
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert([
        { chat_id: newChat.id, user_id: user.id },
        { chat_id: newChat.id, user_id: participantId },
      ]);

    if (participantsError) {
      console.error('Error adding chat participants:', participantsError.message);
      // Rollback chat creation if participants fail to be added
      await supabase.from('chats').delete().eq('id', newChat.id);
      return null;
    }

    fetchChats(); // Refresh chat list
    return newChat;
  };

  const fetchChatDetails = useCallback(async (chatId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        id, created_at, chat_name, is_group_chat, last_message_id,
        chat_participants (
          id, user_id,
          profiles (display_name, username, verified, avatar_url)
        )
      `)
      .eq('id', chatId)
      .single();

    if (error) {
      console.error('Error fetching chat details:', error.message);
      return null;
    }
    return data as Chat;
  }, []);

  const fetchChatMessages = useCallback(async (chatId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, created_at, chat_id, sender_id, content, is_read,
        sender:profiles!inner (display_name, username, verified, avatar_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat messages:', error.message);
      return [];
    }
    return data as Message[];
  }, []);


  return (
    <ChatContext.Provider
      value={{
        chats,
        loadingChats,
        fetchChats,
        markChatAsRead,
        sendMessage,
        subscribeToChatMessages,
        createPersonalChat,
        fetchChatDetails,
        fetchChatMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};
