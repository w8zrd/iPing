// Step 2: Data Layer Setup - Core Supabase Table Interfaces
 
/**
 * Profile Table Interface
 * Reflects: username (string), bio (string | null), avatar_url (string | null), auth.id (string), is_admin (boolean)
 */
export interface Profile {
    id: string; // Foreign key to auth.users.id
    username: string;
    bio: string | null;
    avatar_url: string | null;
    is_admin: boolean; // Added for new schema
}
 
/**
 * Ping Table Interface
 * Reflects: id (number/string), user_id (string, FK to profile), content (string), image_url (string | null), created_at (timestamp)
 */
export interface Ping {
    id: string | number;
    user_id: string; // Foreign key to profiles.id
    content: string;
    image_url: string | null;
    created_at: string; // Using string for timestamp representation
}
 
/**
 * Friendship Table Interface
 * Reflects: user_a_id (string), user_b_id (string), status (enum/string: 'pending', 'accepted', 'blocked'). Composite PK.
 */
export interface Friendship {
    user_a_id: string; // Foreign key to profiles.id
    user_b_id: string; // Foreign key to profiles.id
    status: 'pending' | 'accepted' | 'blocked';
}
 
/**
 * Notification Table Interface
 * Reflects: id (number/string), recipient_id (string, FK to profile), message (string), type (enum/string: 'friend_request', 'post_like', 'mention'), read (boolean).
 */
export interface Notification {
    id: string | number;
    recipient_id: string; // Foreign key to profiles.id
    message: string;
    type: 'friend_request' | 'post_like' | 'mention';
    read: boolean;
}

/**
 * Ping Interaction Table Interface
 * Reflects: ping_id (uuid), user_id (uuid), interaction_type ('LIKE' | 'REPOST')
 */
export interface PingInteraction {
    ping_id: string;
    user_id: string;
    interaction_type: 'LIKE' | 'REPOST';
    created_at: string;
}