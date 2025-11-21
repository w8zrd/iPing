import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  verified: boolean;
  location: string;
}

const mockUsers: { [key: string]: UserProfile } = {
  you: {
    username: 'you',
    displayName: 'You',
    bio: 'Living my best life on iPing ✨',
    verified: false,
    location: 'San Francisco',
  },
};

const Settings = () => {
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const userProfile = mockUsers.you;
    setBio(userProfile.bio);
    setDisplayName(userProfile.displayName);
    setUsername(userProfile.username);
    setLocation(userProfile.location);
  }, []);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        toast({
          title: 'Profile picture updated',
          description: 'Your profile picture has been changed',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    mockUsers.you.displayName = displayName;
    mockUsers.you.bio = bio;
    mockUsers.you.username = username;
    mockUsers.you.location = location;
    toast({
      title: 'Settings Updated',
      description: 'Your changes have been saved',
    });
  };

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-8 animate-fade-in flex items-center gap-4">
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
                        {displayName[0]?.toUpperCase() || 'U'}
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
