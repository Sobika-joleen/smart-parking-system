import { createClient } from '@supabase/supabase-js';

// Fallback to dummy values so the app doesn't crash on boot if .env is missing
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
