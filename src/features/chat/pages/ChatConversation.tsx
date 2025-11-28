import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft, Check, Send, Image as ImageIcon, X, CheckCheck } from 'lucide-react';
import { ParsedText } from '@/lib/textParser';
import { useChatContext } from '@/providers/ChatContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/SupabaseAuthContext';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  status: string;
}

interface OtherUser {
  id: string;
  username: string;
  display_name: string;
  verified: boolean;
}

const ChatConversation = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [chatImage, setChatImage] = useState<string | null>(null);
  const { markChatAsRead } = useChatContext();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId && user) {
      markChatAsRead(chatId);
      fetchChatData();
      fetchMessages();
    }
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId) return;
    
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatData = async () => {
    if (!chatId || !user) return;

    const { data } = await supabase
      .from('chat_participants')
      .select('user_id, profiles!chat_participants_user_id_fkey(id, username, display_name, verified)')
      .eq('chat_id', chatId)
      .neq('user_id', user.id)
      .single();

    if (data?.profiles) {
      setOtherUser(data.profiles as any);
    }
  };

  const fetchMessages = async () => {
    if (!chatId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !chatId || !user) return;

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      user_id: user.id,
      content: message,
      status: 'sent',
    });

    if (!error) {
      setMessage('');
      setChatImage(null);
      fetchMessages();
    }
  };

  if (!otherUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chats')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                {otherUser.display_name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{otherUser.display_name}</span>
                {otherUser.verified && (
                  <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                    <Check className="h-3 w-3 text-white stroke-[3]" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>@{otherUser.username}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20 pb-32 px-4 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  msg.user_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-strong'
                }`}
              >
                <p className="text-sm">
                  <ParsedText text={msg.content} />
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-xs opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.user_id === user?.id && msg.status && (
                    <span>
                      {msg.status === 'sent' && <Check className="h-3 w-3" />}
                      {msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                      {msg.status === 'seen' && <CheckCheck className="h-3 w-3 text-green-400" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="glass-strong border-t mx-4 mb-4 rounded-3xl p-4">
          {chatImage && (
            <div className="relative mb-3">
              <img src={chatImage} alt="Upload preview" className="rounded-2xl max-h-40 w-auto" />
              <button
                onClick={() => setChatImage(null)}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-apple"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <label className="shrink-0">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full h-11 w-11"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                }}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="rounded-full h-11 w-11 shrink-0"
              disabled={!message.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatConversation;
