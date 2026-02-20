import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase configuration for mobile compatibility
const supabaseUrl = 'https://nmlroqlmtelytoghuyos.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbHJvcWxtdGVseXRvZ2h1eW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTA0OTgsImV4cCI6MjA3MDY4NjQ5OH0.qnAd6-BSzNMZux6RxtQmGr5OyPYkne--y1ekccVlCeE';

// Mobile PWA detection
const isMobilePWA = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android/.test(userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
  return isMobile && isStandalone;
};

// Enhanced mobile detection
const isMobileDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android|mobile/.test(userAgent);
};

// Initialize Supabase client with error handling
let supabase: any = null;

try {
  // Validate configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials are missing');
  }

  // Validate URL format
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
  }

  // Mobile devices require special handling
  const isMobile = isMobileDevice();
  const isPWA = isMobilePWA();
  
  const mobileConfig = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: isMobile ? 1 : 10,
      },
      timeout: isMobile ? 180000 : 15000, // 3 minutes for mobile
      heartbeatIntervalMs: isMobile ? 300000 : 30000, // 5 minutes for mobile
    },
    global: {
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), isMobile ? 180000 : 15000);
        
        // Create headers with mobile-specific handling
        const headers = new Headers();
        
        // Copy existing headers first
        if (options.headers) {
          if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => headers.set(key, value));
          } else if (typeof options.headers === 'object') {
            Object.entries(options.headers).forEach(([key, value]) => {
              if (typeof value === 'string') headers.set(key, value);
            });
          }
        }
        
        // Always include the API key - critical for mobile
        headers.set('apikey', supabaseAnonKey);
        headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
        headers.set('Content-Type', 'application/json');
        headers.set('Accept', 'application/json');
        headers.set('X-Requested-With', 'XMLHttpRequest');
        
        // Mobile-specific headers
        if (isMobile) {
          headers.set('X-Client-Info', `golden-store-mobile-${isPWA ? 'pwa' : 'browser'}`);
          headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          headers.set('Pragma', 'no-cache');
          headers.set('Expires', '0');
        } else {
          headers.set('Cache-Control', 'no-cache');
          headers.set('X-Client-Info', 'golden-store-desktop');
        }
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit',
          headers: headers,
          // Mobile-specific fetch options
          ...(isMobile && {
            referrerPolicy: 'no-referrer',
            keepalive: false,
            redirect: 'follow'
          })
        }).then(response => {
          clearTimeout(timeoutId);
          return response;
        }).catch(error => {
          clearTimeout(timeoutId);
          throw error;
        });
      },
    },
  };

  supabase = createClient(supabaseUrl, supabaseAnonKey, mobileConfig);

} catch (error) {
  supabase = null;
}

export { supabase };

// Database types for Golden Price List app
export type Database = {
  public: {
    Tables: {
      price_items: {
        Row: {
          id: string;
          name: string;
          price: number;
          gross_price: number;
          created_at: string;
          last_edited_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          gross_price?: number;
          created_at?: string;
          last_edited_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          gross_price?: number;
          created_at?: string;
          last_edited_at?: string | null;
        };
      };
      over_items: {
        Row: {
          id: string;
          name: string;
          created_at: string | null;
          is_completed: boolean | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string | null;
          is_completed?: boolean | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string | null;
          is_completed?: boolean | null;
          completed_at?: string | null;
        };
      };
      order_categories: {
        Row: {
          id: string;
          name: string;
          vat_percentage: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          vat_percentage?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          vat_percentage?: number | null;
          created_at?: string | null;
        };
      };
      order_item_templates: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          unit_price: number;
          is_vat_nil: boolean | null;
          is_vat_included: boolean | null;
          vat_percentage: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          unit_price: number;
          is_vat_nil?: boolean | null;
          is_vat_included?: boolean | null;
          vat_percentage?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          unit_price?: number;
          is_vat_nil?: boolean | null;
          is_vat_included?: boolean | null;
          vat_percentage?: number | null;
          created_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          category_id: string | null;
          order_date: string | null;
          total_cost: number | null;
          created_at: string | null;
          last_edited_at: string | null;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          order_date?: string | null;
          total_cost?: number | null;
          created_at?: string | null;
          last_edited_at?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          order_date?: string | null;
          total_cost?: number | null;
          created_at?: string | null;
          last_edited_at?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string | null;
          template_id: string | null;
          quantity: number;
          unit_price: number;
          is_vat_nil: boolean | null;
          is_vat_included: boolean | null;
          vat_amount: number | null;
          total_price: number;
          is_available: boolean | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          template_id?: string | null;
          quantity: number;
          unit_price: number;
          is_vat_nil?: boolean | null;
          is_vat_included?: boolean | null;
          vat_amount?: number | null;
          total_price: number;
          is_available?: boolean | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          template_id?: string | null;
          quantity?: number;
          unit_price?: number;
          is_vat_nil?: boolean | null;
          is_vat_included?: boolean | null;
          vat_amount?: number | null;
          total_price?: number;
          is_available?: boolean | null;
        };
      };
      database_backups: {
        Row: {
          id: string;
          backup_data: any;
          backup_name: string;
          created_at: string | null;
          file_size: number | null;
        };
        Insert: {
          id?: string;
          backup_data: any;
          backup_name?: string;
          created_at?: string | null;
          file_size?: number | null;
        };
        Update: {
          id?: string;
          backup_data?: any;
          backup_name?: string;
          created_at?: string | null;
          file_size?: number | null;
        };
      };
    };
  };
};