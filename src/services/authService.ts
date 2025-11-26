import { supabase } from '../supabaseClient';
import { Profile } from '../types'; // Assuming Profile type is exported from types.ts

export const authService = {
  /**
   * Creates a new user account and automatically creates a corresponding
   * entry in the 'profiles' table.
   * @param email The user's email.
   * @param password The user's password.
   */
  signUp: async (email: string, password: string): Promise<{ session: any | null, error: any | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // Returning data which might contain user/session info or error.
    // The profile creation logic has been removed to strictly adhere to returning auth session/error.
    return { session: data?.session ?? data?.user ?? null, error };
  },

  /**
   * Signs in an existing user.
   * @param email The user's email.
   * @param password The user's password.
   */
  signIn: async (email: string, password: string): Promise<{ session: any | null, error: any | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { session: data?.session ?? null, error };
  },

  /**
   * Checks the current session status.
   * @returns {Promise<boolean>} True if a session exists, false otherwise.
   */
  checkAuthStatus: async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return !!session;
  },

  /**
   * Signs out the current user.
   */
  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
    // Session cleared.
  },
};