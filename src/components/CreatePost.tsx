import React, { useState } from 'react';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { logger } from '@/lib/logger';
import { uploadMedia } from '@/api/storage';
import { createPing } from '@/api/pings';
import { Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreatePingProps {
  onPostCreated?: () => void;
}

const CreatePing: React.FC<CreatePingProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imageFile) || !user || isPinging || uploading) return;

    setIsPinging(true);
    let imageUrl: string | undefined;

    try {
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadMedia(imageFile);
        setUploading(false);
      }

      await createPing({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
      });

      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setIsFocused(false); // Reset focus
      logger.info('Ping created successfully!');
      toast({ title: 'Posted!', description: 'Your ping has been sent.' });
      if (onPostCreated) onPostCreated();
    } catch (error: any) {
      console.error('Post creation error:', error);
      toast({
        title: 'Error posting',
        description: error.message || 'Could not send ping. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPinging(false);
      setUploading(false);
    }
  };

  return (
    <>
      {isFocused && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsFocused(false)}
        />
      )}
      <div className={`w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-4 mb-4 transition-all duration-300 ${isFocused ? 'relative z-50 scale-105' : ''}`}>
        <form onSubmit={handleSubmit}>
          <textarea
            id="content-input"
            name="content-input"
            className="w-full p-2 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="What's on your mind? Add an image for extra flair!"
            rows={imagePreview ? 4 : 2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
          
          {imagePreview && (
            <div className="relative mt-3 mb-3">
              <img src={imagePreview} alt="Preview" className="max-h-64 object-cover w-full rounded-lg border" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full text-white hover:bg-opacity-75 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mt-3">
            <label htmlFor="media-upload" className="cursor-pointer text-blue-500 hover:text-blue-700 transition inline-flex items-center">
              <ImageIcon className="h-6 w-6" />
              <input
                id="media-upload"
                name="media-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isPinging || uploading}
              />
            </label>
            <button
              type="button"
              disabled={isPinging || uploading || (!content.trim() && !imageFile) || !user}
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                isPinging || uploading || (!content.trim() && !imageFile) || !user
                  ? 'bg-gray-400 cursor-not-allowed text-gray-700 border border-transparent'
                  : 'bg-blue-500 text-white hover:bg-blue-600 border border-transparent'
              }`}
            >
              {isPinging || uploading ? (uploading ? 'Uploading...' : 'Pinging...') : 'Ping'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreatePing;