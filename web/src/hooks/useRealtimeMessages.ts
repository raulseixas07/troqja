'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPABASE_TABLES, type Mensagem, enviarMensagem } from '@olx-clone/shared';

export function useRealtimeMessages(conversaId: string | null, userId?: string) {
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Armazena conversaId atual para evitar corridas assíncronas
  const currentConversaRef = useRef<string | null>(conversaId);
  currentConversaRef.current = conversaId;

  // Carregar histórico inicial de mensagens
  const fetchMessages = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from(SUPABASE_TABLES.MENSAGENS)
        .select('*')
        .eq('conversa_id', id)
        .order('created_at', { ascending: true });

      if (fetchErr) throw fetchErr;

      if (currentConversaRef.current === id) {
        setMessages((data as Mensagem[]) || []);
      }
    } catch (err: unknown) {
      if (currentConversaRef.current === id) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar histórico');
      }
    } finally {
      if (currentConversaRef.current === id) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!conversaId) {
      setMessages([]);
      return;
    }

    fetchMessages(conversaId);

    // Canal Supabase Realtime para escutar inserções em tempo real nesta conversa
    const channelName = `chat_conversa_${conversaId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: SUPABASE_TABLES.MENSAGENS,
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const novaMensagem = payload.new as Mensagem;
          setMessages((prev) => {
            // Evita duplicação caso já tenha sido adicionada localmente
            if (prev.some((m) => m.id === novaMensagem.id)) {
              return prev;
            }
            return [...prev, novaMensagem];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, fetchMessages]);

  const send = useCallback(
    async (conteudo?: string | null, imagemUrl?: string | null) => {
      const textoLimpo = conteudo ? conteudo.trim() : null;
      const fotoLimpa = imagemUrl ? imagemUrl.trim() : null;
      if (!conversaId || !userId || (!textoLimpo && !fotoLimpa)) return false;

      // Mensagem otimista temporária
      const tempId = 'temp_' + Date.now();
      const optimisticMsg: Mensagem = {
        id: tempId,
        conversa_id: conversaId,
        sender_id: userId,
        conteudo: textoLimpo,
        imagem_url: fotoLimpa,
        lida: false,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const { mensagem, error: sendErr } = await enviarMensagem(
        supabase,
        conversaId,
        userId,
        textoLimpo,
        fotoLimpa
      );

      if (sendErr) {
        // Remove mensagem otimista em caso de erro
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(sendErr.message);
        return false;
      }

      if (mensagem) {
        // Substitui a mensagem temporária pela oficial salva no banco
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? mensagem : m))
        );
      }

      return true;
    },
    [conversaId, userId]
  );

  return {
    messages,
    loading,
    error,
    sendMessage: send,
    reloadMessages: () => conversaId && fetchMessages(conversaId),
  };
}
