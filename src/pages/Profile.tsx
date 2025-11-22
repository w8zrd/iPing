import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, UserPlus, Check, Settings, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import NotFound from '@/pages/NotFound';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

// Supabase Data Types
type SupabasePost = {
  id: string;
  content: string;
  created_at: string;
};

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  verified: boolean;
  location: string | null;
  created_at: string;
}

interface UserProfile extends ProfileData {
  posts: SupabasePost[];
}

// Define a default profile for loading states or errors
const DEFAULT_PROFILE: UserProfile = {
  id: '0',
  username: 'error',
  display_name: 'Error Loading User',
  bio: 'Profile data could not be fetched.',
  verified: false,
  location: null,
  created_at: new Date().toISOString(),
  posts: [],
};

const Profile = () => {
  const { username: urlUsername } = useParams();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendRequested, setFriendRequested] = useState(false);
  const { toast } = useToast();

  const isOwnProfile = !urlUsername;

  useEffect(() => {
    if (authLoading) return;
    
    const targetUsername = urlUsername || authUser?.user_metadata.username as string;

    const fetchProfile = async (targetUser: string) => {
      setLoading(true);
      
      // 1. Fetch Profile Data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`id, username, display_name, bio, verified, location, created_at`)
        .eq('username', targetUser)
        .single();
        
      if (profileError || !profileData) {
        console.error('Error fetching profile or profile not found:', profileError);
        setUserProfile(null);
        setLoading(false);
        return;
      }
      
      // 2. Fetch User Posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`id, content, created_at`)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (postsError) {
         console.error('Error fetching posts:', postsError);
         // Continue with profile data but empty posts
      }

      setUserProfile({
        ...profileData,
        posts: postsData || [],
      } as UserProfile);
      setLoading(false);
    };

    if (targetUsername) {
      fetchProfile(targetUsername);
    } else if (isOwnProfile && authUser) {
        // If logged in but username not in URL, use auth user's username
        fetchProfile(authUser.user_metadata.username as string);
    } else if (!isOwnProfile && !urlUsername) {
        // Should not happen if protected route works
        setUserProfile(null);
        setLoading(false);
    } else if (isOwnProfile && !authUser) {
        navigate('/auth'); // Must be logged in to view own profile
    }

  }, [urlUsername, authLoading, authUser, navigate, isOwnProfile]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const profile = userProfile || DEFAULT_PROFILE;
  
  // If we couldn't load a profile, and we are done loading, show not found.
  if (!userProfile && !loading && !authLoading) {
    return <NotFound />;
  }

  const handleFriendRequest = () => {
    setFriendRequested(true);
    toast({
      title: 'Friend request sent!',
      description: `Request sent to ${profile.display_name}`,
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
                  {profile.display_name[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Removed userProfile.followsBack and isActive checks as they require more complex Supabase queries */}
            </div>
            
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
                onClick={handleFriendRequest}
                disabled={friendRequested}
                variant={friendRequested ? "outline" : "default"}
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {friendRequested ? 'Request Sent' : 'Add Friend'}
              </Button>
              <Button
                onClick={() => navigate(`/chats/${profile.username}`)}
                variant="outline"
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                Message
              </Button>
            </div>
          )}

          <p className="text-sm text-foreground/90 mb-4">
            <ParsedText text={profile.bio || 'No bio provided.'} />
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{profile.location || 'Unknown'}</span>
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-bold text-foreground">{profile.posts.length}</span>
              <span className="text-muted-foreground ml-1">Pings</span>
            </div>
            <div>
              <span className="font-bold text-foreground">0</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold text-foreground">0</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-4">{isOwnProfile ? 'Your Pings' : `${profile.display_name}'s Pings`}</h3>
          <div className="space-y-4">
            {profile.posts.map((post, index) => (
              <div
                key={post.id}
                className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <p className="text-foreground/90 mb-2">
                  <ParsedText text={post.content} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleString()}
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
