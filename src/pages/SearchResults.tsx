import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParsedText } from '@/lib/textParser';

interface User {
  username: string;
  displayName: string;
  bio: string;
  verified: boolean;
}

interface Post {
  id: string;
  username: string;
  displayName: string;
  text: string;
  timestamp: Date;
  verified?: boolean;
}

const mockUsers: User[] = [
  { username: 'alex', displayName: 'Alex Chen', bio: 'Design enthusiast 🎨 | Apple fanatic', verified: true },
  { username: 'sarah', displayName: 'Sarah Johnson', bio: 'Tech lover | iOS developer', verified: false },
  { username: 'mike', displayName: 'Mike Davis', bio: 'Early adopter | Product designer', verified: true },
  { username: 'you', displayName: 'You', bio: 'Living my best life on iPing ✨', verified: false },
];

const mockPosts: Post[] = [
  {
    id: '1',
    username: 'alex',
    displayName: 'Alex Chen',
    text: 'Loving the new iPing design! 🎨 The glass effects are absolutely stunning. #design #UI',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    verified: true,
  },
  {
    id: '2',
    username: 'sarah',
    displayName: 'Sarah Johnson',
    text: 'Just discovered this amazing new social platform. The Apple aesthetic is 👌 #iPing #tech',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    verified: false,
  },
  {
    id: '3',
    username: 'mike',
    displayName: 'Mike Davis',
    text: 'Anyone else here from the early days? This feels like the future of social media. #SocialMedia #Tech',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    verified: true,
  },
];

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Always scroll to top when the query changes (e.g., clicking a hashtag/mention)
    window.scrollTo(0, 0);

    if (query.trim()) {
      // Strip the # from hashtag searches for better matching
      const searchQuery = query.startsWith('#') ? query.substring(1) : query;
      const lowerQuery = searchQuery.toLowerCase();
      
      // Filter users by username, display name, or bio (including hashtags)
      const users = mockUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(lowerQuery) ||
          user.displayName.toLowerCase().includes(lowerQuery) ||
          user.bio.toLowerCase().includes(lowerQuery) ||
          user.bio.toLowerCase().includes(`#${lowerQuery}`)
      );
      setFilteredUsers(users);

      // Filter posts by text content, hashtags, or author
      const posts = mockPosts.filter(
        (post) =>
          post.text.toLowerCase().includes(lowerQuery) ||
          post.text.toLowerCase().includes(`#${lowerQuery}`) ||
          post.username.toLowerCase().includes(lowerQuery) ||
          post.displayName.toLowerCase().includes(lowerQuery)
      );
      setFilteredPosts(posts);
    } else {
      setFilteredUsers([]);
      setFilteredPosts([]);
    }
  }, [query]);

  return (
    <div className="min-h-screen pb-32">
      <Header />
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
          <h1 className="text-2xl font-bold">
            Results for "{query}"
          </h1>
        </div>

        {filteredUsers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">People</h2>
            <div className="space-y-3">
              {filteredUsers.map((user, index) => (
                <div
                  key={user.username}
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="glass-strong rounded-3xl p-4 shadow-md animate-fade-in cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                        {user.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{user.displayName}</span>
                        {user.verified && (
                          <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                            <Check className="h-3 w-3 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      <p className="text-sm text-foreground/70 mt-1">{user.bio}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredPosts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Posts</h2>
            <div className="space-y-4">
              {filteredPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                  style={{ animationDelay: `${(filteredUsers.length + index) * 0.05}s` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={() => navigate(`/profile/${post.username}`)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-apple"
                    >
                      {post.displayName?.[0]?.toUpperCase() || 'U'}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/profile/${post.username}`)}
                          className="font-semibold hover:text-primary transition-apple"
                        >
                          {post.displayName}
                        </button>
                        {post.verified && (
                          <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                            <Check className="h-3 w-3 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @{post.username} · {post.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-foreground/90">
                    <ParsedText text={post.text} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && filteredPosts.length === 0 && query && (
          <div className="glass rounded-3xl p-8 text-center animate-scale-in">
            <p className="text-muted-foreground">
              No results found for "{query}"
            </p>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default SearchResults;
