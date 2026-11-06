import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSharedSupabaseClient, type TypedSupabaseClient } from '@olx-clone/shared';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

let mobileClient: TypedSupabaseClient | null = null;

/**
 * Cria ou retorna o cliente Supabase configurado especificamente para o React Native / Expo,
 * utilizando AsyncStorage para persistência de tokens e sessões.
 */
export function getMobileSupabaseClient(): TypedSupabaseClient {
  if (!mobileClient) {
    mobileClient = createSharedSupabaseClient({
      supabaseUrl,
      supabaseAnonKey,
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    });
  }
  return mobileClient;
}

export const supabase = getMobileSupabaseClient();
