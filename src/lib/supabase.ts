import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser usage
const createSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey);

declare global {
  var supabase: ReturnType<typeof createSupabaseClient> | undefined;
}

export const supabase = globalThis.supabase ?? createSupabaseClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.supabase = supabase;
}

// Server client (aliased to the same singleton instance for now)
export const supabaseServer = supabase;

// Database types
export interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  products: Product[];
  timings: string | null;
  location: string | null;
  contact: Contact;
  audio_url: string | null;
  transcription: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  tagline?: string | null;
  social_links?: Record<string, string> | null;
  type: 'Shop' | 'Menu';
  is_live?: boolean;
}

export interface Product {
  id?: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  is_live?: boolean;
}

export interface Contact {
  phone?: string;
  whatsapp?: string;
  email?: string;
}

// Extracted data from GPT-4o
export interface ExtractedShopData {
  shopName: string;
  description: string;
  products: Product[];
  timings: string | null;
  location: string | null;
  contact: Contact;
}
