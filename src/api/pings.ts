import { supabase } from "../lib/supabase";
import { Profile, Ping } from "../types"; // Import Profile and Ping types

/**
 * Toggles a like interaction for a ping.
 * Uses a Supabase RPC to handle the insert/upsert logic on the server.
 * @param ping_id The ID of the ping to like/unlike.
 * @param is_liked Current like status.
 */
export async function toggleLike(ping_id: string, is_liked: boolean) {
  if (is_liked) {
    // Unlike: delete interaction
    const { error } = await supabase.rpc('delete_ping_interaction', {
      p_ping_id: ping_id,
      p_interaction_type: 'LIKE',
    });

    if (error) throw new Error(error.message);
  } else {
    // Like: create interaction
    const { error } = await supabase.rpc('create_ping_interaction', {
      p_ping_id: ping_id,
      p_interaction_type: 'LIKE',
    });
    
    if (error) throw new Error(error.message);
  }
}

/**
 * Fetches the user feed, including pings from followed users and popular pings.
 * Also fetches the current user's like/repost status and counts for each ping.
 * @param from The starting row index for pagination.
 * @param to The ending row index for pagination.
 */
export async function fetchFeedPings(from: number = 0, to: number = 50): Promise<Array<Ping & {
  profiles: Profile & {is_admin: boolean}; 
  like_count: number; 
  repost_count: number; 
  is_liked: boolean; 
  is_reposted: boolean;
}>> {
  const { data, error } = await supabase
    .from('pings')
    .select(`
      *,
      profiles(id, username, display_name, verified, is_admin)
      `)
    .range(from, to)
    .order('created_at', { ascending: false }); // Will refine sorting later

  if (error) {
    throw new Error(error.message);
  }

  // NOTE: Counts and interaction status are currently mocked.
  return data.map(ping => ({
    ...ping,
    // The select on a many-to-one relationship returns an array of one item
    profiles: Array.isArray(ping.profiles) ? ping.profiles : ping.profiles, // Corrected mock data access from array to first element based on common Supabase select structure.
    like_count: 0,
    repost_count: 0,
    is_liked: false,
    is_reposted: false,
  }));
}

/**
 * Toggles a repost interaction for a ping.
 * Uses a Supabase RPC to handle the insert/upsert logic on the server.
 * @param ping_id The ID of the ping to repost/unrepost.
 * @param is_reposted Current repost status.
 */
export async function toggleRepost(ping_id: string, is_reposted: boolean) {
  if (is_reposted) {
    // Unrepost: delete interaction
    const { error } = await supabase.rpc('delete_ping_interaction', {
      p_ping_id: ping_id,
      p_interaction_type: 'REPOST',
    });

    if (error) throw new Error(error.message);
  } else {
    // Repost: create interaction
    const { error } = await supabase.rpc('create_ping_interaction', {
      p_ping_id: ping_id,
      p_interaction_type: 'REPOST',
    });
    
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
    profiles(id, username, display_name, verified, is_admin)
    `);

  if (error) {
    throw new Error(error.message);
  }

  // Return the newly created ping data, potentially with profile info if RLS allows selection on insert.
  // For now, return data which is typically the inserted row.
  return data;
}