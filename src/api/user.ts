import { supabase } from "../lib/supabase";

/**
 * Follows a user by inserting a row into the 'follows' table.
 * The follower_id is automatically set via RLS policy (auth.uid()).
 * @param user_to_follow_id The ID of the user to follow.
 */
export async function followUser(user_to_follow_id: string) {
  const { error } = await supabase
    .from("follows")
    .insert({
      followed_id: user_to_follow_id,
    });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Unfollows a user by deleting a row from the 'follows' table.
 * The follower_id is automatically checked via RLS policy (auth.uid()).
 * @param user_to_unfollow_id The ID of the user to unfollow.
 */
export async function unfollowUser(user_to_unfollow_id: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("followed_id", user_to_unfollow_id);
    // follower_id is implicitly checked by RLS policy

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Checks if the current authenticated user is following the target user.
 * @param target_user_id The ID of the user to check the following status for.
 * @returns A promise that resolves to a boolean: true if following, false otherwise.
 */
export async function isFollowing(target_user_id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("followed_id", target_user_id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows found (not following)
    throw new Error(error.message);
  }

  // If data exists, it means a row was found, and the user is following.
  return !!data;
}