/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL available at build time.');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL read:', supabaseUrl);
  console.error('Supabase Key read:', supabaseAnonKey ? 'KEY FOUND' : 'KEY MISSING');
  throw new Error('FATAL_ENV_ERROR: Supabase URL and anon key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);