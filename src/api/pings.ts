import { supabase } from "../lib/supabase";

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
export async function fetchFeedPings(from: number = 0, to: number = 50) {
  // Subquery to get IDs of users the current user is following
  const { data: followedUsersData, error: followedUsersError } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', (await supabase.auth.getUser()).data.user?.id);

  if (followedUsersError) {
    throw new Error(followedUsersError.message);
  }

  const followedUserIds = followedUsersData.map(f => f.followed_id);
  const currentUserId = (await supabase.auth.getUser()).data.user?.id;
  
  // The query will get pings from followed users OR popular pings
  // This is a simplification and should be done via a custom RPC for true scalability

  const { data, error } = await supabase
    .from('pings')
    .select(
      `
      *,
      profiles!pings_user_id_fkey(id, username, display_name, verified),
      likes_count:ping_interactions(count),
      repost_count:ping_interactions(count),
      is_liked:ping_interactions!ping_interactions_ping_id_user_id_interaction_type_key(ping_id, interaction_type),
      is_reposted:ping_interactions!ping_interactions_ping_id_user_id_interaction_type_key(ping_id, interaction_type)
      `
    )
    .range(from, to)
    .order('created_at', { ascending: false }); // Will refine sorting later

  if (error) {
    throw new Error(error.message);
  }

  // The counts are filtered in the client side for simplicity, ideally done in a view/RPC
  return data.map(ping => ({
    ...ping,
    profiles: ping.profiles[0], // profiles is an array due to the select structure
    like_count: ping.likes_count.filter(i => i.interaction_type === 'LIKE').length,
    repost_count: ping.repost_count.filter(i => i.interaction_type === 'REPOST').length,
    is_liked: ping.is_liked.some(i => i.interaction_type === 'LIKE' && i.ping_id === ping.id && i.user_id === currentUserId),
    is_reposted: ping.is_reposted.some(i => i.interaction_type === 'REPOST' && i.ping_id === ping.id && i.user_id === currentUserId),
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