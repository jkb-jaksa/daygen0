import { createClient } from '@supabase/supabase-js';
import { debugError, debugWarn } from '../utils/debug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development and provide helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
  debugError('🚨 Missing Supabase environment variables!');
  debugError('📝 Please create a .env file in the frontend directory with:');
  debugError('   VITE_SUPABASE_URL=your-supabase-url');
  debugError('   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key');
  debugError('🔧 You can run: ./setup-env.sh to create the template file');
  
  // In development, we'll create a mock client to prevent crashes
  if (import.meta.env.DEV) {
    debugWarn('⚠️  Using mock Supabase client in development mode');
  } else {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
  }
}

// Create the Supabase client
let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  // Use mock client in development when keys are missing
  supabaseClient = createClient('https://mock.supabase.co', 'mock-key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
} else {
  // Use real Supabase client
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Ensure session persists reliably across external redirects (e.g., Stripe)
      storage: window.localStorage,
      storageKey: 'daygen-auth',
      // PKCE flow is recommended for SPAs and helps with robust session handling
      flowType: 'pkce',
    },
  });
}

export const supabase = supabaseClient;
