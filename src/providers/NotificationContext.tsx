import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './SupabaseAuthContext';
import { logger } from '@/lib/logger';

export interface Notification {
  id: string;
  created_at: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'friend_request';
  source_id: string; // ID of the post, comment, or user that triggered the notification
  is_read: boolean;
  sender?: {
    display_name: string;
    username: string;
    verified: boolean;
    avatar_url: string;
  };
  pings?: {
    id: string;
    content: string;
  };
  comments?: {
    id: string;
    content: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  loadingNotifications: boolean;
  unreadCount: number;
  fetchNotifications: () => Promise<void>; // Make fetchNotifications available in context
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoadingNotifications(false);
      return;
    }

    setLoadingNotifications(true);
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id, created_at, user_id, type, source_id, is_read,
        sender:profiles (display_name, username, verified, avatar_url),
        pings (id, content),
        comments (id, content)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching notifications', error, { userMessage: 'Failed to load notifications.' });
      setNotifications([]);
    } else {
      setNotifications(data as unknown as Notification[]);
    }
    setLoadingNotifications(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoadingNotifications(false);
      return;
    }

    fetchNotifications();

    const notificationChannel = supabase.channel(`user_notifications:${user.id}`);

    notificationChannel.on(
      'postgres_changes',
      {
        event: '*', // Listen for INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Notification change received!', payload);
        fetchNotifications();
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [user, fetchNotifications]);

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error marking notification as read', error, { userMessage: 'Failed to mark notification as read.' });
    } else {
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, loadingNotifications, unreadCount, fetchNotifications, markNotificationAsRead }}>
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
