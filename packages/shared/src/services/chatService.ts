import type { TypedSupabaseClient } from '../supabase/client';
import { SUPABASE_TABLES } from '../supabase/constants';
import type { Conversa, Mensagem } from '../types/models';

export interface ConversaListItem extends Conversa {
  anuncio: {
    id: string;
    titulo: string;
    preco: number;
    foto_url?: string | null;
    status?: string;
    modalidade?: string;
    comprador_id?: string | null;
    user_id?: string;
  };
  outro_usuario: {
    id: string;
    nome: string;
    avatar_url?: string | null;
  };
  ultima_mensagem?: {
    conteudo: string | null;
    imagem_url?: string | null;
    created_at: string;
    sender_id: string;
  } | null;
  mensagens_nao_lidas: number;
}

/**
 * Obtém uma conversa existente ou cria uma nova vinculando comprador, vendedor e anúncio.
 */
export async function obterOuCriarConversa(
  supabase: TypedSupabaseClient,
  anuncioId: string,
  vendedorId: string,
  compradorId: string
): Promise<{ conversaId: string | null; error: Error | null }> {
  if (compradorId === vendedorId) {
    return {
      conversaId: null,
      error: new Error('Você não pode iniciar um chat consigo mesmo no seu próprio anúncio.'),
    };
  }

  try {
    // 1. Verifica se já existe conversa entre este comprador e o anúncio
    const { data: existente, error: findError } = await supabase
      .from(SUPABASE_TABLES.CONVERSAS)
      .select('id')
      .eq('anuncio_id', anuncioId)
      .eq('comprador_id', compradorId)
      .maybeSingle();

    if (findError) {
      return { conversaId: null, error: findError };
    }

    if (existente?.id) {
      return { conversaId: existente.id, error: null };
    }

    // 2. Se não existir, cria a nova conversa
    const { data: nova, error: insertError } = await supabase
      .from(SUPABASE_TABLES.CONVERSAS)
      .insert({
        anuncio_id: anuncioId,
        comprador_id: compradorId,
        vendedor_id: vendedorId,
      })
      .select('id')
      .single();

    if (insertError) {
      return { conversaId: null, error: insertError };
    }

    return { conversaId: nova.id, error: null };
  } catch (err) {
    return { conversaId: null, error: err as Error };
  }
}

/**
 * Envia uma mensagem em uma conversa (texto, foto ou ambos).
 */
export async function enviarMensagem(
  supabase: TypedSupabaseClient,
  conversaId: string,
  senderId: string,
  conteudo?: string | null,
  imagemUrl?: string | null
): Promise<{ mensagem: Mensagem | null; error: Error | null }> {
  const textoLimpo = conteudo ? conteudo.trim() : null;
  const imagemLimpa = imagemUrl ? imagemUrl.trim() : null;

  if (!textoLimpo && !imagemLimpa) {
    return { mensagem: null, error: new Error('A mensagem deve conter texto ou imagem.') };
  }

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.MENSAGENS)
      .insert({
        conversa_id: conversaId,
        sender_id: senderId,
        conteudo: textoLimpo,
        imagem_url: imagemLimpa,
      })
      .select()
      .single();

    if (error) {
      return { mensagem: null, error };
    }

    return { mensagem: data as Mensagem, error: null };
  } catch (err) {
    return { mensagem: null, error: err as Error };
  }
}

/**
 * Retorna o número total de mensagens não lidas recebidas pelo usuário logado
 * em todas as conversas onde ele é participante.
 */
export async function obterTotalMensagensNaoLidas(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ total: number; error: Error | null }> {
  if (!userId) return { total: 0, error: null };

  try {
    // 1. Tenta via função RPC segura
    const { data, error: rpcError } = await supabase.rpc('obter_total_mensagens_nao_lidas', {
      p_user_id: userId,
    });

    if (!rpcError && typeof data === 'number') {
      return { total: data, error: null };
    }

    // 2. Fallback direto via Supabase query com RLS
    const { count, error: countError } = await supabase
      .from(SUPABASE_TABLES.MENSAGENS)
      .select('id', { count: 'exact', head: true })
      .eq('lida', false)
      .neq('sender_id', userId);

    if (countError) {
      return { total: 0, error: countError };
    }

    return { total: count || 0, error: null };
  } catch (err) {
    return { total: 0, error: err as Error };
  }
}

/**
 * Marca como lidas todas as mensagens de uma conversa recebidas pelo usuário atual.
 */
export async function marcarMensagensComoLidas(
  supabase: TypedSupabaseClient,
  conversaId: string,
  userId: string
): Promise<{ afetadas: number; error: Error | null }> {
  if (!conversaId || !userId) return { afetadas: 0, error: null };

  try {
    // 1. Tenta via função RPC segura
    const { data, error: rpcError } = await supabase.rpc('marcar_mensagens_como_lidas', {
      p_conversa_id: conversaId,
      p_user_id: userId,
    });

    if (!rpcError && typeof data === 'number') {
      return { afetadas: data, error: null };
    }

    // 2. Fallback direto via UPDATE
    const { error: updateError } = await supabase
      .from(SUPABASE_TABLES.MENSAGENS)
      .update({ lida: true })
      .eq('conversa_id', conversaId)
      .neq('sender_id', userId)
      .eq('lida', false);

    if (updateError) {
      return { afetadas: 0, error: updateError };
    }

    return { afetadas: 1, error: null };
  } catch (err) {
    return { afetadas: 0, error: err as Error };
  }
}

/**
 * Carrega a lista completa de conversas de um usuário (comprador ou vendedor),
 * incluindo os dados do anúncio, do interlocutor, última mensagem e contador de mensagens não lidas.
 */
export async function buscarConversasDoUsuario(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ conversas: ConversaListItem[]; totalNaoLidas: number; error: Error | null }> {
  if (!userId) return { conversas: [], totalNaoLidas: 0, error: null };

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.CONVERSAS)
      .select(`
        id,
        anuncio_id,
        comprador_id,
        vendedor_id,
        created_at,
        updated_at,
        anuncio:anuncios(id, titulo, preco, status, modalidade, comprador_id, user_id, fotos:fotos_anuncio(url, is_principal)),
        comprador:profiles!conversas_comprador_id_fkey(id, nome, avatar_url),
        vendedor:profiles!conversas_vendedor_id_fkey(id, nome, avatar_url),
        mensagens(id, conteudo, imagem_url, created_at, sender_id, lida)
      `)
      .or(`comprador_id.eq.${userId},vendedor_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      return { conversas: [], totalNaoLidas: 0, error };
    }

    let totalNaoLidasGeral = 0;

    const conversas: ConversaListItem[] = (data || []).map((item: any) => {
      const isComprador = item.comprador_id === userId;
      const outro = isComprador ? item.vendedor : item.comprador;

      const fotos = item.anuncio?.fotos || [];
      const principal = fotos.find((f: any) => f.is_principal)?.url || fotos[0]?.url || null;

      // Ordena mensagens para pegar a mais recente
      const msgs = (item.mensagens || []).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Calcula mensagens não lidas desta conversa (onde o usuário não é o remetente)
      const naoLidas = msgs.filter((m: any) => !m.lida && m.sender_id !== userId).length;
      totalNaoLidasGeral += naoLidas;

      return {
        id: item.id,
        anuncio_id: item.anuncio_id,
        comprador_id: item.comprador_id,
        vendedor_id: item.vendedor_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        anuncio: {
          id: item.anuncio?.id || '',
          titulo: item.anuncio?.titulo || 'Anúncio indisponível',
          preco: Number(item.anuncio?.preco || 0),
          foto_url: principal,
          status: item.anuncio?.status || 'ativo',
          modalidade: item.anuncio?.modalidade || 'venda',
          comprador_id: item.anuncio?.comprador_id || null,
          user_id: item.anuncio?.user_id || '',
        },
        outro_usuario: {
          id: outro?.id || '',
          nome: outro?.nome || 'Usuário TroqJá',
          avatar_url: outro?.avatar_url,
        },
        ultima_mensagem: msgs[0] || null,
        mensagens_nao_lidas: naoLidas,
      };
    });

    return { conversas, totalNaoLidas: totalNaoLidasGeral, error: null };
  } catch (err) {
    return { conversas: [], totalNaoLidas: 0, error: err as Error };
  }
}
