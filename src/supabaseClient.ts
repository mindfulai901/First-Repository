// Fix: To resolve TypeScript errors with Vite's `import.meta.env`, we augment
// the global `ImportMeta` interface. This removes the need for the problematic
// triple-slash directive and provides type-safety for environment variables.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
      // Used for local development to bypass the Vercel proxy
      readonly VITE_ELEVENLABS_API_KEY: string;
      // Fix: Add DEV property to correctly type Vite's environment variables.
      readonly DEV: boolean;
    }
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);