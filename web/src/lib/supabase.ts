import { createSharedSupabaseClient, type TypedSupabaseClient } from '@olx-clone/shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

let browserClient: TypedSupabaseClient | null = null;

/**
 * Obtém ou cria a instância do cliente Supabase para o navegador (Next.js Client Components)
 */
export function getSupabaseBrowserClient(): TypedSupabaseClient {
  if (typeof window === 'undefined') {
    return createSharedSupabaseClient({
      supabaseUrl,
      supabaseAnonKey,
      persistSession: false,
    });
  }

  if (!browserClient) {
    browserClient = createSharedSupabaseClient({
      supabaseUrl,
      supabaseAnonKey,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    });
  }

  return browserClient;
}

export const supabase = getSupabaseBrowserClient();
