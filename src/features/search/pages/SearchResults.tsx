import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, ArrowLeft, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  verified: boolean;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  image_url?: string;
  profiles?: {
    username: string;
    display_name: string;
    verified: boolean;
  };
}

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (query.trim()) {
      performSearch(query.trim());
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    const isHashtagSearch = searchQuery.startsWith('#');
    const cleanQuery = isHashtagSearch ? searchQuery.substring(1).toLowerCase() : searchQuery.toLowerCase();

    if (isHashtagSearch) {
      // Hashtag search: search posts and user bios for hashtags
      const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(username, display_name, verified)')
        .ilike('content', `%#${cleanQuery}%`)
        .order('created_at', { ascending: false });

      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .ilike('bio', `%#${cleanQuery}%`);

      setFilteredPosts(posts || []);
      setFilteredUsers(users || []);
      setHashtags([]);
    } else {
      // Word search: search posts by content (recent to old), then extract hashtags, then search users
      const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(username, display_name, verified)')
        .or(`content.ilike.%${cleanQuery}%`)
        .order('created_at', { ascending: false });

      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%,bio.ilike.%${cleanQuery}%`);

      // Extract hashtags from all posts
      const allHashtags = new Set<string>();
      const { data: allPosts } = await supabase.from('posts').select('content');
      allPosts?.forEach(post => {
        const matches = post.content.match(/#\w+/g);
        if (matches) {
          matches.forEach(tag => {
            const tagLower = tag.toLowerCase();
            if (tagLower.includes(cleanQuery)) {
              allHashtags.add(tag);
            }
          });
        }
      });

      setFilteredPosts(posts || []);
      setFilteredUsers(users || []);
      setHashtags(Array.from(allHashtags).slice(0, 5));
    }
  };

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

        {filteredPosts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Posts</h2>
            <div className="space-y-4">
              {filteredPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="glass rounded-3xl p-6 shadow-md animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={() => navigate(`/profile/${post.profiles?.username}`)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-apple"
                    >
                      {post.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/profile/${post.profiles?.username}`)}
                          className="font-semibold hover:text-primary transition-apple"
                        >
                          {post.profiles?.display_name}
                        </button>
                        {post.profiles?.verified && (
                          <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                            <Check className="h-3 w-3 text-white stroke-" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @{post.profiles?.username} · {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-foreground/90">
                    <ParsedText text={post.content} />
                  </p>
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="rounded-2xl w-full mt-3 max-h-96 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hashtags.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Hashtags</h2>
            <div className="space-y-3">
              {hashtags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                  className="glass-strong rounded-3xl p-4 shadow-md animate-fade-in cursor-pointer hover:scale-[1.02] transition-transform w-full text-left"
                  style={{ animationDelay: `${(filteredPosts.length + index) * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Hash className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-semibold text-primary">{tag}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredUsers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">People</h2>
            <div className="space-y-3">
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="glass-strong rounded-3xl p-4 shadow-md animate-fade-in cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ animationDelay: `${(filteredPosts.length + hashtags.length + index) * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                        {user.display_name?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{user.display_name}</span>
                        {user.verified && (
                          <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                            <Check className="h-3 w-3 text-white stroke-" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.bio && <p className="text-sm text-foreground/70 mt-1">{user.bio}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && filteredPosts.length === 0 && hashtags.length === 0 && query && (
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
