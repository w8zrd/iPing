import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '@/contexts/ChatContext';

interface Chat {
  id: string;
  user: {
    username: string;
    displayName: string;
    verified: boolean;
  };
  lastMessage: string;
  timestamp: Date;
  unread: boolean;
}

const mockChats: Chat[] = [
  {
    id: '1',
    user: { username: 'alex', displayName: 'Alex Chen', verified: true },
    lastMessage: 'Thanks for the ping! Really appreciate it 🙏',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    unread: true,
  },
  {
    id: '2',
    user: { username: 'sarah', displayName: 'Sarah Johnson', verified: false },
    lastMessage: 'Hey! How are you doing?',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    unread: false,
  },
  {
    id: '3',
    user: { username: 'mike', displayName: 'Mike Davis', verified: true },
    lastMessage: 'Did you see the new features?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    unread: false,
  },
];

const Chats = () => {
  const navigate = useNavigate();
  const { readChats } = useChatContext();

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-24 animate-fade-in">
          <h1 className="text-3xl font-bold">Messages</h1>
        </div>

        <div className="glass-strong rounded-3xl shadow-md overflow-hidden">
          {mockChats.map((chat, index) => (
            <button
              key={chat.id}
              onClick={() => navigate(`/chats/${chat.id}`)}
              className={`w-full p-4 animate-fade-in hover:bg-primary/5 transition-apple text-left ${
                !readChats.has(chat.id) && chat.unread ? 'bg-primary/5' : ''
              } ${index !== mockChats.length - 1 ? 'border-b border-border/30' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                      {chat.user.displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {(chat.user.username === 'alex' || chat.user.username === 'mike') && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{chat.user.displayName}</span>
                      {chat.user.verified && (
                        <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">@{chat.user.username}</p>
                  <p className={`text-sm truncate ${!readChats.has(chat.id) && chat.unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {chat.lastMessage}
                  </p>
                </div>

                {!readChats.has(chat.id) && chat.unread && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Chats;
