import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CreatePost: React.FC = () => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || isPosting) return;

    setIsPosting(true);
    
    const { error } = await supabase
      .from('posts')
      .insert([
        { user_id: user.id, content: content.trim() }
      ]);
      
    setIsPosting(false);

    if (error) {
      console.error('Error creating post:', error);
      // We need a better error handling mechanism, but for debug now:
      alert(`Post creation failed: ${error.message}`);
    } else {
      setContent('');
      console.log('Post created successfully!');
      // Assuming a mechanism exists to refresh the feed
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-4 mb-4">
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-2 border rounded-lg"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          type="submit"
          disabled={isPosting || !content.trim() || !user}
          className={`px-4 py-2 rounded-lg mt-2 transition-colors ${
            isPosting || !content.trim() || !user
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isPosting ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;