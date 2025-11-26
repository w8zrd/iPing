import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

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
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  } | null;
}

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostAndComments = async () => {
      setLoading(true);
      setError(null);
      
      if (!id) {
        setError("Post ID is missing.");
        setLoading(false);
        return;
      }

      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from('pings')
        .select('*, profiles(username)')
        .eq('id', id)
        .single();

      if (postError) {
        console.error('Error fetching post:', postError);
        setError('Failed to fetch post.');
        setLoading(false);
        return;
      }

      // Fetch like count for the post
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('post_id', postData.id);

      // Fetch comments for the post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('post_id', id)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        setError('Failed to fetch comments.');
        setLoading(false);
        return;
      }
      
      setPost({ ...postData, likes: likesCount || 0, comments: commentsData.length } as Post);
      setComments(commentsData as Comment[]);
      setLoading(false);
    };

    fetchPostAndComments();

    // Set up real-time subscription for new comments
    const commentChannel = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${id}` }, payload => {
        const newComment = payload.new as Comment;
        setComments((prevComments) => [newComment, ...prevComments]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentChannel);
    };
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      alert('You must be logged in to comment.');
      return;
    }

    if (!post) {
      setError("Cannot add comment: Post not loaded.");
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([
        { post_id: post.id, user_id: user.data.user.id, content: newComment }
      ]);

    if (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment.');
    } else {
      console.log('Comment added:', data);
      setNewComment('');
      // The real-time subscription will update the comments state
    }
  };

  if (loading) return <p>Loading post details...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!post) return <p>Post not found.</p>;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center mb-4">
          <img
            src="https://i.pravatar.cc/50"
            alt="Avatar"
            className="w-10 h-10 rounded-full mr-4"
          />
          <h3 className="font-bold">{post.profiles?.username || 'Unknown User'}</h3>
        </div>
        <p className="mb-4">{post.content}</p>
        <div className="flex justify-between text-gray-500">
          <span>{post.likes} Likes</span>
          <span>{post.comments} Comments</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h4 className="font-bold mb-2">Comments</h4>
        <form onSubmit={handleAddComment} className="mb-4">
          <textarea
            className="w-full p-2 border rounded-md mb-2"
            rows={3}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          ></textarea>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Add Comment
          </button>
        </form>
        {comments.length === 0 && <p>No comments yet. Be the first to comment!</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="border-t pt-2 mt-2">
            <p className="text-sm font-bold">{comment.profiles?.username || 'Unknown User'}</p>
            <p className="text-sm">{comment.content}</p>
            <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostDetail;