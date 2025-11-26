import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Heart, MessageCircle, Send, UserPlus, Check, Image as ImageIcon, X, Share2, Eye, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParsedText } from '@/lib/textParser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { logger } from '@/lib/logger';

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
  const [loading, setLoading] = useState(false);
  const [expandedPing, setExpandedPing] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [focusedCommentPing, setFocusedCommentPing] = useState<string | null>(null);
  const [pingInputFocused, setPingInputFocused] = useState(false);
  const [pingImage, setPingImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleDeletePing = async (pingId: string) => {
    if (!user) return;

    const { error } = await supabase.from('pings').delete().eq('id', pingId);

    if (error) {
      logger.error('Error deleting ping', error, { userMessage: 'Failed to delete ping. Please try again.', showToast: true });
    } else {
      setPosts((prevPosts) => prevPosts.filter((ping) => ping.id !== pingId));
      toast({
        title: 'Ping deleted!',
        description: 'Your ping has been removed.',
      });
    }
  };

  // Fetch pings
  useEffect(() => {
    fetchPings();
  }, []);

  const fetchPings = async () => {
    const { data, error } = await supabase
      .from('pings')
      .select(`
        *,
        profiles!pings_user_id_fkey(id, username, display_name, verified),
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
      logger.info('Pings fetched successfully', { data });
      setPosts(data as unknown as Post[]);
    } else {
      logger.error('Error fetching pings', error, { userMessage: 'Failed to fetch pings. Please try again.', showToast: true });
    }
  };

  // Realtime subscription for new pings
  useEffect(() => {
    const channel = supabase
      .channel('pings-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pings' }, (payload) => {
        logger.debug('Realtime INSERT received', { new: payload.new });
        setPosts((prevPosts) => [payload.new as Post, ...prevPosts]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pings' }, (payload) => {
        logger.debug('Realtime UPDATE received', { new: payload.new });
        if (payload.new.views !== undefined) {
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === payload.new.id ? { ...post, views: payload.new.views } : post
            )
          );
        } else {
          // For other updates, refetch the pings to ensure consistency
          logger.info('Other ping update, refetching all pings.');
          fetchPings();
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pings' }, (payload) => {
        logger.debug('Realtime DELETE received', { oldId: payload.old.id });
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      const { error } = await supabase.from('pings').insert({
        user_id: user.id,
        content: newPing,
        image_url: pingImage || undefined,
      });

      if (error) {
        logger.error('Home.tsx: Error creating ping', error, { userMessage: 'Failed to ping. Please try again.', showToast: true });
      } else {
        logger.info('Home.tsx: Ping created successfully.');
        setNewPing('');
        setPingImage(null);
        toast({
          title: 'Pinged!',
          description: 'Your ping is now live',
        });
        fetchPings();
      }
    } catch (error) {
      logger.error('Home.tsx: Unexpected error creating ping', error as Error, {
        userMessage: 'An unexpected error occurred while creating ping.',
        showToast: true,
      });
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
    const alreadyLiked = ping?.likes?.some(like => like.user_id === user.id);
 
    if (alreadyLiked) {
      logger.debug('Home.tsx: User unliking ping', { pingId });
      const likeId = ping?.likes?.find(like => like.user_id === user.id)?.id;
      const { error } = await supabase.from('likes').delete().eq('id', likeId);
      if (error) logger.error('Home.tsx: Error unliking ping', error);
    } else {
      logger.debug('Home.tsx: User liking ping', { pingId });
      const { error } = await supabase.from('likes').insert({ user_id: user.id, post_id: pingId });
      if (error) logger.error('Home.tsx: Error liking ping', error);
    }
    
    fetchPings();
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
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } else {
      setCommentText({ ...commentText, [pingId]: '' });
      toast({
        title: 'Comment added!',
        description: 'Your comment is now visible',
      });
      fetchPings();
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
      toast({
        title: 'Friend request sent!',
        description: `Request sent to ${displayName}`,
      });
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
          toast({
            title: 'Link copied!',
            description: 'Ping link copied to clipboard',
          });
        }
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Ping link copied to clipboard',
      });
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
            className="min-h-[100px] rounded-2xl border-border/50 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-apple mb-4 p-2 w-full bg-transparent"
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
                className="w-full h-12 rounded-2xl border border-border/50 bg-background/50 hover:bg-background/80 transition-apple"
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
              className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 font-semibold transition-apple disabled:opacity-50 disabled:cursor-not-allowed"
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
                        logger.info('Home.tsx: Ping views incremented successfully', { pingId: ping.id });
                        setPosts((prevPosts) =>
                          prevPosts.map((p) =>
                            p.id === ping.id ? { ...p, views: p.views + 1 } : p
                          )
                        );
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
     </div>
   );
 };
 
export default Home;
