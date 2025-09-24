import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Use environment variables or fallback values
const supabaseUrl = 'https://nmlroqlmtelytoghuyos.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbHJvcWxtdGVseXRvZ2h1eW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTA0OTgsImV4cCI6MjA3MDY4NjQ5OH0.qnAd6-BSzNMZux6RxtQmGr5OyPYkne--y1ekccVlCeE';

// Initialize Supabase client with error handling
let supabase: any = null;

try {
  // Validate configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  console.log('✅ Supabase client initialized for mobile');
} catch (error) {
  console.error('Failed to initialize Supabase client (Mobile):', error);
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
      clients: {
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
          vat_percentage: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          unit_price: number;
          is_vat_nil?: boolean | null;
          vat_percentage?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          unit_price?: number;
          is_vat_nil?: boolean | null;
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
          vat_amount?: number | null;
          total_price?: number;
          is_available?: boolean | null;
        };
      };
    };
    credit_clients: {
      Row: {
        id: string;
        name: string;
        total_debt: number;
        bottles_owed: string | null;
        created_at: string;
        last_transaction_at: string;
      };
      Insert: {
        id: string;
        name: string;
        total_debt?: number;
        bottles_owed?: string | null;
        created_at?: string;
        last_transaction_at?: string;
      };
      Update: {
        id?: string;
        name?: string;
        total_debt?: number;
        bottles_owed?: string | null;
        created_at?: string;
        last_transaction_at?: string;
      };
    };
    credit_transactions: {
      Row: {
        id: string;
        client_id: string;
        description: string;
        amount: number;
        date: string;
        type: string;
      };
      Insert: {
        id?: string;
        client_id: string;
        description: string;
        amount: number;
        date?: string;
        type?: string;
      };
      Update: {
        id?: string;
        client_id?: string;
        description?: string;
        amount?: number;
        date?: string;
        type?: string;
      };
    };
    credit_payments: {
      Row: {
        id: string;
        client_id: string;
        amount: number;
        date: string;
        type: string;
      };
      Insert: {
        id?: string;
        client_id: string;
        amount: number;
        date?: string;
        type?: string;
      };
      Update: {
        id?: string;
        client_id?: string;
        amount?: number;
        date?: string;
        type?: string;
      };
    };
  };
};