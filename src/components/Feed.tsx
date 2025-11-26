import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { logger } from '../lib/logger';

interface Post {
  id: number;
  author_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  } | null;
  likes: number;
  comments: number;
  views: number;
  engagement_score?: number;
}

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('pings')
        .select('*, profiles(username), views')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching posts', error, { userMessage: 'Failed to fetch posts.' });
        setError('Failed to fetch posts.');
      } else {
        const postsWithCounts = await Promise.all(data.map(async (post) => {
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact' })
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact' })
            .eq('post_id', post.id);

          const engagementScore = (likesCount || 0) * 2 + (commentsCount || 0) + (post.views || 0) / 2;
          return { ...post, likes: likesCount || 0, comments: commentsCount || 0, views: post.views || 0, engagement_score: engagementScore };
        }));
        // Sort posts by engagement_score (descending) then by created_at (descending)
        const sortedPosts = postsWithCounts.sort((a, b) => {
          if (b.engagement_score !== a.engagement_score) {
            return b.engagement_score - a.engagement_score;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setPosts(sortedPosts as Post[]);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {posts.length === 0 && <p>No posts yet. Be the first to ping!</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post: initialPost }) => {
  const [post, setPost] = useState(initialPost);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    const checkLikeStatus = async () => {
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact' })
          .eq('post_id', post.id)
          .eq('user_id', user.data.user.id);
        setHasLiked(count! > 0);
      }
    };
    checkLikeStatus();

    const channel = supabase
      .channel(`post_likes_${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setPost(prevPost => ({ ...prevPost, likes: prevPost.likes + 1 }));
        } else if (payload.eventType === 'DELETE') {
          setPost(prevPost => ({ ...prevPost, likes: prevPost.likes - 1 }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id]);

  const handleLike = async () => {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      alert('You must be logged in to like a post.');
      return;
    }

    if (hasLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.data.user.id);

      if (error) {
        logger.error('Error unliking post', error, { userMessage: 'Failed to unlike post.' });
      } else {
        setHasLiked(false);
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert([
          { post_id: post.id, user_id: user.data.user.id }
        ]);

      if (error) {
        logger.error('Error liking post', error, { userMessage: 'Failed to like post.' });
      } else {
        setHasLiked(true);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center mb-4">
        <img
          src="https://i.pravatar.cc/50"
          alt="Avatar"
          className="w-10 h-10 rounded-full mr-4"
        />
        <h3 className="font-bold">{post.profiles?.username || 'Unknown User'}</h3>
      </div>
      <Link to={`/post/${post.id}`}>
        <p className="mb-4">{post.content}</p>
      </Link>
      <div className="flex justify-between text-gray-500">
        <button
          onClick={handleLike}
          className={`hover:text-blue-500 ${hasLiked ? 'text-blue-500' : ''}`}
        >
          {post.likes} {post.likes === 1 ? 'Like' : 'Likes'}
        </button>
        <Link to={`/post/${post.id}`} className="hover:text-blue-500">
          {post.comments} Comments
        </Link>
      </div>
    </div>
  );
};

export default Feed;