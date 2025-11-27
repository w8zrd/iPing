import { supabase } from '../supabaseClient';
import type { Profile, Ping } from '../types';

// Renaming class to ApiService for a more general purpose, incorporating profile and post logic
export class ApiService {
    private async getUserId(): Promise<string | null> {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.id ?? null;
    }

    /**
     * Retrieves the current user's profile from the profiles table.
     */
    async fetchOwnProfile(): Promise<Profile | null> {
        const userId = await this.getUserId();
        if (!userId) {
            console.error('User not authenticated to fetch profile.');
            return null;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error.message);
            return null;
        }

        // Supabase returns data as Ping or null if not found (though single() might throw error if not found depending on setup)
        return data as Profile | null;
    }

    /**
     * Updates the current user's profile in the profiles table.
     * @param updates Partial Profile data to update.
     */
    async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
        const userId = await this.getUserId();
        if (!userId) {
            console.error('User not authenticated to update profile.');
            return null;
        }

        // Ensure we only try to update fields that exist in Profile and are allowed updates
        const allowedUpdates: Partial<Profile> = {
            username: updates.username,
            display_name: updates.display_name, // Added display_name
            bio: updates.bio,
            location: updates.location, // Added location
            avatar_url: updates.avatar_url,
        };
        
        // Remove null/undefined values from allowedUpdates
        const finalUpdates: Partial<Profile> = Object.fromEntries(
            Object.entries(allowedUpdates).filter(([, value]) => value !== undefined && value !== null)
        ) as Partial<Profile>;

        if (Object.keys(finalUpdates).length === 0) {
            console.warn('No valid updates provided for profile.');
            return this.fetchOwnProfile(); // Return current profile if no updates
        }
        
        const { data, error } = await supabase
            .from('profiles')
            .update(finalUpdates)
            .eq('id', userId)
            .select() // Return the updated record
            .single();

        if (error) {
            console.error('Error updating profile:', error.message);
            return null;
        }

        return data as Profile;
    }

    /**
     * Uploads a user avatar file to Supabase Storage and updates the avatar_url in the profile.
     * @param file The File object to upload.
     */
    async uploadAvatar(file: File): Promise<Profile | null> {
        const userId = await this.getUserId();
        if (!userId) {
            console.error('User not authenticated to upload avatar.');
            return null;
        }

        const fileExtension = file.name.split('.').pop() || 'png';
        const filePath = `avatars/${userId}/${Date.now()}_${file.name}`; // Use timestamp for unique path

        // 1. Upload the file
        const { error: uploadError } = await supabase.storage
            .from('avatars') // Assuming 'avatars' bucket exists
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true, // Overwrite existing file with the same path
            });

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError.message);
            return null;
        }

        // 2. Get the public URL for the uploaded file
        const publicUrl = supabase.storage
            .from('avatars') // Assuming 'avatars' bucket exists
            .getPublicUrl(filePath).data.publicUrl;

        // 3. Update the profile with the new avatar URL
        return this.updateProfile({ avatar_url: publicUrl });
    }
    
    // --- STEP 6: POST CREATION AND STORAGE LOGIC ---

    /**
     * Creates a new post, optionally uploading an image first.
     * @param content The text content of the post.
     * @param imageFile Optional File object for the image.
     */
    async createPost(content: string, imageFile?: File): Promise<Ping | null> {
        const userId = await this.getUserId();
        if (!userId) {
            console.error('User not authenticated to create post.');
            return null;
        }

        let imageUrl: string | undefined = undefined;

        // 1. Handle Image Upload if provided
        if (imageFile) {
            const fileExtension = imageFile.name.split('.').pop() || 'png';
            // Use a unique path in the 'posts' bucket
            const filePath = `posts/${userId}/${Date.now()}_${imageFile.name}`;

            const { error: uploadError } = await supabase.storage
                .from('posts') // Assuming 'posts' bucket exists
                .upload(filePath, imageFile, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Error uploading post image:', uploadError.message);
                // Fail post creation if image upload fails
                return null;
            }

            // 2. Get the public URL
            imageUrl = supabase.storage
                .from('posts') // Assuming 'posts' bucket exists
                .getPublicUrl(filePath).data.publicUrl;
        }

        // 3. Insert the new record into the 'posts' table
        const { data, error } = await supabase
            .from('posts') // Assuming 'posts' table exists
            .insert({
                user_id: userId,
                content: content,
                image_url: imageUrl,
            })
            .select() // Return the newly created record
            .single();

        if (error) {
            console.error('Error inserting post:', error.message);
            return null;
        }

        return data as Ping;
    }
    
    /**
     * Retrieves posts from the 'posts' table with pagination.
     * @param limit The maximum number of posts to return.
     * @param offset The number of posts to skip.
     */
    async getPosts(limit: number = 20, offset: number = 0): Promise<Ping[] | null> {
        // Fetch posts, ordered by creation time descending (latest first)
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching posts:', error.message);
            return null;
        }

        return data as Ping[] | null;
    }
}

// Export an instance for direct use, adhering to the file name 'apiService.ts'
export const apiService = new ApiService();