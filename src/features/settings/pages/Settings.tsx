import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { ArrowLeft, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';
import { logger } from '@/lib/logger';

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();
  const [currentProfile, setCurrentProfile] = useState<ProfileData | null>(null);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [initialUsername, setInitialUsername] = useState('');

  useEffect(() => {
    if (authLoading || !authUser) {
      navigate('/auth');
      return;
    }
    
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`id, username, display_name, bio, location, avatar_url`)
        .eq('id', authUser.id)
        .single();

      if (error || !data) {
        logger.error('Error fetching profile', error, {
          userMessage: 'Failed to load profile data.',
          showToast: true,
        });
        return;
      }

      setCurrentProfile(data);
      setBio(data.bio || '');
      setDisplayName(data.display_name || '');
      setUsername(data.username || '');
      setLocation(data.location || '');
      setProfileImage(data.avatar_url || '');
      setInitialUsername(data.username || '');
    };
    
    fetchProfile();
  }, [authUser, authLoading, navigate, toast]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Logic for uploading image to storage would go here
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        toast({
          title: 'Profile picture previewed',
          description: 'Click Save Changes to finalize the upload.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!authUser || !currentProfile) return;

    setIsSaving(true);
    
    // Check if username changed and if the new username is available (skipped for simplicity, rely on RLS/DB constraints for now)
    
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio: bio,
        username: username,
        location: location,
        // avatar_url: profileImage, // Image upload logic skipped
      })
      .eq('id', currentProfile.id);

    setIsSaving(false);

    if (error) {
      logger.error('Error saving settings', error, {
        userMessage: `Failed to save changes: ${error.message}`,
        showToast: true,
      });
    } else {
      toast({
        title: 'Settings Updated',
        description: 'Your changes have been saved',
      });
      // Force refresh of auth user data if username changed (optional but good practice)
      if (initialUsername !== username) {
        // Need to update auth metadata for accurate display elsewhere
        const { error: updateError } = await supabase.auth.updateUser({
          data: { username: username, display_name: displayName },
        });

        if(updateError) {
             logger.error("Failed to update auth user metadata", updateError);
        } else {
             setInitialUsername(username);
        }
      }
    }
  };

  if (authLoading || !currentProfile) {
    // Show spinner if we are loading or if profile hasn't loaded yet (but auth is done)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-8 animate-fade-in flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full transition-colors text-muted-foreground hover:bg-background/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="glass-strong rounded-3xl p-8 mb-6 shadow-lg animate-scale-in">
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <label className="relative cursor-pointer group w-24 h-24">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
                {/* Avatar Fallback */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white text-3xl font-bold flex items-center justify-center ring-4 ring-primary/20 shadow-lg">
                  {displayName[0]?.toUpperCase() || 'U'}
                  {/* For actual image, use an <img> tag here if profileImage is set */}
                  {profileImage && <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-full" />}
                </div>
                {/* Overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </label>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="h-12 rounded-2xl glass border-border/50 focus:border-primary transition-apple p-3 bg-transparent focus:outline-none w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="h-12 rounded-2xl glass border-border/50 focus:border-primary transition-apple p-3 bg-transparent focus:outline-none w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                className="min-h-[100px] rounded-2xl glass border-border/50 resize-none focus:border-primary transition-apple p-3 bg-transparent focus:outline-none w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your location"
                className="h-12 rounded-2xl glass border-border/50 focus:border-primary transition-apple p-3 bg-transparent focus:outline-none w-full"
              />
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 font-semibold transition-apple disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Settings;
