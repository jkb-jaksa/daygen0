import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development and provide helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Missing Supabase environment variables!');
  console.error('📝 Please create a .env file in the frontend directory with:');
  console.error('   VITE_SUPABASE_URL=your-supabase-url');
  console.error('   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key');
  console.error('🔧 You can run: ./setup-env.sh to create the template file');
  
  // In development, we'll create a mock client to prevent crashes
  if (import.meta.env.DEV) {
    console.warn('⚠️  Using mock Supabase client in development mode');
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
    },
  });
}

export const supabase = supabaseClient;
