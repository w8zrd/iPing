import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { logger } from '@/lib/logger';

const CreatePing: React.FC = () => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isPinging, setIsPinging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || isPinging) return;

    setIsPinging(true);
    
    const { error } = await supabase
      .from('pings')
      .insert([
        { user_id: user.id, content: content.trim() }
      ]);
      
    setIsPinging(false);

    if (error) {
      logger.error('Error creating ping', error, { userMessage: `Ping creation failed: ${error.message}`, showToast: true });
    } else {
      setContent('');
      logger.info('Ping created successfully!');
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
          disabled={isPinging || !content.trim() || !user}
          className={`px-4 py-2 rounded-lg mt-2 transition-colors ${
            isPinging || !content.trim() || !user
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isPinging ? 'Pinging...' : 'Ping'}
        </button>
      </form>
    </div>
  );
};

export default CreatePing;