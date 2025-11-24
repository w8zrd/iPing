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
import AuthModal from '@/components/AuthModal';
import LoadingSpinner from '@/components/LoadingSpinner';

// Supabase Data Types
type SupabasePing = {
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
  pings: SupabasePing[];
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
  pings: [],
};

const Profile = () => {
  const { username: urlUsername } = useParams();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  console.log('Profile component mounted, urlUsername:', urlUsername);

  console.log('Profile component mounted, urlUsername:', urlUsername);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendRequested, setFriendRequested] = useState(false); // Indicates if a request was just sent by the current user
  const [existingFriendRequest, setExistingFriendRequest] = useState(false); // Indicates if there's an existing request
  const { toast } = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

 const isOwnProfile = authUser?.user_metadata.username === urlUsername;

 useEffect(() => {
   console.log('Profile useEffect triggered.');
   if (authLoading) return;
   
   const targetUsername = urlUsername || authUser?.user_metadata.username as string;
   console.log('Profile.tsx: targetUsername derived:', targetUsername);

   const fetchProfile = async (targetUser: string) => {
     setLoading(true);
     console.log('Profile.tsx: Attempting to fetch profile for:', targetUser);
     
     // 1. Fetch Profile Data
     const { data: profileData, error: profileError } = await supabase
       .from('profiles')
       .select(`id, username, display_name, bio, verified, location, created_at`)
       .eq('username', targetUser)
       .single();
       
     if (profileError || !profileData) {
       console.error('Profile.tsx: Error fetching profile or profile not found:', profileError);
       console.log('Profile.tsx: profileData:', profileData);
       setUserProfile(null);
       setLoading(false);
       return;
     }
     console.log('Profile.tsx: Successfully fetched profileData:', profileData);
     
     // 2. Fetch User Pings
     const { data: pingsData, error: pingsError } = await supabase
       .from('pings')
       .select(`id, content, created_at`)
       .eq('user_id', profileData.id)
       .order('created_at', { ascending: false });

     if (pingsError) {
        console.error('Profile.tsx: Error fetching pings:', pingsError);
        // Continue with profile data but empty pings
     }
     console.log('Profile.tsx: Pings fetched:', pingsData);

     // 3. Check for existing friend request from authUser to this profile
     if (authUser && authUser.id !== profileData.id) {
       const { data: friendRequestData, error: friendRequestError } = await supabase
         .from('friend_requests')
         .select('id')
         .eq('from_user_id', authUser.id)
         .eq('to_user_id', profileData.id)
         .single();

       if (friendRequestError && friendRequestError.code !== 'PGRST116') { // PGRST116 means no rows found
         console.error('Profile.tsx: Error checking existing friend request:', friendRequestError);
       }
       console.log('Profile.tsx: Friend request data:', friendRequestData);
       setExistingFriendRequest(!!friendRequestData);
     } else {
       setExistingFriendRequest(false);
     }

     setUserProfile({
       ...profileData,
       pings: pingsData || [],
     } as UserProfile);
     setLoading(false);
     console.log('Profile.tsx: setUserProfile completed.');
   };

   if (targetUsername) {
     fetchProfile(targetUsername);
   } else if (isOwnProfile && authUser) {
       // If logged in but username not in URL, use auth user's username
       fetchProfile(authUser.user_metadata.username as string);
   } else if (!isOwnProfile && !urlUsername) {
       // Should not happen if protected route works
       console.log('Profile.tsx: No username in URL and not own profile, setting userProfile to null.');
       setUserProfile(null);
       setLoading(false);
   } else if (isOwnProfile && !authUser) {
       console.log('Profile.tsx: Own profile, but not authenticated. Redirecting to /auth');
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

  const handleFriendRequest = async () => {
    if (!authUser) {
      openAuthModal();
      return;
    }

    if (authUser.id === profile.id) {
      toast({
        title: 'Error',
        description: "You cannot send a friend request to yourself.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true); // Indicate loading while sending request

    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: authUser.id,
      to_user_id: profile.id,
    });

    setLoading(false); // End loading

    if (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error',
        description: `Failed to send friend request: ${error.message}`,
        variant: "destructive",
      });
    } else {
      setFriendRequested(true);
      toast({
        title: 'Friend request sent!',
        description: `Request sent to ${profile.display_name}`,
      });
    }
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
                disabled={friendRequested || existingFriendRequest || loading}
                variant={friendRequested || existingFriendRequest ? "outline" : "default"}
                className="flex-1 rounded-full hover:scale-105 transition-apple"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? 'Sending...' : (friendRequested || existingFriendRequest ? 'Request Sent' : 'Add Friend')}
              </Button>
              <Button
                onClick={() => {
                  if (!authUser) {
                    openAuthModal();
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
              <span className="font-bold text-foreground">{profile.pings.length}</span>
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
            {profile.pings.map((ping, index) => (
              <div
                key={ping.id}
                className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <p className="text-foreground/90 mb-2">
                  <ParsedText text={ping.content} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(ping.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Navigation />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  );
};

export default Profile;
