import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Check, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Notification, useNotificationContext } from '@/providers/NotificationContext';
import { logger } from '@/lib/logger';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loadingNotifications, markNotificationAsRead, fetchNotifications } = useNotificationContext();
  const { toast } = useToast();
  const [friendRequestActions, setFriendRequestActions] = useState<Record<string, 'accepted' | 'rejected'>>({});

  useEffect(() => {
    fetchNotifications(); // Initial fetch and subscription
  }, [fetchNotifications]);

  // Mark notifications as read when they are viewed
  useEffect(() => {
    if (!loadingNotifications && notifications.length > 0) {
      notifications.filter(n => !n.is_read).forEach(notif => {
        markNotificationAsRead(notif.id);
      });
    }
  }, [notifications, loadingNotifications, markNotificationAsRead]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'mention':
        return <MessageCircle className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    logger.debug('Notification clicked', { notificationId: notification.id, type: notification.type });
    markNotificationAsRead(notification.id);
    
    if (notification.type === 'like' && notification.pings?.id) {
      navigate(`/post/${notification.pings.id}`);
    } else if (notification.type === 'comment' && notification.pings?.id) {
      navigate(`/post/${notification.pings.id}?openComments=true`);
    } else if (notification.type === 'follow' && notification.sender?.username) {
      navigate(`/profile/${notification.sender.username}`);
    } else if (notification.type === 'mention' && notification.pings?.id) {
      navigate(`/post/${notification.pings.id}?highlightComment=${notification.comments?.id}`);
    }
  };

  const handleFriendRequest = (notificationId: string, action: 'accepted' | 'rejected', senderUsername: string) => {
    setFriendRequestActions(prev => ({ ...prev, [notificationId]: action }));
    markNotificationAsRead(notificationId);
    
    // TODO: Implement actual backend call to accept/reject friend request (e.g., call a Supabase function)
    toast({
      title: action === 'accepted' ? 'Friend request accepted' : 'Friend request declined',
      description: `@${senderUsername} will be notified about your response`,
    });
  };

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-32 animate-fade-in">
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        {loadingNotifications ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="glass-strong rounded-3xl shadow-md overflow-hidden">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`p-4 animate-fade-in border-b border-border/30 last:border-b-0 ${
                  !notification.is_read ? 'bg-primary/5' : ''
                } ${notification.type === 'friend_request' ? '' : 'cursor-pointer hover:bg-primary/5 transition-apple'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => notification.type !== 'friend_request' && handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold flex items-center justify-center">
                      {notification.sender?.display_name ? notification.sender.display_name?.toUpperCase() : '?'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      {getIcon(notification.type)}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{notification.sender?.display_name || 'Unknown User'}</span>
                      {notification.sender?.verified && (
                        <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-white stroke-" />
                        </div>
                      )}
                      <span className="text-muted-foreground text-sm">
                        @{notification.sender?.username || 'unknown'}
                      </span>
                    </div>
                    {notification.type === 'friend_request' && friendRequestActions[notification.id] ? (
                      <>
                        <p className="text-sm text-foreground/80">
                          You {friendRequestActions[notification.id]} @{notification.sender?.username || 'unknown'}'s friend request
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-foreground/80">
                          {notification.type === 'like' && notification.pings?.content
                            ? `liked your ping: "${notification.pings.content}"`
                            : notification.type === 'comment' && notification.comments?.content
                            ? `commented on your ping: "${notification.comments.content}"`
                            : notification.type === 'follow'
                            ? `started following you`
                            : notification.type === 'mention' && notification.pings?.content
                            ? `mentioned you in a ping: "${notification.pings.content}"`
                            : `New ${notification.type} notification`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                        
                        {notification.type === 'friend_request' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFriendRequest(notification.id, 'accepted', notification.sender?.username || 'unknown');
                              }}
                              className="h-8 px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFriendRequest(notification.id, 'rejected', notification.sender?.username || 'unknown');
                              }}
                              className="h-8 px-4 py-2 text-sm font-medium rounded-full border border-border/50 bg-background/50 hover:bg-background/80"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Notifications;
