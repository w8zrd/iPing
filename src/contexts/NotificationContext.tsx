import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NotificationContextType {
  readNotifications: Set<string>;
  markNotificationAsRead: (notificationId: string) => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('readNotifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(readNotifications)));
  }, [readNotifications]);

  const markNotificationAsRead = (notificationId: string) => {
    setReadNotifications((prev) => new Set(prev).add(notificationId));
  };

  // Mock unread count - in real app, this would come from backend
  const unreadCount = 2 - readNotifications.size;

  return (
    <NotificationContext.Provider value={{ readNotifications, markNotificationAsRead, unreadCount: Math.max(0, unreadCount) }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};
