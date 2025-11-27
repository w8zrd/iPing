import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import Header from '@/components/Header';
import { Heart, MessageCircle, Send, UserPlus, Check, Image as ImageIcon, X, Share2, Eye, MoreVertical } from 'lucide-react';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { createPing, toggleLike } from '@/api/pings';
import { logger } from '@/lib/logger';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

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
  const pingRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [highlightedPing, setHighlightedPing] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [newPing, setNewPing] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedPing, setExpandedPing] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [focusedCommentPing, setFocusedCommentPing] = useState<string | null>(null);
  const [pingInputFocused, setPingInputFocused] = useState(false);
  const [pingImage, setPingImage] = useState<string | null>(null);
  // const { toast } = useToast(); // Removed as part of component cleanup
  const { user } = useAuth();

  const handleDeletePing = async (pingId: string) => {
    if (!user) return;

    const { error } = await supabase.from('pings').delete().eq('id', pingId);

    if (error) {
      logger.error('Error deleting ping', error, { userMessage: 'Failed to delete ping. Please try again.', showToast: true });
    } else {
      setPosts((prevPosts) => prevPosts.filter((ping) => ping.id !== pingId));
      // toast removed: Ping deleted!
    }
  };

  const PAGE_SIZE = 20;

  const loadPosts = useCallback(async (append: boolean) => {
    if (!hasMore && append) return;
    
    const offset = append ? page * PAGE_SIZE : 0;
    const currentLoadingState = append ? setIsLoadingMore : setLoading;

    currentLoadingState(true);

    const data = await apiService.getPosts(PAGE_SIZE, offset);

    if (data) {
      setHasMore(data.length === PAGE_SIZE);
      setPage(prev => append ? prev + 1 : 0);
      
      setPosts(prevPosts => {
        if (append) {
          // Avoid adding duplicates from real-time updates if we scroll down and a new post arrives
          const newIds = new Set(data.map(p => p.id));
          const filteredPrevPosts = prevPosts.filter(p => !newIds.has(p.id));
          return [...filteredPrevPosts, ...(data as unknown as Post[])];
        }
        return data as unknown as Post[];
      });
    } else {
      setHasMore(false);
      logger.error('Error fetching posts', { userMessage: 'Failed to fetch pings. Please try again.' });
    }
    
    currentLoadingState(false);
  }, [hasMore, page, isLoadingMore]);

  // Initial load
  useEffect(() => {
    loadPosts(false);
  }, [loadPosts]);

  // Infinite Scroll Observer
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  useEffect(() => {
    if (isIntersecting && hasMore && !loading && !isLoadingMore) {
      loadPosts(true);
    }
  }, [isIntersecting, hasMore, loading, isLoadingMore, loadPosts]);
  
  // For initial load completion
  useEffect(() => {
    if (page === 0 && posts.length > 0 && loading) {
        setLoading(false);
    }
  }, [posts, loading, page]);

  // Realtime subscription for new pings
  useEffect(() => {
    const channel = supabase
      .channel('pings-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pings' }, (payload) => {
        logger.debug('Realtime INSERT received', { new: payload.new });
        // Prepend new post to the top and reset page to 0 to refresh the view
        setPosts((prevPosts) => [payload.new as unknown as Post, ...prevPosts]);
        setPage(0);
        setHasMore(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pings' }, (payload) => {
        logger.debug('Realtime UPDATE received', { new: payload.new });
        if (payload.new.views !== undefined && payload.new.likes === undefined && payload.new.comments === undefined) {
          // Optimization: Only update views for the specific post in state if that's the only data present in the payload
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === payload.new.id ? { ...post, views: payload.new.views } : post
            )
          );
        } else {
          // For other updates (like like/comment counts changing structure), refetch page 0 to ensure consistency
          logger.info('Other ping update, refetching page 0.');
          loadPosts(false);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pings' }, (payload) => {
        logger.debug('Realtime DELETE received', { oldId: payload.old.id });
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== payload.old.id));
        // Removing the loadPosts(false) here prevents an unnecessary re-fetch of page 0 when a post is deleted,
        // which improves scrolling performance by avoiding layout shifts.
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  // Handle navigation from notifications and shared links
  useEffect(() => {
    const pingId = searchParams.get('ping');
    const shouldOpenComments = searchParams.get('openComments') === 'true';
    
    if (pingId) {
      setHighlightedPing(pingId);
      
      setTimeout(() => {
        const element = pingRefs.current[pingId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          if (shouldOpenComments) {
            setExpandedPing(pingId);
          }
        }
      }, 100);
    }
  }, [searchParams, setHighlightedPing, setExpandedPing]);

  // Clear highlight on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (highlightedPing) {
        setHighlightedPing(null);
        setSearchParams({}, { replace: true });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [highlightedPing, setSearchParams]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPingImage(reader.result as string);
        logger.debug('Image loaded for ping preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePing = async () => {
    if (!user) {
      navigate('/auth'); // Redirect to auth page if not authenticated
      return;
    }
    if (!newPing.trim() && !pingImage) return;
    
    setLoading(true);

    logger.debug('Home.tsx: Attempting to create new ping', { newPing, pingImage });
    try {
      await createPing({
        user_id: user.id,
        content: newPing,
        image_url: pingImage || undefined,
      });

      logger.info('Home.tsx: Ping created successfully.');
      setNewPing('');
      setPingImage(null);
      // Reset feed to page 0 to show new post immediately at the top
      setPage(0);
      setHasMore(true);
      // loadPosts(false) is redundant as the INSERT listener prepends the new post.
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      logger.error('Home.tsx: Error creating ping', error, { userMessage: `Failed to ping. Please try again. Details: ${errorMessage}`, showToast: true });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (pingId: string) => {
    if (!user) {
      navigate('/auth'); // Redirect to auth page if not authenticated
      return;
    }
    
    const ping = posts.find(p => p.id === pingId);
    const alreadyLiked = ping?.likes?.some(like => like.user_id === user.id) || false;
 
    try {
      await toggleLike(pingId, alreadyLiked);
      logger.info(`Home.tsx: Successfully ${alreadyLiked ? 'unliked' : 'liked'} ping ${pingId}.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      logger.error(`Home.tsx: Error toggling like on ping ${pingId}`, error, { userMessage: `Failed to change like status. Details: ${errorMessage}`, showToast: true });
    }
    
    // Re-fetch page 0 after like/unlike to ensure like count/status is correct
    loadPosts(false);
  };

  const handleComment = async (pingId: string) => {
    if (!user) {
      navigate('/auth'); // Redirect to auth page if not authenticated
      return;
    }
    const text = commentText[pingId]?.trim();
    if (!text) return;
 
    logger.debug('Home.tsx: Attempting to add comment to ping', { pingId, content: text });
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      ping_id: pingId,
      content: text,
    });
    if (error) {
      logger.error('Home.tsx: Error adding comment', error, { userMessage: 'Failed to add comment', showToast: true });
    } else {
      logger.info('Home.tsx: Comment added successfully to ping', { pingId });
    }
 
    if (error) {
      // toast removed: Failed to add comment
    } else {
      setCommentText({ ...commentText, [pingId]: '' });
      // toast removed: Comment added!
      // Force refetch page 0 to ensure comment count is correct
      loadPosts(false);
    }
  };

  const handleFriendRequest = async (targetUserId: string, displayName: string) => {
    if (!user) {
      navigate('/auth'); // Redirect to auth page if not authenticated
      return;
    }
    if (friendRequests.includes(targetUserId)) return;
 
    logger.debug('Home.tsx: Attempting to send friend request', { from: user.id, to: targetUserId });
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: user.id,
      to_user_id: targetUserId,
    });
    if (error) {
      logger.error('Home.tsx: Error sending friend request', error, { userMessage: 'Failed to send friend request.' });
    } else {
      logger.info('Home.tsx: Friend request sent successfully.');
    }
 
    if (!error) {
      setFriendRequests([...friendRequests, targetUserId]);
      // toast removed: Friend request sent!
    }
  };

  const toggleComments = (pingId: string) => {
    setExpandedPing(expandedPing === pingId ? null : pingId);
  };

  const handleShare = async (ping: Post) => {
    const shareUrl = `${window.location.origin}/?ping=${ping.id}`;
    const shareText = `Check out this ping from ${ping.profiles?.display_name} on iPing!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'iPing Ping',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logger.error('Home.tsx: Error sharing ping', err as Error, { userMessage: 'Failed to share ping.', showToast: true });
          // Fallback to clipboard
          navigator.clipboard.writeText(shareUrl);
          // toast removed: Link copied!
        }
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      // toast removed: Link copied!
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <div className={focusedCommentPing || pingInputFocused ? 'blur-sm pointer-events-none' : ''}>
        <Header />
      </div>
      <div className="max-w-2xl mx-auto p-4">
        <div className={`mb-8 pt-24 animate-fade-in ${pingInputFocused ? 'blur-sm pointer-events-none' : ''}`}>
          <p className="text-muted-foreground">Connect with friends</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 mb-6 shadow-lg animate-scale-in">
          <textarea
            placeholder="What's on your mind?"
            value={newPing}
            onChange={(e) => setNewPing(e.target.value)}
            onFocus={() => setPingInputFocused(true)}
            onBlur={() => setPingInputFocused(false)}
            className="min-h-[100px] rounded-2xl border border-border/50 resize-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-apple mb-4 p-2 w-full bg-transparent"
          />
          {pingImage && (
            <div className="relative mb-4">
              <img src={pingImage} alt="Upload preview" className="rounded-2xl max-h-64 w-full object-cover" />
              <button
                onClick={() => setPingImage(null)}
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
              <button
                type="button"
                className="w-full h-12 rounded-2xl border border-border/50 bg-background/50 hover:bg-background/80 transition-apple flex items-center justify-center"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                }}
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                Image
              </button>
            </label>
            <button
              onClick={handlePing}
              disabled={loading || (!newPing.trim() && !pingImage)}
              className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Pinging...' : 'Ping'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {posts.map((ping, index) => (
            <div
              key={ping.id}
              ref={(el) => (pingRefs.current[ping.id] = el)}
              className={`glass rounded-3xl p-6 shadow-md hover-lift animate-fade-in transition-all ${
                (focusedCommentPing && focusedCommentPing !== ping.id) || pingInputFocused ? 'blur-sm pointer-events-none' : ''
              } ${
                highlightedPing === ping.id ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => navigate(`/profile/${ping.profiles?.username}`)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-apple"
                >
                  {ping.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/profile/${ping.profiles?.username}`)}
                        className="font-semibold hover:text-primary transition-apple"
                      >
                        {ping.profiles?.display_name}
                      </button>
                      {ping.profiles?.verified && (
                        <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-white stroke-2" />
                        </div>
                      )}
                    </div>
                    {user && ping.user_id !== user.id && (
                      <button
                        onClick={() => handleFriendRequest(ping.user_id, ping.profiles?.display_name || '')}
                        disabled={friendRequests.includes(ping.user_id)}
                        className="h-6 text-xs ml-auto rounded-full px-3 py-1 border border-border/50 bg-background/50 hover:bg-background/80 transition-apple disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        {friendRequests.includes(ping.user_id) ? 'Requested' : 'Add'}
                      </button>
                    )}
                    {ping.user_id === user?.id && (
                      <div className="relative">
                        <button className="h-8 w-8 rounded-full ml-auto hover:bg-background/80 transition-apple"
                          onClick={() => setExpandedPing(expandedPing === ping.id ? null : ping.id)}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                        {expandedPing === ping.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <button
                              onClick={() => handleDeletePing(ping.id)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              Delete Ping
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{ping.profiles?.username} · {new Date(ping.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <p className="mb-4 text-foreground/90 break-words">
                <ParsedText text={ping.content} />
              </p>
              
              {ping.image_url && (
                <img
                  src={ping.image_url}
                  alt="Ping image"
                  loading="lazy"
                  className="rounded-2xl w-full mb-4 max-h-96 object-cover"
                />
              )}
              
              <div className="flex items-center gap-6 mb-4">
                <button
                  onClick={() => handleLike(ping.id)}
                  className={`flex items-center gap-2 transition-apple group ${
                    ping.likes?.some(like => like.user_id === user?.id)
                      ? 'text-destructive'
                      : 'text-muted-foreground hover:text-destructive'
                  }`}
                >
                  <Heart className={`h-5 w-5 group-hover:animate-bounce-subtle ${
                    ping.likes?.some(like => like.user_id === user?.id) ? 'fill-destructive' : ''
                  }`} />
                  <span className="text-sm font-medium">{ping.likes?.length || 0}</span>
                </button>
                <button
                  onClick={async () => {
                    const isExpanding = expandedPing !== ping.id;
                    toggleComments(ping.id);
                    if (isExpanding) {
                      logger.debug('Home.tsx: Incrementing views for ping', { pingId: ping.id });
                      const { error: rpcError } = await supabase.rpc('increment_ping_views', { _ping_id: ping.id });
                      if (rpcError) {
                        logger.error('Home.tsx: Error incrementing ping views', rpcError);
                      } else {
                        logger.info('Home.tsx: Ping views successfully updated via RPC. Realtime listener will update state.');
                      }
                    }
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-apple"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{ping.comments?.length || 0}</span>
                </button>
                <button
                  onClick={() => handleShare(ping)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-apple"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 text-muted-foreground ml-auto">
                  <Eye className="h-5 w-5" />
                  <span className="text-sm font-medium">{ping.views.toLocaleString()}</span>
                </div>
              </div>

              {expandedPing === ping.id && (
                <div className="mt-4 pt-4 border-t border-border/50 animate-fade-in space-y-4">
                  {(ping.comments || []).map((comment) => (
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
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText[ping.id] || ''}
                      onChange={(e) => setCommentText({ ...commentText, [ping.id]: e.target.value })}
                      onFocus={() => setFocusedCommentPing(ping.id)}
                      onBlur={() => setFocusedCommentPing(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleComment(ping.id);
                        }
                      }}
                      className="h-12 pr-12 rounded-3xl glass-strong border-border/50 transition-apple px-4 w-full bg-transparent focus:outline-none"
                    />
                    <button
                      onClick={() => handleComment(ping.id)}
                      disabled={!commentText[ping.id]?.trim()}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 transition-apple ${
                        commentText[ping.id]?.trim()
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
 
       <div className={focusedCommentPing ? 'blur-sm pointer-events-none' : ''}>
         <Navigation />
       </div>

       {/* Sentinel element for infinite scrolling */}
       <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center">
         {hasMore && isLoadingMore && (
           <div className="flex items-center gap-2 text-primary font-medium">
             <LoadingSpinner />
             Loading more pings...
           </div>
         )}
         {!hasMore && posts.length > 0 && (
           <p className="text-sm text-muted-foreground">You've reached the end of the feed.</p>
         )}
         {posts.length === 0 && !loading && (
            <p className="text-center text-muted-foreground pt-4">No pings found. Be the first to post!</p>
         )}
       </div>
     </div>
   );
 };
export default Home;
