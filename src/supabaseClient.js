import { createClient } from '@supabase/supabase-js';

// Fallback to dummy values so the app doesn't crash on boot if .env is missing
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder-domain.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
