import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/SupabaseAuthContext'; // Corrected import path
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/use-debounce';

interface AdminUser {
  id: string;
  email: string;
  verified: boolean;
  banned: boolean;
}

const Admin = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_verified, is_banned')
        .ilike('email', `%${debouncedSearchQuery}%`);

      if (error) {
        logger.error('Error fetching users', error, { userMessage: 'Failed to fetch user list.' });
      } else {
        setUsers(data.map(profile => ({
          id: profile.id,
          email: profile.email,
          verified: profile.is_verified,
          banned: profile.is_banned,
        })));
      }
    };

    fetchUsers();
  }, [isAdmin, navigate, debouncedSearchQuery]);

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !currentStatus })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update verification status', error, {
        userMessage: `Failed to update verification status for user ${userId}.`,
        showToast: true,
      });
    } else {
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, verified: !currentStatus } : u))
      );
      toast({
        title: 'Badge Updated',
        description: 'User verification status changed',
      });
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentStatus })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update ban status', error, {
        userMessage: `Failed to update ban status for user ${userId}.`,
        showToast: true,
      });
    } else {
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, banned: !currentStatus } : u))
      );
      toast({
        title: 'User Status Updated',
        description: 'User ban status changed',
      });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8 pt-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-strong rounded-3xl p-2 mb-6">
            <TabsTrigger value="users" className="rounded-2xl">Users</TabsTrigger>
            <TabsTrigger value="badges" className="rounded-2xl">Badges</TabsTrigger>
            <TabsTrigger value="bans" className="rounded-2xl">Bans</TabsTrigger>
          </TabsList>

          <div className="mb-6">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-2xl glass-strong border-border/50 focus:border-primary transition-apple"
            />
          </div>

          <TabsContent value="users" className="space-y-4">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold">
                      {user.email && user.email ? user.email.toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{user.email}</span>
                        {user.verified && (
                          <CheckCircle className="h-4 w-4 text-primary fill-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.banned ? 'Banned' : 'Active'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="badges" className="space-y-4">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold">
                      {user.email && user.email ? user.email.toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="font-semibold">{user.email}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleToggleVerification(user.id, user.verified)}
                    variant={user.verified ? "default" : "outline"}
                    className="rounded-2xl transition-apple"
                  >
                    {user.verified ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {user.verified ? 'Verified' : 'Verify'}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="bans" className="space-y-4">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold">
                      {user.email && user.email ? user.email.toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="font-semibold">{user.email}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleToggleBan(user.id, user.banned)}
                    variant={user.banned ? "destructive" : "outline"}
                    className="rounded-2xl transition-apple"
                  >
                    {user.banned ? 'Unban' : 'Ban User'}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Navigation />
    </div>
  );
};

export default Admin;
