import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is missing. Administrative storage operations will fail.'
    );
  }
}

// Bypasses Row Level Security (RLS) on server-side.
// DO NOT import this in Client Components.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
