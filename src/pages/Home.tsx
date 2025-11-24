import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Heart, MessageCircle, Send, UserPlus, Check, Image as ImageIcon, X, Share2, Eye, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AuthModal from '@/components/AuthModal';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  verified?: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  views: number;
  profiles?: Profile;
  likes?: { id: string; user_id: string }[];
  comments?: Comment[];
}

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [highlightedPost, setHighlightedPost] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [focusedCommentPost, setFocusedCommentPost] = useState<string | null>(null);
  const [postInputFocused, setPostInputFocused] = useState(false);
  const [postImage, setPostImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete post. Please try again.',
        variant: 'destructive',
      });
    } else {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
      toast({
        title: 'Post deleted!',
        description: 'Your ping has been removed.',
      });
    }
  };


  // Fetch posts
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, display_name, verified),
        likes(id, user_id),
        comments(
          id,
          user_id,
          content,
          created_at,
          profiles!comments_user_id_fkey(id, username, display_name, verified)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data as any);
    }
  };

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prevPosts) => [payload.new as Post, ...prevPosts]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        if (payload.new.views !== undefined) {
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === payload.new.id ? { ...post, views: payload.new.views } : post
            )
          );
        } else {
          // For other updates, refetch the posts to ensure consistency
          fetchPosts();
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    if (!user) {
      openAuthModal();
      return;
    }
    if (!newPost.trim() && !postImage) return;
    
    setLoading(true);

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: newPost,
      image_url: postImage || undefined,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to post. Please try again.',
        variant: 'destructive',
      });
    } else {
      setNewPost('');
      setPostImage(null);
      toast({
        title: 'Posted!',
        description: 'Your ping is now live',
      });
      fetchPosts();
    }
    
    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    
    const post = posts.find(p => p.id === postId);
    const alreadyLiked = post?.likes?.some(like => like.user_id === user.id);

    if (alreadyLiked) {
      const likeId = post?.likes?.find(like => like.user_id === user.id)?.id;
      await supabase.from('likes').delete().eq('id', likeId);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    }
    
    fetchPosts();
  };

  const handleComment = async (postId: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    const text = commentText[postId]?.trim();
    if (!text) return;

    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      post_id: postId,
      content: text,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } else {
      setCommentText({ ...commentText, [postId]: '' });
      toast({
        title: 'Comment added!',
        description: 'Your comment is now visible',
      });
      fetchPosts();
    }
  };

  const handleFriendRequest = async (targetUserId: string, displayName: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (friendRequests.includes(targetUserId)) return;
    
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: user.id,
      to_user_id: targetUserId,
    });

    if (!error) {
      setFriendRequests([...friendRequests, targetUserId]);
      toast({
        title: 'Friend request sent!',
        description: `Request sent to ${displayName}`,
      });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  const handleShare = async (post: Post) => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = `Check out this ping from ${post.profiles?.display_name} on iPing!`;
    
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
              disabled={loading || (!newPost.trim() && !postImage)}
              className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 font-semibold transition-apple"
            >
              {loading ? 'Posting...' : 'Ping'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {posts.map((post, index) => (
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
                  onClick={() => navigate(`/profile/${post.profiles?.username}`)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-apple"
                >
                  {post.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/profile/${post.profiles?.username}`)}
                        className="font-semibold hover:text-primary transition-apple"
                      >
                        {post.profiles?.display_name}
                      </button>
                      {post.profiles?.verified && (
                        <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-white stroke-2" />
                        </div>
                      )}
                    </div>
                    {user && post.user_id !== user.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFriendRequest(post.user_id, post.profiles?.display_name || '')}
                        disabled={friendRequests.includes(post.user_id)}
                        className="h-6 text-xs ml-auto rounded-full"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        {friendRequests.includes(post.user_id) ? 'Requested' : 'Add'}
                      </Button>
                    )}
                    {post.user_id === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-auto">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDeletePost(post.id)}>
                            Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{post.profiles?.username} · {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <p className="mb-4 text-foreground/90 break-words">
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
                    post.likes?.some(like => like.user_id === user?.id)
                      ? 'text-destructive'
                      : 'text-muted-foreground hover:text-destructive'
                  }`}
                >
                  <Heart className={`h-5 w-5 group-hover:animate-bounce-subtle ${
                    post.likes?.some(like => like.user_id === user?.id) ? 'fill-destructive' : ''
                  }`} />
                  <span className="text-sm font-medium">{post.likes?.length || 0}</span>
                </button>
                <button
                  onClick={() => {
                    const isExpanding = expandedPost !== post.id;
                    toggleComments(post.id);
                    if (isExpanding) {
                      supabase.rpc('increment_post_views', { _post_id: post.id });
                      setPosts((prevPosts) =>
                        prevPosts.map((p) =>
                          p.id === post.id ? { ...p, views: p.views + 1 } : p
                        )
                      );
                    }
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-apple"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{post.comments?.length || 0}</span>
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
                  {(post.comments || []).map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <button
                        onClick={() => navigate(`/profile/${comment.profiles?.username}`)}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-foreground font-semibold text-xs hover:scale-105 transition-apple"
                      >
                        {comment.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </button>
                       <div className="flex-1">
                         <div className="flex items-center gap-2 mb-1">
                           <div className="flex items-center gap-1.5">
                             <button
                               onClick={() => navigate(`/profile/${comment.profiles?.username}`)}
                               className="font-semibold text-sm hover:text-primary transition-apple"
                             >
                               {comment.profiles?.display_name}
                             </button>
                              {comment.profiles?.verified && (
                                <div className="flex items-center justify-center w-3.5 h-3.5 bg-primary rounded-full">
                                  <Check className="h-2.5 w-2.5 text-white stroke-2" />
                                </div>
                              )}
                           </div>
                           <span className="text-xs text-muted-foreground">
                             @{comment.profiles?.username} · {new Date(comment.created_at).toLocaleTimeString()}
                           </span>
                         </div>
                          <p className="text-sm text-foreground/90">
                            <ParsedText text={comment.content} />
                          </p>
                       </div>
                    </div>
                  ))}
                  
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
          ))}
        </div>
      </div>
 
       <div className={focusedCommentPost ? 'blur-sm pointer-events-none' : ''}>
         <Navigation />
       </div>
       <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
     </div>
   );
 };

export default Home;
