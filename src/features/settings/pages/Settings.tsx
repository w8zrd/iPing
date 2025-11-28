import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { updateUserProfile } from '@/api/user';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  username: string;
  display_name: string;
  bio: string;
  verified: boolean;
  location: string;
  avatar_url?: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('username, display_name, bio, verified, location, avatar_url')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      // Data object has different keys than the state variables, so map them
      const userProfile: UserProfile = {
        ...data,
        display_name: data.display_name, // Map display_name to state
      };
      setProfile(userProfile);
      setBio(data.bio || '');
      setDisplayName(data.display_name || '');
      setUsername(data.username || '');
      setLocation(data.location || '');
      setProfileImage(data.avatar_url || '');
    } else {
      console.error('Error fetching profile for settings:', error);
      toast({ title: 'Error', description: 'Could not load profile data.', variant: 'destructive' });
    }
    setLoading(false);
  };
  
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // NOTE: Image upload logic is complex and is kept as a placeholder.
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        toast({
          title: 'Profile picture updated (Placeholder)',
          description: 'Image logic needs actual Supabase storage implementation.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user || loading) {
        toast({ title: 'Error', description: 'User not authenticated or loading', variant: 'destructive' });
        return;
    }
    setLoading(true);
    
    try {
        await updateUserProfile({
            username,
            display_name: displayName,
            bio,
            location,
        });
        toast({
            title: 'Settings Updated',
            description: 'Your changes have been saved to the database.',
            variant: 'success'
        });
    } catch (error: any) {
        console.error('Save error:', error);
        toast({
            title: 'Error',
            description: `Failed to save changes: ${error.message}`,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  if (loading || !profile) {
    return (
        <div className="min-h-screen flex items-center justify-center overflow-hidden bg-background">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 overflow-hidden bg-background">
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-24 animate-fade-in flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="glass-strong rounded-3xl p-8 mb-6 shadow-lg animate-scale-in">
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer group">
                    <Avatar className="w-24 h-24 ring-4 ring-primary/20 shadow-lg">
                      <AvatarImage src={profileImage} />
                      <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white text-3xl font-bold">
                        {displayName?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Profile Picture</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="h-12 rounded-2xl glass border-border/50 focus:border-primary transition-apple"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="h-12 rounded-2xl glass border-border/50 focus:border-primary transition-apple"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Bio</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                className="min-h-[100px] rounded-2xl glass border-border/50 resize-none focus:border-primary transition-apple"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your location"
                className="h-12 rounded-2xl glass border-border/50 focus:border-primary transition-apple"
              />
            </div>
            
            <Button
              onClick={handleSave}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 font-semibold transition-apple"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Settings;
