import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Production values
const supabaseUrl = 'https://cpzxnbhpzsssyhpuhsgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwenhuYmhwenNzc3locHVoc2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjExMDMsImV4cCI6MjA2ODY5NzEwM30.xB3KJ6FYeS5U08We1JqgSajutrdJ3vIvbRZVHmxUACc';

let supabase: any = null;

// Only initialize if we have valid credentials
if (supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.includes('supabase.co') && 
    supabaseAnonKey.length > 50) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Disable session persistence to avoid CORS issues
      },
      global: {
        fetch: (url, options = {}) => {
          // Add timeout and better error handling to all fetch requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => {
            clearTimeout(timeoutId);
          }).catch(error => {
            if (error.name === 'AbortError') {
              throw new Error('Request timeout - please check your connection');
            }
            throw error;
          });
        }
      }
    });
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.error('⚠️ Supabase initialization failed:', error);
  }
} else {
  console.error('⚠️ Supabase credentials not configured. Please update the hardcoded values in src/lib/supabase.ts');
}

// Export a mock client if Supabase is not available
export { supabase };

type Database = {
  public: {
    Tables: {
      roster_entries: {
        Row: {
          id: string;
          date: string;
          shift_type: string;
          assigned_name: string;
          last_edited_by: string;
          last_edited_at: string;
          created_at: string;
          change_description: string;
          text_color?: string;
        };
        Insert: {
          id?: string;
          date: string;
          shift_type: string;
          assigned_name: string;
          last_edited_by: string;
          last_edited_at: string;
          created_at?: string;
          change_description?: string;
          text_color?: string;
        };
        Update: {
          id?: string;
          date?: string;
          shift_type?: string;
          assigned_name?: string;
          last_edited_by?: string;
          last_edited_at?: string;
          created_at?: string;
          change_description?: string;
          text_color?: string;
        };
      };
    };
  };
};