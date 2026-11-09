
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Reuse one Supabase client in the browser during development
let supabaseInstance = globalThis.__timberMartSupabase;

if (!supabaseInstance) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing.');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);

  if (typeof window !== 'undefined') {
    globalThis.__timberMartSupabase = supabaseInstance;
  }
}

export const supabase = supabaseInstance;
