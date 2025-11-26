import { createClient } from 'supabase-js';

// Environment variables are loaded via Vite's import.meta.env
// These should correspond to the variables set in .env or .env.production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Initialize the Supabase Client
// Added check for existence in case of build environment issues, though unlikely in this setup
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export the initialized client instance for use across the application
export { supabase };