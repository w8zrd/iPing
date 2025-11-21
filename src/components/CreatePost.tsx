import React, { useState } from 'react';

const CreatePost: React.FC = () => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle post creation logic here
    console.log('New post:', content);
    setContent('');
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
          className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-2 hover:bg-blue-600"
        >
          Post
        </button>
      </form>
    </div>
  );
};

export default CreatePost;