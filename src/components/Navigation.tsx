import { Home, Bell, MessageCircle, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useChatContext } from '@/providers/ChatContext';
import { useNotificationContext } from '@/providers/NotificationContext';
import { useAuth } from '@/providers/SupabaseAuthContext';

const Navigation = () => {
  const location = useLocation();
  const { chats } = useChatContext();
  const { unreadCount } = useNotificationContext();
  const { user } = useAuth(); // Get user from AuthContext
  
  const unreadChatsCount = user ? chats.filter(chat => chat.unread).length : 0;
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Bell, label: 'Notifications', path: '/notifications', requiresAuth: true },
    { icon: MessageCircle, label: 'Chats', path: '/chats', requiresAuth: true },
    { icon: User, label: 'Profile', path: '/profile', requiresAuth: true },
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
                } ${item.requiresAuth && !user ? 'opacity-50 cursor-not-allowed' : ''}`
              }
              tabIndex={item.requiresAuth && !user ? -1 : 0}
              aria-disabled={item.requiresAuth && !user}
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
