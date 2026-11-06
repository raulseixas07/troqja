'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@olx-clone/shared';
import { supabase } from '@/lib/supabase';
import {
  SUPABASE_TABLES,
  obterTotalMensagensNaoLidas,
  obterTotalNotificacoesDesejosNaoLidas,
} from '@olx-clone/shared';

interface SignUpParams {
  nome: string;
  email: string;
  password: string;
  telefone?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  unreadCount: number;
  unreadWishlistCount: number;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  refreshWishlistCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadWishlistCount, setUnreadWishlistCount] = useState<number>(0);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.PROFILES)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil do usuário:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const { total } = await obterTotalMensagensNaoLidas(supabase, user.id);
    setUnreadCount(total);
  }, [user?.id]);

  const refreshWishlistCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadWishlistCount(0);
      return;
    }
    const { total } = await obterTotalNotificacoesDesejosNaoLidas(supabase, user.id);
    setUnreadWishlistCount(total);
  }, [user?.id]);

  // Escuta contagem de mensagens e desejos não lidos em tempo real via Supabase Realtime
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      setUnreadWishlistCount(0);
      return;
    }

    refreshUnreadCount();
    refreshWishlistCount();

    const channelMensagens = supabase
      .channel(`realtime_unread_msg_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_TABLES.MENSAGENS,
        },
        () => {
          refreshUnreadCount();
        }
      )
      .subscribe();

    const channelDesejos = supabase
      .channel(`realtime_unread_desejos_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_TABLES.NOTIFICACOES_DESEJOS,
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          refreshWishlistCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelMensagens);
      supabase.removeChannel(channelDesejos);
    };
  }, [user?.id, refreshUnreadCount, refreshWishlistCount]);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
        console.error('Erro ao verificar sessão Supabase:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async ({ nome, email, password, telefone }: SignUpParams) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nome,
            telefone: telefone || null,
          },
        },
      });

      if (error) {
        return { error, user: null };
      }

      // Garante inserção/atualização do perfil na tabela pública profiles
      if (data.user) {
        await supabase
          .from(SUPABASE_TABLES.PROFILES)
          .upsert({
            id: data.user.id,
            nome,
            telefone: telefone || null,
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        await fetchProfile(data.user.id);
      }

      return { error: null, user: data.user };
    } catch (err) {
      return { error: err as Error, user: null };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setUnreadCount(0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        unreadCount,
        unreadWishlistCount,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        refreshUnreadCount,
        refreshWishlistCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
