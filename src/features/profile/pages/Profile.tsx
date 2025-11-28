import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { ArrowLeft, UserPlus, Check, Settings, Calendar, MapPin, MessageCircle, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { followUser, unfollowUser, isFollowing } from '@/api/user';
import { Skeleton } from '@/components/ui/Skeleton';

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  verified: boolean;
  location?: string;
  avatar_url?: string;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url?: string;
}

const Profile = () => {
  const { username: urlUsername } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (urlUsername) {
      fetchProfile(urlUsername);
    } else if (user) {
      fetchOwnProfile();
    }
  }, [urlUsername, user]);
  
  useEffect(() => {
    if (user && profile && user.id !== profile.id) {
      fetchIsFollowing(profile.id);
    }
  }, [profile, user]);

  const fetchProfile = async (username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (!error && data) {
      setProfile(data);
      fetchUserPosts(data.id);
      fetchFollowCounts(data.id);
    }
  };

  const fetchOwnProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setProfile(data);
      fetchUserPosts(data.id);
      fetchFollowCounts(data.id);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    const { data, error } = await supabase
      .from('pings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
  };

  const fetchFollowCounts = async (userId: string) => {
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followed_id', userId);

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };
  
  const fetchIsFollowing = async (targetUserId: string) => {
    try {
      const isCurrentlyFollowing = await isFollowing(targetUserId);
      setIsFollowingUser(isCurrentlyFollowing);
    } catch (error) {
      console.error('Error fetching following status:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch following status.',
        variant: 'destructive',
      });
    }
  };
  
  const handleFollowToggle = async () => {
    if (!user || !profile) return;

    try {
      if (isFollowingUser) {
        await unfollowUser(profile.id);
        setIsFollowingUser(false);
        setFollowersCount(c => c - 1);
        toast({
          title: 'Unfollowed!',
          description: `You are no longer following ${profile.display_name}`,
        });
      } else {
        await followUser(profile.id);
        setIsFollowingUser(true);
        setFollowersCount(c => c + 1);
        toast({
          title: 'Followed!',
          description: `You are now following ${profile.display_name}`,
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Follow/Unfollow error:', error);
      toast({
        title: 'Error',
        description: `Could not ${isFollowingUser ? 'unfollow' : 'follow'} ${profile.display_name}.`,
        variant: 'destructive',
      });
    }
  };

  const handleMessage = async () => {
    if (!user || !profile) return;
    const { data, error } = await supabase.rpc('create_direct_chat', { other_user: profile.id });
    if (!error && data) {
      navigate(`/chats/${data}`);
    }
  };

  const isOwnProfile = user?.id === profile?.id;

  if (!profile) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <Header />
        <div className="max-w-2xl mx-auto p-4">
          <div className="mb-8 pt-24 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-8 w-32" />
             </div>
          </div>

          <div className="glass-strong rounded-3xl p-6 mb-6 shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-full mb-4 rounded-full" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-6">
               <Skeleton className="h-4 w-16" />
               <Skeleton className="h-4 w-16" />
               <Skeleton className="h-4 w-16" />
            </div>
          </div>
          
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="glass rounded-3xl p-6 shadow-md">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
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
            <Avatar className="w-20 h-20 ring-4 ring-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white text-2xl font-bold">
                {profile.display_name[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <h2 className="text-xl font-bold">{profile.display_name}</h2>
                {profile.verified && (
                  <div className="flex items-center justify-center w-5 h-5 bg-primary rounded-full">
                    <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {!isOwnProfile && (
            <div className="flex gap-2 mb-4">
              <Button
                onClick={handleFollowToggle}
                variant={isFollowingUser ? "outline" : "default"}
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                {isFollowingUser ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                onClick={handleMessage}
                variant="outline"
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          )}

          {profile.bio && (
            <p className="text-sm text-foreground/90 mb-4">
              <ParsedText text={profile.bio} />
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            {profile.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-bold text-foreground">{posts.length}</span>
              <span className="text-muted-foreground ml-1">Pings</span>
            </div>
            <div>
              <span className="font-bold text-foreground">{followingCount}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold text-foreground">{followersCount}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-4">{isOwnProfile ? 'Your Pings' : `${profile.display_name}'s Pings`}</h3>
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center">
                <p className="text-muted-foreground">No pings yet</p>
              </div>
            ) : (
              posts.map((post, index) => (
                <div
                  key={post.id}
                  className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <p className="text-foreground/90 mb-2">
                    <ParsedText text={post.content} />
                  </p>
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="rounded-2xl w-full mb-2 max-h-96 object-cover"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Profile;
