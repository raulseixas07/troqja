import type { TypedSupabaseClient } from '../supabase/client';
import { SUPABASE_TABLES, STORAGE_BUCKETS } from '../supabase/constants';
import type { StatusAnuncio } from '../types/database.types';
import type {
  AnuncioCard,
  MeuAnuncioItem,
  FiltrosBuscaAnuncios,
  LanceComUsuario,
  AvaliacaoComAvaliador,
  ReputacaoUsuario,
} from '../types/models';

/**
 * Busca anúncios ativos no Supabase com suporte a múltiplos filtros e paginação.
 */
export async function buscarAnuncios(
  supabase: TypedSupabaseClient,
  filtros: FiltrosBuscaAnuncios = {}
): Promise<{ anuncios: AnuncioCard[]; total: number; error: Error | null }> {
  try {
    let resolvedCategoriaId = filtros.categoria_id;

    // Se forneceu apenas o slug da categoria, resolve o ID primeiro
    if (!resolvedCategoriaId && filtros.categoria_slug) {
      const { data: catData } = await supabase
        .from(SUPABASE_TABLES.CATEGORIAS)
        .select('id')
        .eq('slug', filtros.categoria_slug)
        .maybeSingle();

      if (catData?.id) {
        resolvedCategoriaId = catData.id;
      }
    }

    let query = supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .select(
        `
        id,
        titulo,
        preco,
        modalidade,
        aceita_troca,
        itens_troca,
        condicao_troca,
        destacado_vitrine,
        tipo_destaque,
        impulso_desejos,
        lance_inicial,
        lance_atual,
        incremento_minimo,
        leilao_encerramento,
        cidade,
        estado,
        bairro,
        created_at,
        categoria:categorias(nome),
        fotos:fotos_anuncio(url, is_principal)
      `,
        { count: 'exact' }
      )
      .eq('status', filtros.status || 'ativo');

    // Filtro por termo (título ou descrição)
    if (filtros.termo && filtros.termo.trim().length > 0) {
      const cleanTerm = filtros.termo.trim();
      query = query.or(`titulo.ilike.%${cleanTerm}%,descricao.ilike.%${cleanTerm}%`);
    }

    // Filtro por categoria
    if (resolvedCategoriaId) {
      query = query.eq('categoria_id', resolvedCategoriaId);
    }

    // Filtro por modalidade (venda, leilao, troca)
    if (filtros.modalidade && filtros.modalidade !== 'todos') {
      if (filtros.modalidade === 'troca') {
        query = query.or('modalidade.eq.troca,aceita_troca.eq.true');
      } else {
        query = query.eq('modalidade', filtros.modalidade);
      }
    } else if (filtros.aceita_troca === true) {
      query = query.or('modalidade.eq.troca,aceita_troca.eq.true');
    }

    // Filtro por estado
    if (filtros.estado && filtros.estado.trim().length > 0) {
      query = query.eq('estado', filtros.estado.trim().toUpperCase());
    }

    // Filtro por cidade
    if (filtros.cidade && filtros.cidade.trim().length > 0) {
      query = query.ilike('cidade', `%${filtros.cidade.trim()}%`);
    }

    // Faixa de preço
    if (typeof filtros.preco_min === 'number' && !isNaN(filtros.preco_min) && filtros.preco_min > 0) {
      query = query.gte('preco', filtros.preco_min);
    }
    if (typeof filtros.preco_max === 'number' && !isNaN(filtros.preco_max) && filtros.preco_max > 0) {
      query = query.lte('preco', filtros.preco_max);
    }

    // Ordenação: Anúncios com Destaque de Vitrine (Pay-per-Highlight) sempre no topo prioritário
    query = query.order('destacado_vitrine', { ascending: false });

    switch (filtros.ordenacao) {
      case 'menor_preco':
        query = query.order('preco', { ascending: true });
        break;
      case 'maior_preco':
        query = query.order('preco', { ascending: false });
        break;
      case 'recentes':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Paginação
    const limite = filtros.limite && filtros.limite > 0 ? filtros.limite : 20;
    const pagina = filtros.pagina && filtros.pagina > 0 ? filtros.pagina : 1;
    const inicio = (pagina - 1) * limite;
    const fim = inicio + limite - 1;

    query = query.range(inicio, fim);

    const { data, count, error } = await query;

    if (error) {
      return { anuncios: [], total: 0, error };
    }

    const anuncios: AnuncioCard[] = (data || []).map((item) => {
      const fotosList = (item.fotos as { url: string; is_principal: boolean }[]) || [];
      const principal = fotosList.find((f) => f.is_principal)?.url || fotosList[0]?.url || null;
      const cat = item.categoria as { nome: string } | null;

      return {
        id: item.id,
        titulo: item.titulo,
        preco: Number(item.preco),
        cidade: item.cidade,
        estado: item.estado,
        bairro: item.bairro,
        created_at: item.created_at,
        foto_principal_url: principal,
        categoria_nome: cat?.nome,
        modalidade: (item as any).modalidade || 'venda',
        aceita_troca: Boolean((item as any).aceita_troca),
        itens_troca: (item as any).itens_troca || null,
        condicao_troca: (item as any).condicao_troca || null,
        lance_inicial: (item as any).lance_inicial != null ? Number((item as any).lance_inicial) : null,
        lance_atual: (item as any).lance_atual != null ? Number((item as any).lance_atual) : null,
        incremento_minimo: (item as any).incremento_minimo != null ? Number((item as any).incremento_minimo) : 10,
        leilao_encerramento: (item as any).leilao_encerramento || null,
        impulso_desejos: Boolean((item as any).impulso_desejos),
        destacado_vitrine: Boolean((item as any).destacado_vitrine),
        tipo_destaque: ((item as any).tipo_destaque as any) || null,
      };
    });

    return { anuncios, total: count || anuncios.length, error: null };
  } catch (err) {
    return { anuncios: [], total: 0, error: err as Error };
  }
}

/**
 * Busca todos os anúncios pertencentes a um usuário logado (ativos, pausados ou vendidos).
 */
export async function buscarMeusAnuncios(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ anuncios: MeuAnuncioItem[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .select(
        `
        id,
        titulo,
        preco,
        modalidade,
        aceita_troca,
        condicao_troca,
        itens_troca,
        destacado_vitrine,
        tipo_destaque,
        lance_atual,
        leilao_encerramento,
        status,
        visualizacoes,
        cidade,
        estado,
        bairro,
        categoria_id,
        created_at,
        updated_at,
        categoria:categorias(id, nome, slug),
        fotos:fotos_anuncio(url, is_principal)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { anuncios: [], error };
    }

    const anuncios: MeuAnuncioItem[] = (data || []).map((item) => {
      const fotosList = (item.fotos as { url: string; is_principal: boolean }[]) || [];
      const principal = fotosList.find((f) => f.is_principal)?.url || fotosList[0]?.url || null;
      const cat = item.categoria as { id: string; nome: string; slug: string } | null;

      return {
        id: item.id,
        titulo: item.titulo,
        preco: Number(item.preco),
        status: item.status as StatusAnuncio,
        visualizacoes: item.visualizacoes || 0,
        cidade: item.cidade,
        estado: item.estado,
        bairro: item.bairro,
        created_at: item.created_at,
        updated_at: item.updated_at,
        categoria_id: item.categoria_id,
        categoria_nome: cat?.nome,
        categoria_slug: cat?.slug,
        foto_principal_url: principal,
        total_fotos: fotosList.length,
        modalidade: (item as any).modalidade || 'venda',
        aceita_troca: Boolean((item as any).aceita_troca),
        itens_troca: (item as any).itens_troca || null,
        condicao_troca: (item as any).condicao_troca || null,
        lance_atual: (item as any).lance_atual != null ? Number((item as any).lance_atual) : null,
        leilao_encerramento: (item as any).leilao_encerramento || null,
        impulso_desejos: Boolean((item as any).impulso_desejos),
        destacado_vitrine: Boolean((item as any).destacado_vitrine),
        tipo_destaque: ((item as any).tipo_destaque as any) || null,
      };
    });

    return { anuncios, error: null };
  } catch (err) {
    return { anuncios: [], error: err as Error };
  }
}

/**
 * Atualiza o status de um anúncio (ex: 'ativo', 'pausado', 'vendido').
 */
export async function atualizarStatusAnuncio(
  supabase: TypedSupabaseClient,
  anuncioId: string,
  novoStatus: StatusAnuncio
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .update({
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', anuncioId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Exclui um anúncio do banco de dados e remove suas fotos do Supabase Storage.
 */
export async function excluirAnuncio(
  supabase: TypedSupabaseClient,
  anuncioId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // 1. Busca os caminhos de storage das fotos associadas para exclusão do bucket
    const { data: fotos } = await supabase
      .from(SUPABASE_TABLES.FOTOS_ANUNCIO)
      .select('storage_path')
      .eq('anuncio_id', anuncioId);

    if (fotos && fotos.length > 0) {
      const storagePaths = fotos.map((f) => f.storage_path).filter(Boolean);
      if (storagePaths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKETS.ANUNCIOS).remove(storagePaths);
      }
    }

    // 2. Deleta o anúncio (fotos_anuncio e conversas são cascadeadas pelo banco)
    const { error } = await supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .delete()
      .eq('id', anuncioId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Incrementa com segurança o contador de visualizações de um anúncio no Supabase (+1).
 * Utiliza a função RPC 'incrementar_visualizacoes_anuncio' com SECURITY DEFINER para garantir
 * que visitantes não autenticados e outros compradores possam contabilizar a visita sem violar o RLS.
 */
export async function incrementarVisualizacoesAnuncio(
  supabase: TypedSupabaseClient,
  anuncioId: string
): Promise<{ visualizacoes: number | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('incrementar_visualizacoes_anuncio', {
      p_anuncio_id: anuncioId,
    });

    if (error) {
      console.warn('Falha no RPC incrementar_visualizacoes_anuncio:', error.message);
      return { visualizacoes: null, error };
    }

    return { visualizacoes: typeof data === 'number' ? data : null, error: null };
  } catch (err) {
    return { visualizacoes: null, error: err as Error };
  }
}

/**
 * Registra um novo lance em tempo real no modo leilão via RPC atômica (PL/pgSQL).
 * Valida encerramento, incremento mínimo e atualiza atomicamente o lance atual do anúncio.
 */
export async function registrarLance(
  supabase: TypedSupabaseClient,
  anuncioId: string,
  valor: number
): Promise<{ success: boolean; data?: any; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('registrar_lance', {
      p_anuncio_id: anuncioId,
      p_valor: valor,
    });

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Busca o histórico de lances dados em um leilão ordenados do mais recente ao mais antigo.
 */
export async function buscarLances(
  supabase: TypedSupabaseClient,
  anuncioId: string
): Promise<{ lances: LanceComUsuario[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.LANCES)
      .select(`
        id,
        anuncio_id,
        usuario_id,
        valor,
        created_at,
        usuario:profiles(id, nome, avatar_url)
      `)
      .eq('anuncio_id', anuncioId)
      .order('created_at', { ascending: false });

    if (error) {
      return { lances: [], error: new Error(error.message) };
    }

    const lances: LanceComUsuario[] = (data || []).map((item: any) => ({
      id: item.id,
      anuncio_id: item.anuncio_id,
      usuario_id: item.usuario_id,
      valor: Number(item.valor),
      created_at: item.created_at,
      usuario: item.usuario,
    }));

    return { lances, error: null };
  } catch (err) {
    return { lances: [], error: err as Error };
  }
}

/**
 * Obtém a reputação calculada (média de estrelas e total de avaliações) de um perfil.
 */
export async function obterReputacaoUsuario(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ reputacao: ReputacaoUsuario; error: Error | null }> {
  try {
    // 1. Tenta a função RPC de alta performance
    const { data: rpcData, error: rpcError } = await supabase.rpc('obter_reputacao_usuario', {
      p_user_id: userId,
    });

    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      return {
        reputacao: {
          user_id: userId,
          media_estrelas: Number(parsed.media_estrelas || 5.0),
          total_avaliacoes: Number(parsed.total_avaliacoes || 0),
        },
        error: null,
      };
    }

    // 2. Fallback consultando a tabela de avaliações diretamente
    const { data: avData, error: avError } = await supabase
      .from(SUPABASE_TABLES.AVALIACOES)
      .select('nota')
      .eq('avaliado_id', userId);

    if (!avError && avData && avData.length > 0) {
      const total = avData.length;
      const soma = avData.reduce((acc, curr) => acc + Number(curr.nota), 0);
      const media = Number((soma / total).toFixed(1));
      return {
        reputacao: {
          user_id: userId,
          media_estrelas: media,
          total_avaliacoes: total,
        },
        error: null,
      };
    }

    // Default caso novo usuário sem avaliações ainda
    return {
      reputacao: {
        user_id: userId,
        media_estrelas: 5.0,
        total_avaliacoes: 0,
      },
      error: null,
    };
  } catch (err) {
    return {
      reputacao: {
        user_id: userId,
        media_estrelas: 5.0,
        total_avaliacoes: 0,
      },
      error: err as Error,
    };
  }
}

/**
 * Cria uma nova avaliação por estrelas (1 a 5) com comentário para um usuário.
 */
export async function criarAvaliacao(
  supabase: TypedSupabaseClient,
  dados: {
    anuncio_id?: string | null;
    avaliador_id: string;
    avaliado_id: string;
    nota: number;
    comentario?: string | null;
    tipo_negocio?: 'venda' | 'leilao' | 'troca';
  }
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLES.AVALIACOES).insert({
      anuncio_id: dados.anuncio_id || null,
      avaliador_id: dados.avaliador_id,
      avaliado_id: dados.avaliado_id,
      nota: Math.min(5, Math.max(1, Math.round(dados.nota))),
      comentario: dados.comentario?.trim() || null,
      tipo_negocio: dados.tipo_negocio || 'venda',
    });

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Verifica se um avaliador já avaliou determinado anúncio.
 */
export async function verificarAvaliacaoExistente(
  supabase: TypedSupabaseClient,
  anuncioId: string,
  avaliadorId: string
): Promise<{ avaliado: boolean; avaliacao?: any; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.AVALIACOES)
      .select('id, nota, comentario, created_at')
      .eq('anuncio_id', anuncioId)
      .eq('avaliador_id', avaliadorId)
      .maybeSingle();

    if (error) {
      return { avaliado: false, error: new Error(error.message) };
    }

    return { avaliado: Boolean(data), avaliacao: data || null, error: null };
  } catch (err) {
    return { avaliado: false, error: err as Error };
  }
}

export interface InteressadoNegocio {
  id: string;
  nome: string;
  avatar_url?: string | null;
  conversa_id: string;
}

/**
 * Busca a lista de pessoas que conversaram com o vendedor a respeito do anúncio,
 * permitindo selecioná-las como parceiro de fechamento (comprador/permutante).
 */
export async function buscarInteressadosConversaAnuncio(
  supabase: TypedSupabaseClient,
  anuncioId: string
): Promise<{ interessados: InteressadoNegocio[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.CONVERSAS)
      .select(`
        id,
        comprador:profiles!conversas_comprador_id_fkey(id, nome, avatar_url)
      `)
      .eq('anuncio_id', anuncioId);

    if (error) {
      return { interessados: [], error: new Error(error.message) };
    }

    const mapa = new Map<string, InteressadoNegocio>();
    (data || []).forEach((item: any) => {
      const comp = item.comprador;
      if (comp?.id && !mapa.has(comp.id)) {
        mapa.set(comp.id, {
          id: comp.id,
          nome: comp.nome || 'Interessado no TroqJá',
          avatar_url: comp.avatar_url || null,
          conversa_id: item.id,
        });
      }
    });

    return { interessados: Array.from(mapa.values()), error: null };
  } catch (err) {
    return { interessados: [], error: err as Error };
  }
}

/**
 * Fecha o negócio de um anúncio marcando como vendido e vinculando o comprador/permutante.
 */
export async function fecharNegocioAnuncio(
  supabase: TypedSupabaseClient,
  anuncioId: string,
  compradorId?: string | null,
  tipoFechamento: 'venda' | 'leilao' | 'troca' = 'venda'
): Promise<{ success: boolean; data?: any; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('fechar_negocio_anuncio', {
      p_anuncio_id: anuncioId,
      p_comprador_id: compradorId || null,
      p_tipo_fechamento: tipoFechamento,
    });

    if (error) {
      // Fallback direto via UPDATE caso a RPC falhe por permissão
      const { error: updErr } = await supabase
        .from(SUPABASE_TABLES.ANUNCIOS)
        .update({
          status: 'vendido',
          comprador_id: compradorId || null,
          data_fechamento: new Date().toISOString(),
        })
        .eq('id', anuncioId);

      if (updErr) {
        return { success: false, error: new Error(updErr.message) };
      }
      return { success: true, error: null };
    }

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (parsed && parsed.success === false) {
      return { success: false, error: new Error(parsed.message || 'Falha ao fechar negócio.') };
    }

    return { success: true, data: parsed, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Busca avaliações recebidas por um usuário com detalhes do avaliador.
 */
export async function buscarAvaliacoesUsuario(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<{ avaliacoes: AvaliacaoComAvaliador[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.AVALIACOES)
      .select(`
        id,
        anuncio_id,
        avaliador_id,
        avaliado_id,
        nota,
        comentario,
        created_at,
        avaliador:profiles!avaliacoes_avaliador_id_fkey(id, nome, avatar_url)
      `)
      .eq('avaliado_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { avaliacoes: [], error: new Error(error.message) };
    }

    return { avaliacoes: (data || []) as AvaliacaoComAvaliador[], error: null };
  } catch (err) {
    return { avaliacoes: [], error: err as Error };
  }
}

/**
 * Aplica o Destaque de Vitrine (Pay-per-Highlight) a um anúncio do vendedor.
 * Permite destaque avulso (R$ 1,99), pacote de 10 destaques (R$ 4,90) ou uso de créditos pré-pagos.
 */
export async function destacarAnuncioVitrine(
  supabase: TypedSupabaseClient,
  anuncioId: string,
  opcao: 'avulso' | 'pacote_10' | 'credito' = 'avulso'
): Promise<{ success: boolean; data?: any; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('destacar_anuncio_vitrine', {
      p_anuncio_id: anuncioId,
      p_opcao: opcao,
    });

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (parsed && parsed.success === false) {
      return { success: false, data: parsed, error: new Error(parsed.message || 'Falha ao destacar anúncio.') };
    }

    return { success: true, data: parsed, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

export interface FiltrosDestaquesVitrine {
  categoria_id?: string;
  categoria_slug?: string;
  limite?: number;
}

/**
 * Busca anúncios destacados para o Carrossel Superior da Vitrine (Home e Páginas de Categoria/Busca).
 * Regra de Alcance Opção A vs Opção B:
 * - Se filtrando categoria específica: Retorna TODOS os anúncios com tipo_destaque='global'
 *   MAIS os com tipo_destaque='categoria' pertencentes àquela categoria.
 * - Se busca geral ou Home: Retorna todos os anúncios com destaque ativo (priorizando global).
 */
export async function buscarDestaquesVitrine(
  supabase: TypedSupabaseClient,
  filtros: FiltrosDestaquesVitrine = {}
): Promise<{ destaques: AnuncioCard[]; error: Error | null }> {
  try {
    let resolvedCategoriaId = filtros.categoria_id;

    // Se passou slug mas não passou id, resolve o ID da categoria
    if (!resolvedCategoriaId && filtros.categoria_slug) {
      const { data: catData } = await supabase
        .from(SUPABASE_TABLES.CATEGORIAS)
        .select('id')
        .eq('slug', filtros.categoria_slug)
        .maybeSingle();

      if (catData?.id) {
        resolvedCategoriaId = catData.id;
      }
    }

    let query = supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .select(
        `
        id,
        titulo,
        preco,
        modalidade,
        aceita_troca,
        itens_troca,
        condicao_troca,
        destacado_vitrine,
        tipo_destaque,
        lance_inicial,
        lance_atual,
        incremento_minimo,
        leilao_encerramento,
        cidade,
        estado,
        bairro,
        categoria_id,
        created_at,
        categoria:categorias(nome),
        fotos:fotos_anuncio(url, is_principal)
      `
      )
      .eq('status', 'ativo')
      .eq('destacado_vitrine', true);

    // Se está filtrando por uma categoria específica:
    // Exibe todos os globais + os de categoria que correspondam à categoria filtrada
    if (resolvedCategoriaId) {
      query = query.or(
        `tipo_destaque.eq.global,categoria_id.eq.${resolvedCategoriaId}`
      );
    }

    // Ordenação: primeiro os com destaque 'global', depois por data recente
    query = query
      .order('tipo_destaque', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filtros.limite || 16);

    const { data, error } = await query;

    if (error) {
      return { destaques: [], error };
    }

    const destaques: AnuncioCard[] = (data || []).map((item) => {
      const fotosList = (item.fotos as { url: string; is_principal: boolean }[]) || [];
      const principal = fotosList.find((f) => f.is_principal)?.url || fotosList[0]?.url || null;
      const cat = item.categoria as { nome: string } | null;

      return {
        id: item.id,
        titulo: item.titulo,
        preco: Number(item.preco),
        cidade: item.cidade,
        estado: item.estado,
        bairro: item.bairro,
        created_at: item.created_at,
        foto_principal_url: principal,
        categoria_nome: cat?.nome,
        modalidade: (item as any).modalidade || 'venda',
        aceita_troca: Boolean((item as any).aceita_troca),
        itens_troca: (item as any).itens_troca || null,
        condicao_troca: (item as any).condicao_troca || null,
        lance_inicial: (item as any).lance_inicial != null ? Number((item as any).lance_inicial) : null,
        lance_atual: (item as any).lance_atual != null ? Number((item as any).lance_atual) : null,
        incremento_minimo: (item as any).incremento_minimo != null ? Number((item as any).incremento_minimo) : 10,
        leilao_encerramento: (item as any).leilao_encerramento || null,
        destacado_vitrine: true,
        tipo_destaque: ((item as any).tipo_destaque as 'global' | 'categoria') || 'categoria',
      };
    });

    return { destaques, error: null };
  } catch (err) {
    return { destaques: [], error: err as Error };
  }
}
