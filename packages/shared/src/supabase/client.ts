import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export interface SupabaseClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  storage?: SupabaseClientOptions<'public'>['auth'] extends infer A
    ? A extends { storage?: infer S }
      ? S
      : never
    : never;
  persistSession?: boolean;
  autoRefreshToken?: boolean;
  detectSessionInUrl?: boolean;
}

/**
 * Cria uma instância tipada centralizada do cliente Supabase.
 * Pode ser instanciado tanto no Next.js (web) quanto no React Native/Expo (mobile).
 */
export function createSharedSupabaseClient(config: SupabaseClientConfig): TypedSupabaseClient {
  const {
    supabaseUrl,
    supabaseAnonKey,
    storage,
    persistSession = true,
    autoRefreshToken = true,
    detectSessionInUrl = typeof window !== 'undefined',
  } = config;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL e Anon Key são obrigatórias para inicializar o cliente.');
  }

  const options: SupabaseClientOptions<'public'> = {
    auth: {
      persistSession,
      autoRefreshToken,
      detectSessionInUrl,
      ...(storage ? { storage } : {}),
    },
    global: {
      headers: {
        'x-application-name': 'troqja-app',
      },
    },
  };

  return createClient<Database>(supabaseUrl, supabaseAnonKey, options);
}
