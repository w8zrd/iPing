import { useNavigate } from 'react-router-dom';
import { ParsedText } from '@/lib/textParser';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { useState } from 'react';
import { Check, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toggleLike, toggleRepost } from '@/api/pings';

// Reusing types from Profile.tsx/SearchResults.tsx
interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url?: string;
  user_id: string;
  like_count?: number; // Added from feed data
  repost_count?: number; // Added from feed data
  is_liked?: boolean; // Added from feed data
  is_reposted?: boolean; // Added from feed data
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
  verified: boolean;
}

interface PingCardProps {
  // Update to include new props
  post: Post & { profiles?: Profile };
  profile?: Profile;
}

const PingCard = ({ post, profile }: PingCardProps) => {
  const navigate = useNavigate();
  
  // Use embedded profile or passed profile
  const postProfile = post.profiles || post.profiles;

  if (!postProfile) return null;

  const navigateToProfile = () => navigate(`/profile/${postProfile.username}`);

  // Initialize state with props from feed, falling back to mocked values
  const [isLiked, setIsLiked] = useState(post.is_liked ?? false);
  const [isReposted, setIsReposted] = useState(post.is_reposted ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [repostCount, setRepostCount] = useState(post.repost_count ?? 0);
  const [commentCount] = useState(5); // Comments fetching not yet implemented in API

  const handleLike = async () => {
    try {
      await toggleLike(post.id, isLiked);
      setIsLiked(c => !c);
      setLikeCount(c => (isLiked ? c - 1 : c + 1));
      // In a real app, a toast or notification would be here
    } catch (error) {
      console.error('Like toggle error:', error);
      // In a real app, a toast for error would be here
    }
  };

  const handleRepost = async () => {
    try {
      await toggleRepost(post.id, isReposted);
      setIsReposted(c => !c);
      setRepostCount(c => (isReposted ? c - 1 : c + 1));
      // In a real app, a toast or notification would be here
    } catch (error) {
      console.error('Repost toggle error:', error);
      // In a real app, a toast for error would be here
    }
  };

  return (
    <div
      key={post.id}
      className="glass rounded-3xl p-6 shadow-md animate-fade-in"
      // Note: Animation delay styling is removed here as it should be controlled by the parent list.
    >
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={navigateToProfile}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-apple"
        >
          {postProfile.display_name[0]?.toUpperCase() || 'U'}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={navigateToProfile}
              className="font-semibold hover:text-primary transition-apple"
            >
              {postProfile.display_name}
            </button>
            {postProfile.verified && (
              <div className="flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                <Check className="h-3 w-3 text-white stroke-[3]" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            @{postProfile.username} · {new Date(post.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      
      <p className="text-foreground/90 mb-2">
        <ParsedText text={post.content} />
      </p>
      
      {/* Image/Media Display */}
      {post.image_url && (
        <img 
          src={post.image_url} 
          alt="Post" 
          className="rounded-2xl w-full mb-4 max-h-96 object-cover"
        />
      )}
      
      {/* Interaction Bar (New Instagram-like element) */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-4">
          <div
            onClick={handleLike}
            className="flex items-center gap-1.5 cursor-pointer transition-colors"
            style={{ color: isLiked ? 'rgb(239 68 68)' : 'var(--muted-foreground)' }}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500' : ''}`} />
            <span className="text-sm font-medium">{likeCount}</span>
          </div>

          <div
            onClick={() => navigate(`/post/${post.id}`)}
            className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{commentCount}</span>
          </div>
          
          <div
            onClick={handleRepost}
            className="flex items-center gap-1.5 cursor-pointer transition-colors"
            style={{ color: isReposted ? 'rgb(34 197 94)' : 'var(--muted-foreground)' }}
          >
            <Repeat2 className={`h-5 w-5 ${isReposted ? 'text-green-500' : ''}`} />
            <span className="text-sm font-medium">{repostCount}</span>
          </div>
        </div>
        
        {/* Placeholder for Share/More Button */}
        <Button variant="ghost" size="sm" className="rounded-full h-8 px-2 text-muted-foreground hover:text-foreground">
          ...
        </Button>
      </div>

    </div>
  );
};

export default PingCard;