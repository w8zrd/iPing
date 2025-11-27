import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './SupabaseAuthContext';
import { logger } from '@/lib/logger';
import { Profile, Notification as AppNotification } from '@/types'; // Import the updated AppNotification type

export interface Notification extends AppNotification {
  sender?: Pick<Profile, 'username' | 'avatar_url' | 'is_admin'> & { display_name?: string; verified?: boolean };
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
        id, created_at, recipient_id, type, source_id, read,
        sender:profiles (display_name, username, verified, avatar_url, is_admin),
        pings (id, content),
        comments (id, content)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching notifications', error, { userMessage: 'Failed to load notifications.' });
      setNotifications([]);
    } else {
      // Type assertion needed due to dynamic selection and structure difference
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
        filter: `recipient_id=eq.${user.id}`
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
      .update({ read: true }) // Changed is_read to read
      .eq('id', notificationId)
      .eq('recipient_id', user.id); // Changed to recipient_id

    if (error) {
      logger.error('Error marking notification as read', error, { userMessage: 'Failed to mark notification as read.' });
    } else {
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId ? { ...notification, read: true } : notification // Changed is_read to read
        )
      );
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length; // Changed is_read to read

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
