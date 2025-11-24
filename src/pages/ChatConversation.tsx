import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Send, Image as ImageIcon, X, CheckCheck } from 'lucide-react';
import { ParsedText } from '@/lib/textParser';
import { useChatContext } from '@/contexts/ChatContext';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  image?: string;
  status?: 'sent' | 'delivered' | 'seen';
}

const mockMessages: Message[] = [
  {
    id: '1',
    senderId: 'alex',
    text: 'Hey! Thanks for connecting! Love your pings about #design 🎨',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: '2',
    senderId: 'me',
    text: 'Of course! Happy to connect @alex',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: 'delivered',
  },
  {
    id: '3',
    senderId: 'alex',
    text: 'Thanks for the ping! Really appreciate it 🙏 Check out #iPing',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '4',
    senderId: 'me',
    text: 'Awesome! 🚀',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    status: 'seen',
  },
];

const ChatConversation = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages] = useState<Message[]>(mockMessages);
  const [chatImage, setChatImage] = useState<string | null>(null);
  const { markChatAsRead } = useChatContext();

  useEffect(() => {
    if (chatId) {
      markChatAsRead(chatId);
    }
  }, [chatId, markChatAsRead]);

  // Mock chat data mapped by ID
  const mockChats: Record<string, { user: { username: string; displayName: string; verified: boolean } }> = {
    '1': { user: { username: 'alex', displayName: 'Alex Chen', verified: true } },
    '2': { user: { username: 'sarah', displayName: 'Sarah Johnson', verified: false } },
    '3': { user: { username: 'mike', displayName: 'Mike Davis', verified: true } },
  };

  const chat = mockChats[chatId || '1'] || mockChats['1'];

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

  const handleSend = () => {
    if (message.trim() || chatImage) {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: 'me',
        text: message,
        timestamp: new Date(),
        status: 'sent',
        ...(chatImage && { image: chatImage })
      };
      
      // Update messages array with the new message
      const updatedMessages = [...messages, newMessage];
      
      // Simulate delivery after 1 second
      setTimeout(() => {
        const deliveredMessages = updatedMessages.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'delivered' as const } : msg
        );
        // In real app, this would update state
      }, 1000);
      
      setMessage('');
      setChatImage(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                  {chat.user.displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
              className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  msg.senderId === 'me'
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-strong'
                }`}
              >
                {msg.text && (
                  <p className="text-sm">
                    <ParsedText text={msg.text} />
                  </p>
                )}
                {msg.image && (
                  <img 
                    src={msg.image} 
                    alt="Chat image" 
                    className="rounded-xl max-w-full mt-2"
                  />
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-xs opacity-70">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.senderId === 'me' && msg.status && (
                    <span className={`${msg.senderId === 'me' ? 'text-primary-foreground' : ''}`}>
                      {msg.status === 'sent' && <Check className="h-3 w-3" />}
                      {msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                      {msg.status === 'seen' && <CheckCheck className="h-3 w-3 text-green-400" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
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
              disabled={!message.trim() && !chatImage}
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
