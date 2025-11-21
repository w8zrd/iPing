import React from 'react';

const Feed: React.FC = () => {
  // Dummy data for now
  const posts = [
    {
      id: 1,
      author: 'John Doe',
      content: 'This is my first post!',
      likes: 10,
      comments: 5,
    },
    {
      id: 2,
      author: 'Jane Doe',
      content: 'Just setting up my new social media account!',
      likes: 15,
      comments: 8,
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center mb-4">
            <img
              src="https://i.pravatar.cc/50"
              alt="Avatar"
              className="w-10 h-10 rounded-full mr-4"
            />
            <h3 className="font-bold">{post.author}</h3>
          </div>
          <p className="mb-4">{post.content}</p>
          <div className="flex justify-between text-gray-500">
            <button className="hover:text-blue-500">{post.likes} Likes</button>
            <button className="hover:text-blue-500">
              {post.comments} Comments
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Feed;