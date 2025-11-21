import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, UserPlus, Check, Settings, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParsedText } from '@/lib/textParser';

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  verified: boolean;
  location: string;
  followsBack: boolean;
  isActive: boolean;
  posts: Array<{
    id: string;
    text: string;
    timestamp: Date;
  }>;
}

const mockUsers: { [key: string]: UserProfile } = {
  you: {
    username: 'you',
    displayName: 'You',
    bio: 'Living my best life on iPing ✨ #blessed',
    verified: false,
    location: 'San Francisco',
    followsBack: false,
    isActive: true,
    posts: [
      {
        id: '1',
        text: 'Just posted my first ping! Excited to be here 🎉 #NewUser #iPing',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        id: '2',
        text: 'Loving the clean design and smooth animations. Thanks @alex for the welcome!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
    ],
  },
  alex: {
    username: 'alex',
    displayName: 'Alex Chen',
    bio: 'Design enthusiast 🎨 | Apple fanatic | Building beautiful things #design #tech',
    verified: true,
    location: 'New York',
    followsBack: true,
    isActive: true,
    posts: [
      {
        id: '1',
        text: 'Loving the new iPing design! 🎨 The glass effects are absolutely stunning. #design #UI',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
      },
    ],
  },
  sarah: {
    username: 'sarah',
    displayName: 'Sarah Johnson',
    bio: 'Tech lover | iOS developer | Coffee addict ☕ #coding #swift',
    verified: false,
    location: 'Seattle',
    followsBack: false,
    isActive: false,
    posts: [
      {
        id: '1',
        text: 'Just discovered this amazing new social platform. The Apple aesthetic is 👌 cc: @mike #iPing',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
      },
    ],
  },
  mike: {
    username: 'mike',
    displayName: 'Mike Davis',
    bio: 'Early adopter | Product designer | Making the web beautiful #ProductDesign #UX',
    verified: true,
    location: 'Los Angeles',
    followsBack: true,
    isActive: true,
    posts: [
      {
        id: '1',
        text: 'Anyone else here from the early days? This feels like the future of social media. #SocialMedia #Tech',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
    ],
  },
};

const Profile = () => {
  const { username: urlUsername } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [urlUsername]);
  const [friendRequested, setFriendRequested] = useState(false);
  const { toast } = useToast();

  const currentUsername = urlUsername || 'you';
  const isOwnProfile = currentUsername === 'you';
  const userProfile = mockUsers[currentUsername] || mockUsers.you;

  const handleFriendRequest = () => {
    setFriendRequested(true);
    toast({
      title: 'Friend request sent!',
      description: `Request sent to ${userProfile.displayName}`,
    });
  };

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-24 animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isOwnProfile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-3xl font-bold">Profile</h1>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full transition-colors text-muted-foreground hover:text-foreground active:text-primary"
            >
              <Settings className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="glass-strong rounded-3xl p-6 mb-6 shadow-lg animate-scale-in">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white text-2xl font-bold">
                  {userProfile.displayName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isOwnProfile && userProfile.followsBack && userProfile.isActive && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <h2 className="text-xl font-bold">{userProfile.displayName}</h2>
                {userProfile.verified && (
                  <div className="flex items-center justify-center w-5 h-5 bg-primary rounded-full">
                    <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{userProfile.username}</p>
            </div>
          </div>

          {!isOwnProfile && (
            <div className="flex gap-2 mb-4">
              <Button
                onClick={handleFriendRequest}
                disabled={friendRequested}
                variant={friendRequested ? "outline" : "default"}
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {friendRequested ? 'Request Sent' : 'Add Friend'}
              </Button>
              <Button
                onClick={() => navigate(`/chat/${userProfile.username}`)}
                variant="outline"
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                Message
              </Button>
            </div>
          )}

          <p className="text-sm text-foreground/90 mb-4">
            <ParsedText text={userProfile.bio} />
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Joined March 2024</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{userProfile.location}</span>
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-bold text-foreground">{userProfile.posts.length}</span>
              <span className="text-muted-foreground ml-1">Pings</span>
            </div>
            <div>
              <span className="font-bold text-foreground">284</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold text-foreground">1.2K</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-4">{isOwnProfile ? 'Your Pings' : `${userProfile.displayName}'s Pings`}</h3>
          <div className="space-y-4">
            {userProfile.posts.map((post, index) => (
              <div
                key={post.id}
                className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <p className="text-foreground/90 mb-2">
                  <ParsedText text={post.text} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {post.timestamp.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Profile;
