import { createClient } from '@supabase/supabase-js';
import { debugError } from '../utils/debug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast when env vars are missing so we don't silently use a mock client
if (!supabaseUrl || !supabaseAnonKey) {
  debugError('🚨 Missing Supabase environment variables!');
  debugError('📝 Please create a .env file in the frontend directory with:');
  debugError('   VITE_SUPABASE_URL=your-supabase-url');
  debugError('   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key');
  debugError('🔧 You can run: ./setup-env.sh to create the template file');
  throw new Error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Create the Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Ensure session persists reliably across external redirects (e.g., Stripe)
    storage: window.localStorage,
    storageKey: 'daygen-auth',
    // PKCE flow is recommended for SPAs and helps with robust session handling
    flowType: 'pkce',
  },
});

export const supabase = supabaseClient;
