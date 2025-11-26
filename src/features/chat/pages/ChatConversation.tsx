import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Send, Image as ImageIcon, X, CheckCheck } from 'lucide-react';
import { ParsedText } from '@/lib/textParser';
import { useChatContext } from '@/providers/ChatContext';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';


const ChatConversation = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messageContent, setMessageContent] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [chat, setChat] = useState<any | null>(null);
  const { user: currentUser } = useAuth();
  const { markChatAsRead, fetchChatDetails, fetchChatMessages, sendMessage, subscribeToChatMessages } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const otherParticipant = chat?.chat_participants?.find(
    (p: { user_id: string }) => p.user_id !== currentUser?.id
  );

  const loadChatData = useCallback(() => {
    if (!chatId || !currentUser) return () => {};
    setLoading(true);
    const unsubscribeDetails = fetchChatDetails(chatId, (chatUpdate) => {
      setChat(chatUpdate);
    });

    const unsubscribeMessages = fetchChatMessages(chatId, (messagesUpdate) => {
      setMessages(messagesUpdate);
      markChatAsRead(chatId);
      setLoading(false);
    });

    return () => {
      unsubscribeDetails();
      unsubscribeMessages();
    };
  }, [chatId, currentUser, fetchChatDetails, fetchChatMessages, markChatAsRead]);

  useEffect(() => {
    const cleanupLoadChatData = loadChatData();

    const unsubscribe = subscribeToChatMessages(chatId!, (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      markChatAsRead(chatId!);
    });

    return () => {
      cleanupLoadChatData();
      unsubscribe();
    };
  }, [chatId, currentUser, subscribeToChatMessages, loadChatData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatImage(reader.result as string);
        logger.debug('Image loaded for preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((messageContent.trim() || chatImage) && chatId) {
      logger.debug('Sending message', { chatId, hasContent: !!messageContent, hasImage: !!chatImage });
      try {
        await sendMessage(chatId, messageContent);
        setMessageContent('');
        setChatImage(null);
      } catch (error) {
        logger.error('Failed to send message', error);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate('/chats')}
            className="p-2 rounded-full transition-colors text-muted-foreground hover:bg-background/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold flex items-center justify-center">
                {chat.user.displayName[0]?.toUpperCase()}
              </div>
              {(chat.user.username === 'alex' || chat.user.username === 'mike') && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{chat.user.displayName}</span>
                {chat.user.verified && (
                  <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                    <Check className="h-3 w-3 text-white stroke-[3]" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>@{chat.user.username}</span>
                <span>•</span>
                {(chat.user.username === 'alex' || chat.user.username === 'mike') ? (
                  <span className="text-green-500 font-medium">Online</span>
                ) : (
                  <span>Last seen 2h ago</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 pt-20 pb-32 px-4 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  msg.sender_id === currentUser?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-strong'
                }`}
              >
                {msg.content && (
                  <p className="text-sm">
                    <ParsedText text={msg.content} />
                  </p>
                )}
                {/* Image handling to be implemented separately */}
                {/* {msg.image && (
                  <img
                    src={msg.image}
                    alt="Chat image"
                    className="rounded-xl max-w-full mt-2"
                  />
                )} */}
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-xs opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.sender_id === currentUser?.id && (
                    <span className={`${msg.is_read ? 'text-green-400' : 'text-primary-foreground'}`}>
                      {msg.is_read ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
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
              <button
                type="button"
                className="rounded-full h-11 w-11 border border-border/50 bg-background/50 hover:bg-background/80 transition-apple flex items-center justify-center"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                }}
              >
                <ImageIcon className="h-5 w-5" />
              </button>
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl p-2 bg-transparent focus:outline-none border border-border/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              className="rounded-full h-11 w-11 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={!messageContent.trim() && !chatImage}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatConversation;
