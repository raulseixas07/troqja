import type { TypedSupabaseClient } from '../supabase/client';
import { SUPABASE_TABLES } from '../supabase/constants';
import type {
  ListaDesejo,
  NotificacaoDesejoComAnuncio,
} from '../types/models';

/**
 * Consulta em tempo real quantos usuários possuem este termo ou categoria na Lista de Desejos.
 * Exclui o próprio anunciante logado.
 */
export async function contarInteressadosDesejo(
  supabase: TypedSupabaseClient,
  titulo: string,
  categoriaId?: string | null
): Promise<number> {
  const cleanTitulo = titulo ? titulo.trim() : '';
  if (cleanTitulo.length < 2 && !categoriaId) {
    return 0;
  }

  try {
    const { data, error } = await supabase.rpc('contar_interessados_desejo', {
      p_titulo: cleanTitulo,
      p_categoria_id: categoriaId || null,
    });

    if (error) {
      console.warn('Alerta ao consultar radar de interessados:', error.message);
      return 0;
    }

    return typeof data === 'number' ? data : 0;
  } catch (err) {
    console.warn('Erro na chamada RPC contar_interessados_desejo:', err);
    return 0;
  }
}

/**
 * Busca a lista de desejos cadastrada por um usuário.
 */
export async function buscarListaDesejos(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{
  desejos: (ListaDesejo & { categoria?: { id: string; nome: string } | null })[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.LISTA_DESEJOS)
      .select(`
        id,
        usuario_id,
        termo_desejo,
        categoria_id,
        valor_maximo,
        alerta_vip_ativo,
        created_at,
        categoria:categorias(id, nome)
      `)
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { desejos: [], error: new Error(error.message) };
    }

    return { desejos: (data || []) as any, error: null };
  } catch (err) {
    return { desejos: [], error: err as Error };
  }
}

/**
 * Cadastra um novo termo de interesse na Lista de Desejos.
 */
export async function adicionarDesejo(
  supabase: TypedSupabaseClient,
  dados: {
    usuario_id: string;
    termo_desejo: string;
    categoria_id?: string | null;
    valor_maximo?: number | null;
    alerta_vip_ativo?: boolean;
  }
): Promise<{ desejo: ListaDesejo | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.LISTA_DESEJOS)
      .insert({
        usuario_id: dados.usuario_id,
        termo_desejo: dados.termo_desejo.trim(),
        categoria_id: dados.categoria_id || null,
        valor_maximo: dados.valor_maximo && dados.valor_maximo > 0 ? dados.valor_maximo : null,
        alerta_vip_ativo: dados.alerta_vip_ativo ?? false,
      })
      .select()
      .single();

    if (error) {
      return { desejo: null, error: new Error(error.message) };
    }

    return { desejo: data as ListaDesejo, error: null };
  } catch (err) {
    return { desejo: null, error: err as Error };
  }
}

/**
 * Remove um item da Lista de Desejos do usuário.
 */
export async function removerDesejo(
  supabase: TypedSupabaseClient,
  desejoId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.LISTA_DESEJOS)
      .delete()
      .eq('id', desejoId)
      .eq('usuario_id', userId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Busca todas as notificações de match de desejos do usuário com anúncio e termo associados.
 */
export async function buscarNotificacoesDesejos(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ notificacoes: NotificacaoDesejoComAnuncio[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.NOTIFICACOES_DESEJOS)
      .select(`
        id,
        usuario_id,
        anuncio_id,
        desejo_id,
        tipo_match,
        prioritario,
        bloqueada_monetizacao,
        lida,
        created_at,
        anuncio:anuncios(
          id,
          titulo,
          preco,
          modalidade,
          aceita_troca,
          condicao_troca,
          cidade,
          estado,
          created_at,
          fotos:fotos_anuncio(url, is_principal)
        ),
        desejo:lista_desejos(id, termo_desejo, categoria_id)
      `)
      .eq('usuario_id', userId)
      .order('prioritario', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { notificacoes: [], error: new Error(error.message) };
    }

    const formatadas: NotificacaoDesejoComAnuncio[] = (data || []).map((notif: any) => {
      let fotoPrincipalUrl: string | null = null;
      if (notif.anuncio && Array.isArray(notif.anuncio.fotos)) {
        const principal = notif.anuncio.fotos.find((f: any) => f.is_principal);
        fotoPrincipalUrl = principal?.url || notif.anuncio.fotos[0]?.url || null;
      }

      return {
        ...notif,
        anuncio: notif.anuncio
          ? {
              ...notif.anuncio,
              foto_principal_url: fotoPrincipalUrl,
            }
          : null,
      };
    });

    return { notificacoes: formatadas, error: null };
  } catch (err) {
    return { notificacoes: [], error: err as Error };
  }
}

/**
 * Retorna o total de notificações não lidas de match na lista de desejos.
 */
export async function obterTotalNotificacoesDesejosNaoLidas(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ total: number; error: Error | null }> {
  try {
    const { count, error } = await supabase
      .from(SUPABASE_TABLES.NOTIFICACOES_DESEJOS)
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId)
      .eq('lida', false);

    if (error) {
      return { total: 0, error: new Error(error.message) };
    }

    return { total: count || 0, error: null };
  } catch (err) {
    return { total: 0, error: err as Error };
  }
}

/**
 * Marca uma notificação de desejo como lida.
 */
export async function marcarNotificacaoDesejoComoLida(
  supabase: TypedSupabaseClient,
  notificacaoId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.NOTIFICACOES_DESEJOS)
      .update({ lida: true })
      .eq('id', notificacaoId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Ativa a assinatura Radar VIP de Comprador (R$ 1,99/mês), desbloqueando todos os matches.
 */
export async function ativarAssinaturaComprador(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ success: boolean; data: any; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('ativar_assinatura_comprador', {
      p_user_id: userId,
    });

    if (error) {
      return { success: false, data: null, error: new Error(error.message) };
    }

    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, data: null, error: err as Error };
  }
}

/**
 * Ativa a assinatura Impulso de Desejos de Vendedor (R$ 1,99/mês), disparando alertas prioritários.
 */
export async function ativarAssinaturaAnunciante(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ success: boolean; data: any; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('ativar_assinatura_anunciante', {
      p_user_id: userId,
    });

    if (error) {
      return { success: false, data: null, error: new Error(error.message) };
    }

    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, data: null, error: err as Error };
  }
}
