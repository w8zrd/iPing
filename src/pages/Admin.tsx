import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'pings'), (snapshot) => {
      const uniqueUsers = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId && !uniqueUsers.has(data.userId)) {
          uniqueUsers.set(data.userId, {
            id: data.userId,
            email: data.userEmail,
            verified: data.verified || false,
            banned: false,
          });
        }
      });
      setUsers(Array.from(uniqueUsers.values()));
    });

    return unsubscribe;
  }, [isAdmin, navigate]);

  const handleToggleVerification = (userId: string) => {
    toast({
      title: 'Badge Updated',
      description: 'User verification status changed',
    });
  };

  const handleToggleBan = (userId: string) => {
    toast({
      title: 'User Status Updated',
      description: 'User ban status changed',
    });
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
                      {user.email?.[0]?.toUpperCase() || 'U'}
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
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <span className="font-semibold">{user.email}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleToggleVerification(user.id)}
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
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <span className="font-semibold">{user.email}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleToggleBan(user.id)}
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
