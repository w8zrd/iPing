import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '@/providers/NotificationContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'friend_request' | 'follow';
  user: {
    username: string;
    displayName: string;
    verified: boolean;
  };
  text: string;
  timestamp: Date;
  read: boolean;
  postId?: string;
  commentId?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    user: { username: 'alex', displayName: 'Alex Chen', verified: true },
    text: 'liked your ping',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
    postId: 'post-1',
  },
  {
    id: '2',
    type: 'friend_request',
    user: { username: 'sarah', displayName: 'Sarah Johnson', verified: false },
    text: 'sent you a friend request',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: '3',
    type: 'comment',
    user: { username: 'mike', displayName: 'Mike Davis', verified: true },
    text: 'commented on your ping',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: true,
    postId: 'post-2',
    commentId: 'comment-1',
  },
];

const Notifications = () => {
  const navigate = useNavigate();
  const { markNotificationAsRead } = useNotificationContext();
  const { toast } = useToast();
  const [friendRequestActions, setFriendRequestActions] = useState<Record<string, 'accepted' | 'rejected'>>({});

  useEffect(() => {
    // Mark all visible notifications as read when page loads
    mockNotifications.forEach(notif => {
      if (!notif.read) {
        markNotificationAsRead(notif.id);
      }
    });
  }, [markNotificationAsRead]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
      case 'friend_request':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    
    if (notification.type === 'like' && notification.postId) {
      navigate(`/?post=${notification.postId}`);
    } else if (notification.type === 'comment' && notification.postId) {
      navigate(`/?post=${notification.postId}&openComments=true`);
    } else if (notification.type === 'friend_request' || notification.type === 'follow') {
      navigate(`/profile/${notification.user.username}`);
    }
  };

  const handleFriendRequest = (notificationId: string, action: 'accepted' | 'rejected', displayName: string) => {
    setFriendRequestActions(prev => ({ ...prev, [notificationId]: action }));
    markNotificationAsRead(notificationId);
    
    // Simulate notification to the other user
    toast({
      title: action === 'accepted' ? 'Friend request accepted' : 'Friend request declined',
      description: `${displayName} will be notified about your response`,
    });
  };

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-24 animate-fade-in">
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        <div className="glass-strong rounded-3xl shadow-md overflow-hidden">
          {mockNotifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`p-4 animate-fade-in border-b border-border/30 last:border-b-0 ${
                !notification.read ? 'bg-primary/5' : ''
              } ${notification.type === 'friend_request' ? '' : 'cursor-pointer hover:bg-primary/5 transition-apple'}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => notification.type !== 'friend_request' && handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                      {notification.user.displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                    {getIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{notification.user.displayName}</span>
                    {notification.user.verified && (
                      <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                        <Check className="h-3 w-3 text-white stroke-[3]" />
                      </div>
                    )}
                    <span className="text-muted-foreground text-sm">
                      @{notification.user.username}
                    </span>
                  </div>
                  {notification.type === 'friend_request' && friendRequestActions[notification.id] ? (
                    <>
                      <p className="text-sm text-foreground/80">
                        You {friendRequestActions[notification.id]} @{notification.user.username}'s friend request
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-foreground/80">{notification.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.timestamp.toLocaleString()}
                      </p>
                      
                      {notification.type === 'friend_request' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFriendRequest(notification.id, 'accepted', notification.user.displayName);
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFriendRequest(notification.id, 'rejected', notification.user.displayName);
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Notifications;
