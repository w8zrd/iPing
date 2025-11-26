import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '@/providers/ChatContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/SupabaseAuthContext';

interface Chat {
  id: string;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    verified: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

const Chats = () => {
  const navigate = useNavigate();
  const {  } = useChatContext();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;

    const { data: participantsData, error } = await supabase
      .from('chat_participants')
      .select(`
        chat_id,
        chats!inner(id)
      `)
      .eq('user_id', user.id);

    if (error || !participantsData) return;

    const chatIds = participantsData.map(p => p.chat_id);
    
    const chatsWithDetails = await Promise.all(
      chatIds.map(async (chatId) => {
        // Get other participant
        const { data: otherParticipant } = await supabase
          .from('chat_participants')
          .select('user_id, profiles!chat_participants_user_id_fkey(id, username, display_name, verified)')
          .eq('chat_id', chatId)
          .neq('user_id', user.id)
          .single();

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!otherParticipant?.profiles) return null;

        return {
          id: chatId,
          other_user: otherParticipant.profiles as any,
          last_message: lastMessage || undefined,
        };
      })
    );

    setChats(chatsWithDetails.filter(Boolean) as Chat[]);
  };

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-24 animate-fade-in">
          <h1 className="text-3xl font-bold">Messages</h1>
        </div>

        <div className="glass-strong rounded-3xl shadow-md overflow-hidden">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No messages yet. Start a conversation from someone's profile!
            </div>
          ) : (
            chats.map((chat, index) => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chats/${chat.id}`)}
                className={`w-full p-4 animate-fade-in hover:bg-primary/5 transition-apple text-left ${
                  index !== chats.length - 1 ? 'border-b border-border/30' : ''
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                      {chat.other_user.display_name?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{chat.other_user.display_name}</span>
                        {chat.other_user.verified && (
                          <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                            <Check className="h-3 w-3 text-white stroke-" />
                          </div>
                        )}
                      </div>
                      {chat.last_message && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{chat.other_user.username}</p>
                    {chat.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.last_message.content}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Chats;
