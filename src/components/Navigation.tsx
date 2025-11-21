import { Home, Bell, MessageCircle, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useChatContext } from '@/contexts/ChatContext';
import { useNotificationContext } from '@/contexts/NotificationContext';

const Navigation = () => {
  const location = useLocation();
  const { readChats } = useChatContext();
  const { unreadCount } = useNotificationContext();
  
  // Mock data - count unread chats
  const mockChats = [
    { id: '1', unread: true },
    { id: '2', unread: false },
    { id: '3', unread: false },
  ];
  const unreadChatsCount = mockChats.filter(chat => chat.unread && !readChats.has(chat.id)).length;
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: MessageCircle, label: 'Chats', path: '/chats' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (location.pathname === path) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass-strong border-t mx-4 mb-4 rounded-3xl shadow-lg">
        <div className="flex items-center justify-around px-6 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item.path)}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 rounded-2xl transition-apple ${
                  isActive
                    ? 'text-primary scale-110'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <div className="relative">
                <item.icon className="h-6 w-6" />
                {item.label === 'Chats' && unreadChatsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center font-semibold">
                    {unreadChatsCount}
                  </span>
                )}
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center font-semibold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
