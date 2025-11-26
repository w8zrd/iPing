import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, UserPlus, Check, Settings, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import NotFound from '@/pages/error/NotFound';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/SupabaseAuthContext';
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
  is_following: boolean; // Indicates if the current user is following this profile
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
  is_following: false,
};

const Profile = () => {
  const { username: urlUsername } = useParams();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  console.log('Profile component mounted, urlUsername:', urlUsername);

  console.log('Profile component mounted, urlUsername:', urlUsername);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isOwnProfile = authUser?.user_metadata.username === urlUsername;

  useEffect(() => {
    console.log('Profile useEffect triggered.');
    if (authLoading) return;
    
    const targetUsername = urlUsername || (authUser?.user_metadata?.username as string);
    console.log('Profile.tsx: targetUsername derived:', targetUsername);

   const fetchProfile = async (targetUser: string) => {
     setLoading(true);
     console.log('Profile.tsx: Attempting to fetch profile for:', targetUser);
     
     // 1. Fetch Profile Data
     console.log('Profile.tsx: Fetching profile data for:', targetUser);
     const { data: profileData, error: profileError } = await supabase
       .from('profiles')
       .select(`id, username, display_name, bio, verified, location, created_at`)
       .eq('username', targetUser)
       .single();
       
     if (profileError) {
       console.error('Profile.tsx: Error fetching profile:', profileError);
       setUserProfile(null);
       setLoading(false);
       return;
     }
     if (!profileData) {
       console.warn('Profile.tsx: No profile data found for:', targetUser);
       setUserProfile(null);
       setLoading(false);
       return;
     }
     console.log('Profile.tsx: Successfully fetched profileData:', profileData);
     
     // 2. Fetch User Pings
     console.log('Profile.tsx: Fetching posts for user ID:', profileData.id);
     const { data: postsData, error: postsError } = await supabase
       .from('pings')
       .select(`id, content, created_at`)
       .eq('user_id', profileData.id)
       .order('created_at', { ascending: false });

     if (postsError) {
        console.error('Profile.tsx: Error fetching posts:', postsError);
        // Continue with profile data but empty posts
     }
     console.log('Profile.tsx: Posts fetched:', postsData);

     // 3. Check if authUser is following this profile
     let isFollowing = false;
     if (authUser && authUser.id !== profileData.id) {
       console.log('Profile.tsx: Checking follow status from', authUser.id, 'to', profileData.id);
       const { count, error: followError } = await supabase
         .from('follows')
         .select('*', { count: 'exact' })
         .eq('follower_id', authUser.id)
         .eq('following_id', profileData.id);

       if (followError) {
         console.error('Profile.tsx: Error checking follow status:', followError);
       } else {
         isFollowing = count! > 0;
       }
     }

     setUserProfile({
       ...profileData,
       posts: postsData || [],
       is_following: isFollowing,
     } as UserProfile);
     setLoading(false);
     console.log('Profile.tsx: setUserProfile completed.');
   };

   if (targetUsername) {
     fetchProfile(targetUsername);
   } else if (authUser && authUser.user_metadata.username) {
       // If logged in but username not in URL, use auth user's username
       fetchProfile(authUser.user_metadata.username as string);
   } else {
       // If no username in URL and not authenticated, or no username in authUser
       setUserProfile(null);
       setLoading(false);
   }

 }, [urlUsername, authLoading, authUser, navigate]);

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

  const handleFollowToggle = async () => {
    if (!authUser) {
      navigate('/auth'); // Redirect to auth page if not authenticated
      return;
    }

    if (authUser.id === profile.id) {
      toast({
        title: 'Error',
        description: "You cannot follow yourself.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (userProfile?.is_following) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', authUser.id)
        .eq('following_id', profile.id);

      if (error) {
        console.error('Profile.tsx: Error unfollowing:', error);
        toast({
          title: 'Error',
          description: `Failed to unfollow: ${error.message}`,
          variant: "destructive",
        });
      } else {
        setUserProfile(prev => prev ? { ...prev, is_following: false } : null);
        toast({
          title: 'Unfollowed!',
          description: `You are no longer following ${profile.display_name}.`,
        });
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert([
          { follower_id: authUser.id, following_id: profile.id }
        ]);

      if (error) {
        console.error('Profile.tsx: Error following:', error);
        toast({
          title: 'Error',
          description: `Failed to follow: ${error.message}`,
          variant: "destructive",
        });
      } else {
        setUserProfile(prev => prev ? { ...prev, is_following: true } : null);
        toast({
          title: 'Followed!',
          description: `You are now following ${profile.display_name}.`,
        });
      }
    }
    setLoading(false);
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
                onClick={handleFollowToggle}
                disabled={loading}
                variant={userProfile?.is_following ? "outline" : "default"}
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                {loading ? '...' : (userProfile?.is_following ? <><Check className="h-4 w-4 mr-2" /> Following</> : <><UserPlus className="h-4 w-4 mr-2" /> Follow</>)}
              </Button>
              <Button
                onClick={() => {
                  if (!authUser) {
                    navigate('/auth'); // Redirect to auth page if not authenticated
                  } else {
                    navigate(`/chats/${profile.username}`);
                  }
                }}
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
              <span className="text-muted-foreground ml-1">Posts</span>
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
          <h3 className="text-xl font-semibold mb-4">{isOwnProfile ? 'Your Posts' : `${profile.display_name}'s Posts`}</h3>
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
