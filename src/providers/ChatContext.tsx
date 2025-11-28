import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './SupabaseAuthContext';
import { logger } from '@/lib/logger';
import { Chat, Message, ChatParticipant } from '@/types'; // Import types from central types file

interface ChatContextType {
  chats: Chat[];
  loadingChats: boolean;
  fetchChats: () => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  subscribeToChatMessages: (chatId: string, onNewMessage: (message: Message) => void) => () => void;
  createPersonalChat: (participantId: string) => Promise<Chat | null>;
  fetchChatDetails: (chatId: string, onUpdate: (chat: Chat) => void) => () => void;
  fetchChatMessages: (chatId: string, onUpdate: (messages: Message[]) => void) => () => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

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
      logger.error('Error fetching chats', error, { userMessage: 'Failed to load chats.' });
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

  const updateChatList = useCallback((newMessage: Message) => {
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(chat => chat.id === newMessage.chat_id);
      if (chatIndex === -1) {
        return prevChats;
      }
      const updatedChats = [...prevChats];
      const chatToUpdate = updatedChats[chatIndex];
      const lastMessage = {
        ...newMessage,
        sender: newMessage.sender,
      };
      const isUnread = chatToUpdate.last_read_at ? new Date(lastMessage.created_at) > new Date(chatToUpdate.last_read_at) : true;
      updatedChats[chatIndex] = {
        ...chatToUpdate,
        last_message: lastMessage,
        last_message_id: newMessage.id,
        unread: isUnread,
      };
      return updatedChats.sort((a, b) => {
        if (!a.last_message) return 1;
        if (!b.last_message) return -1;
        return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
      });
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    fetchChats();

    const chatChannel = supabase.channel(`user_chats:${user.id}`);

    chatChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        logger.debug('Chat participant change received, refetching chats', { payload });
        fetchChats();
      }
    );
    
    chatChannel.on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          logger.debug('New message received, updating chat list', { payload });
          updateChatList(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [user, fetchChats, updateChatList]);

  const markChatAsRead = async (chatId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error marking chat as read', error, { userMessage: 'Failed to mark chat as read.' });
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
      logger.error('Error sending message', error, { userMessage: 'Failed to send message.' });
    } else {
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

  const createPersonalChat = async (participantId: string): Promise<Chat | null> => {
    if (!user) return null;

    const { data: rpcData, error: rpcError } = await supabase.rpc('create_personal_chat', {
        p_user_id: participantId
    });

    if (rpcError) {
      logger.error('Error creating or fetching personal chat', rpcError, { userMessage: 'Could not start chat.' });
      return null;
    }
    
    if (rpcData && rpcData.length > 0) {
        const chatId = rpcData.id;
        const { data: chatData, error: fetchChatError } = await supabase
            .from('chats')
            .select(`
                id, created_at, chat_name, is_group_chat, last_message_id,
                messages (
                    id, created_at, chat_id, sender_id, content, is_read,
                    sender:profiles!inner(display_name, username, verified, avatar_url)
                ),
                chat_participants (
                    id, user_id,
                    profiles (display_name, username, verified, avatar_url)
                )
            `)
            .eq('id', chatId)
            .single();

        if (fetchChatError) {
            logger.error('Error fetching newly created or existing chat', fetchChatError);
            return null;
        }
        return chatData as unknown as Chat;
    }
    return null;
  };

  const fetchChatDetails = useCallback((chatId: string, onUpdate: (chat: Chat) => void) => {
    const chatChannel = supabase.channel(`chat_details:${chatId}`);

    const handleChatUpdate = async () => {
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
        logger.error('Error fetching chat details', error, { userMessage: 'Failed to fetch chat details.' });
        return;
      }
      onUpdate(data as Chat);
    };

    chatChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `chat_id=eq.${chatId}`
      },
      handleChatUpdate
    ).subscribe();
    
    handleChatUpdate();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, []);

  const fetchChatMessages = useCallback((chatId: string, onUpdate: (messages: Message[]) => void) => {
    const messagesChannel = supabase.channel(`chat_messages:${chatId}`);

    const handleMessageUpdate = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, created_at, chat_id, sender_id, content, is_read,
          sender:profiles!inner (display_name, username, verified, avatar_url)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching chat messages', error, { userMessage: 'Failed to fetch chat messages.' });
        onUpdate([]);
        return;
      }
      onUpdate(data as unknown as Message[]);
    };

    messagesChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      handleMessageUpdate
    ).subscribe();

    handleMessageUpdate();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
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
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};