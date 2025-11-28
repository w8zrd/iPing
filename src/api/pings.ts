import { supabase } from "../lib/supabase";
import { Profile, Ping } from "../types"; // Import Profile and Ping types


/**
 * Fetches the user feed, including pings from followed users and popular pings.
 * Also fetches the current user's like/repost status and counts for each ping.
 * @param from The starting row index for pagination.
 * @param to The ending row index for pagination.
 */
export async function fetchFeedPings(from: number = 0, to: number = 50): Promise<Array<Ping & {
  profiles: Profile;
  likes: { id: string, user_id: string }[];
  comments: { id: string, user_id: string }[];
}>> {
  const { data, error } = await supabase
    .from('pings')
    .select(`
      *,
      profiles(id, username, display_name, verified, is_admin),
      likes(id, user_id),
      comments(id, user_id)
    `)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Array<Ping & {
    profiles: Profile;
    likes: { id: string, user_id: string }[];
    comments: { id: string, user_id: string }[];
  }>;
}

/**
 * Toggles a like for a ping.
 * @param ping_id The ID of the ping to like/unlike.
 * @param is_liked Current like status.
 */
export async function toggleLike(ping_id: string, is_liked: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated.');
  }

  if (is_liked) {
    // Unlike: delete the like
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('ping_id', ping_id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  } else {
    // Like: insert a new like
    const { error } = await supabase
      .from('likes')
      .insert({ ping_id, user_id: user.id });
    
    if (error) throw new Error(error.message);
  }
}

/**
 * Creates a new ping post.
 * @param user_id The ID of the user creating the ping.
 * @param content The text content of the ping.
 * @param image_url Optional URL for an attached image.
 */
export async function createPing({
  user_id,
  content,
  image_url,
}: {
  user_id: string;
  content: string;
  image_url?: string;
}) {
  const { data, error } = await supabase.from('pings').insert({
    user_id,
    content,
    image_url,
  }).select(`
    *,
    profiles(id, username, display_name, verified, is_admin),
    likes(id, user_id),
    comments(id, user_id)
  `);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Fetches a single ping by ID with all relations.
 * @param pingId The ID of the ping to fetch.
 */
export async function getPing(pingId: string): Promise<Ping & {
  profiles: Profile;
  likes: { id: string, user_id: string }[];
  comments: { id: string, user_id: string }[];
}> {
  const { data, error } = await supabase
    .from('pings')
    .select(`
      *,
      profiles(id, username, display_name, verified, is_admin),
      likes(id, user_id),
      comments(id, user_id)
    `)
    .eq('id', pingId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Ping & {
    profiles: Profile;
    likes: { id: string, user_id: string }[];
    comments: { id: string, user_id: string }[];
  };
}
