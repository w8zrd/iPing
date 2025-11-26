import { supabase } from "../lib/supabase";

/**
 * Uploads a media file (e.g., image) to Supabase Storage.
 * @param file The file object to upload.
 * @returns The public URL of the uploaded file.
 */
export async function uploadMedia(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${(await supabase.auth.getUser()).data.user?.id}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('media') // Assuming a storage bucket named 'media'
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('media')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}