import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Heart, MessageCircle, Send, UserPlus, Check, Image as ImageIcon, X, Share2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/LoadingSpinner'; // Assuming this is needed/used in error handling

interface Comment {
  id: string;
  username: string;
  displayName: string;
  text: string;
  timestamp: Date;
  verified?: boolean;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  views: number;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    username: string;
    display_name: string;
    verified: boolean;
  };
}

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [highlightedPost, setHighlightedPost] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isFetchingPosts, setIsFetchingPosts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<{ [postId: string]: Comment[] }>({});
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [focusedCommentPost, setFocusedCommentPost] = useState<string | null>(null);
  const [postInputFocused, setPostInputFocused] = useState(false);
  const [postImage, setPostImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllData = async () => {
      console.log('--- STARTING DATA FETCH ---');
      try {
        setIsFetchingPosts(true);
        setFetchError(null);
        
        // --- Fetch Posts ---
        console.log('Fetching posts...');
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(
            '*, profiles(username, display_name, verified), likes_count:likes(count), comments_count:comments(count)'
          )
          .order('created_at', { ascending: false });
          console.log('Posts query finished.');

        if (postsError) {
          console.error('Error fetching posts:', postsError);
          setFetchError('Failed to load feed posts.');
          setIsFetchingPosts(false);
          return;
        }
        setPosts(postsData as Post[]);

        // --- Fetch Follows ---
        if (user) {
          console.log('Fetching follows...');
          const { data: followsData, error: followsError } = await supabase
            .from('follows')
            .select('following_id, profiles!follows_following_id_fkey(username)')
            .eq('follower_id', user.id);
          console.log('Follows query finished.');

          if (followsError) {
            console.error('Error fetching follows:', followsError);
          } else if (followsData) {
            const followedUsernames = followsData.map((follow) => {
              const profile = follow.profiles as { username: string } | null;
              return profile ? profile.username : null;
            }).filter((username): username is string => username !== null);
            setFriendRequests(followedUsernames);
          }
        }

        // --- Fetch Likes ---
        if (user) {
          console.log('Fetching likes...');
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id);
          console.log('Likes query finished.');

          if (likesError) {
            console.error('Error fetching likes:', likesError);
          } else if (likesData) {
            const likedPostIds = likesData.map((like) => like.post_id);
            setLikedPosts(likedPostIds);
          }
        }
        
        console.log('--- DATA FETCH COMPLETE ---');
      } catch (e) {
        console.error('UNCAUGHT EXCEPTION IN fetchAllData:', e);
        setFetchError('An unexpected error occurred: Check console for details.');
      } finally {
         setIsFetchingPosts(false);
      }
    };

    fetchAllData();
  }, [user]);

  useEffect(() => {
    if (!expandedPost || commentsByPost[expandedPost]) return;

    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, display_name, verified)')
        .eq('post_id', expandedPost)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
      } else if (data) {
        // Map Supabase data to local Comment interface
        const fetchedComments: Comment[] = data.map((comment: any) => ({
          id: comment.id,
          username: comment.profiles.username,
          displayName: comment.profiles.display_name,
          text: comment.content,
          timestamp: new Date(comment.created_at),
          verified: comment.profiles.verified,
        }));
        setCommentsByPost((prev) => ({ ...prev, [expandedPost]: fetchedComments }));
      }
    };

    fetchComments();
  }, [expandedPost]);

  // Handle navigation from notifications and shared links
  useEffect(() => {
    const postId = searchParams.get('post');
    const shouldOpenComments = searchParams.get('openComments') === 'true';
    
    if (postId) {
      setHighlightedPost(postId);
      
      setTimeout(() => {
        const element = postRefs.current[postId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          if (shouldOpenComments) {
            setExpandedPost(postId);
          }
        }
      }, 100);
    }
  }, [searchParams]);

  // Clear highlight on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (highlightedPost) {
        setHighlightedPost(null);
        setSearchParams({}, { replace: true });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [highlightedPost, setSearchParams]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim() && !postImage) return;

    setIsPosting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            content: newPost,
            image_url: postImage,
            user_id: user.id,
          },
        ])
        .select('*, profiles(username, display_name, verified)');

      if (error) {
        console.error('Error creating post:', error);
        toast({
          title: 'Error!',
          description: 'Could not create post',
          variant: 'destructive',
        });
      } else {
        setPosts([data[0] as Post, ...posts]);
        setNewPost('');
        setPostImage(null);
        toast({
          title: 'Posted!',
          description: 'Your ping is now live',
        });
      }
    }

    setIsPosting(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to like posts.',
        variant: 'destructive',
      });
      return;
    }

    const isLiked = likedPosts.includes(postId);

    if (isLiked) {
      // Unlike post
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error unliking post:', error);
        toast({
          title: 'Error',
          description: 'Failed to unlike post.',
          variant: 'destructive',
        });
      } else {
        setLikedPosts(likedPosts.filter((id) => id !== postId));
        // Optimistically update post count (will be refreshed on next fetch)
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count - 1 }
              : post
          )
        );
      }
    } else {
      // Like post
      const { error } = await supabase.from('likes').insert([
        {
          post_id: postId,
          user_id: user.id,
        },
      ]);

      if (error) {
        console.error('Error liking post:', error);
        toast({
          title: 'Error',
          description: 'Failed to like post.',
          variant: 'destructive',
        });
      } else {
        setLikedPosts([...likedPosts, postId]);
        // Optimistically update post count (will be refreshed on next fetch)
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count + 1 }
              : post
          )
        );
      }
    }
  };

  const handleComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to comment.',
        variant: 'destructive',
      });
      return;
    }

    // 1. Insert comment into the database
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: user.id,
          content: text,
        },
      ])
      .select('*, profiles(username, display_name, verified)');

    if (error) {
      console.error('Error creating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment.',
        variant: 'destructive',
      });
    } else if (data && data.length > 0) {
      const newCommentData = data[0];

      // 2. Optimistically update post state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments_count: post.comments_count + 1,
                // Note: We are not storing comments in the Post interface yet,
                // so we only update the count for now.
              }
            : post
        )
      );

      setCommentText({ ...commentText, [postId]: '' });
      toast({
        title: 'Comment added!',
        description: 'Your comment is now visible',
      });
    }
  };

  const handleFriendRequest = async (username: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to follow users.',
        variant: 'destructive',
      });
      return;
    }

    if (friendRequests.includes(username)) return;

    // 1. Fetch the target user's profile ID using their username
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching profile ID:', profileError);
      toast({
        title: 'Error',
        description: `Could not find user ${username}.`,
        variant: 'destructive',
      });
      return;
    }

    const followingId = profileData.id;

    // 2. Insert into the follows table
    const { error: followError } = await supabase.from('follows').insert([
      {
        follower_id: user.id,
        following_id: followingId,
      },
    ]);

    if (followError) {
      console.error('Error sending follow request:', followError);
      toast({
        title: 'Error',
        description: 'Failed to send follow request.',
        variant: 'destructive',
      });
    } else {
      setFriendRequests([...friendRequests, username]);
      toast({
        title: 'Followed!',
        description: `You are now following @${username}.`,
      });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  const handleShare = async (post: Post) => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = `Check out this ping from ${post.profiles.display_name} on iPing!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'iPing Post',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard
          navigator.clipboard.writeText(shareUrl);
          toast({
            title: 'Link copied!',
            description: 'Post link copied to clipboard',
          });
        }
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Post link copied to clipboard',
      });
    }
  };

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <h1 className="text-xl font-bold mb-2">Error Loading Feed</h1>
          <p>{fetchError}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className={focusedCommentPost || postInputFocused ? 'blur-sm pointer-events-none' : ''}>
        <Header />
      </div>
      <div className="max-w-2xl mx-auto p-4">
        <div className={`mb-8 pt-24 animate-fade-in ${postInputFocused ? 'blur-sm pointer-events-none' : ''}`}>
          <p className="text-muted-foreground">Connect with friends</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 mb-6 shadow-lg animate-scale-in">
          <Textarea
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            onFocus={() => setPostInputFocused(true)}
            onBlur={() => setPostInputFocused(false)}
            className="min-h-[100px] rounded-2xl border-border/50 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-apple mb-4"
          />
          {postImage && (
            <div className="relative mb-4">
              <img src={postImage} alt="Upload preview" className="rounded-2xl max-h-64 w-full object-cover" />
              <button
                onClick={() => setPostImage(null)}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-apple"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-2xl"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                }}
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                Image
              </Button>
            </label>
            <Button
              onClick={handlePost}
              disabled={isPosting || (!newPost.trim() && !postImage)}
              className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 font-semibold transition-apple"
            >
              {isPosting ? 'Posting...' : 'Ping'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isFetchingPosts ? (
            <div className="space-y-4">
              {/* SKELETONS will be implemented later, for now just show loading text */}
              {Array.from({ length: 3 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground pt-12">No posts found. Start following users or post something new!</p>
          ) : (
            posts.map((post, index) => (
              <div
                key={post.id}
                ref={(el) => (postRefs.current[post.id] = el)}
                className={`glass rounded-3xl p-6 shadow-md hover-lift animate-fade-in transition-all ${
                  (focusedCommentPost && focusedCommentPost !== post.id) || postInputFocused ? 'blur-sm pointer-events-none' : ''
                } ${
                  highlightedPost === post.id ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <button
                    onClick={() => navigate(`/profile/${post.profiles.username}`)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-apple relative"
                  >
                    {post.profiles.display_name?.[0]?.toUpperCase() || 'U'}
                    {(post.profiles.username === 'alex' || post.profiles.username === 'mike') && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/profile/${post.profiles.username}`)}
                          className="font-semibold hover:text-primary transition-apple"
                        >
                          {post.profiles.display_name}
                        </button>
                         {post.profiles.verified && (
                           <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                             <Check className="h-3 w-3 text-white stroke-[3]" />
                           </div>
                         )}
                      </div>
                      {post.profiles.username !== 'you' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFriendRequest(post.profiles.username)}
                          disabled={friendRequests.includes(post.profiles.username)}
                          className="h-6 text-xs ml-auto rounded-full"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          {friendRequests.includes(post.profiles.username) ? 'Requested' : 'Add'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      @{post.profiles.username} · {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <p className="mb-4 text-foreground/90">
                  <ParsedText text={post.content} />
                </p>
                
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post image"
                    className="rounded-2xl w-full mb-4 max-h-96 object-cover"
                  />
                )}
                
                <div className="flex items-center gap-6 mb-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-apple group ${
                      likedPosts.includes(post.id)
                        ? 'text-destructive'
                        : 'text-muted-foreground hover:text-destructive'
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        likedPosts.includes(post.id)
                          ? 'fill-destructive'
                          : 'group-hover:animate-bounce-subtle'
                      }`}
                    />
                    <span className="text-sm font-medium">{post.likes_count}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-apple"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">0</span>
                  </button>
                  <button
                    onClick={() => handleShare(post)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-apple"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2 text-muted-foreground ml-auto">
                    <Eye className="h-5 w-5" />
                    <span className="text-sm font-medium">{post.views.toLocaleString()}</span>
                  </div>
                </div>
 
                {expandedPost === post.id && (
                  <div className="mt-4 pt-4 border-t border-border/50 animate-fade-in space-y-4">
                    {/* TODO: Implement comments */}
                    <div className="relative mt-4">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                        onFocus={() => setFocusedCommentPost(post.id)}
                        onBlur={() => setFocusedCommentPost(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleComment(post.id);
                          }
                        }}
                        className="h-12 pr-12 rounded-3xl glass-strong border-border/50 transition-apple px-4"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!commentText[post.id]?.trim()}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 transition-apple ${
                          commentText[post.id]?.trim()
                            ? 'text-primary hover:scale-110'
                            : 'text-muted-foreground opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={focusedCommentPost ? 'blur-sm pointer-events-none' : ''}>
        <Navigation />
      </div>
    </div>
  );
};

export default Home;
