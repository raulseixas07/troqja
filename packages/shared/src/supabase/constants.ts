export const SUPABASE_TABLES = {
  PROFILES: 'profiles',
  CATEGORIAS: 'categorias',
  ANUNCIOS: 'anuncios',
  FOTOS_ANUNCIO: 'fotos_anuncio',
  CONVERSAS: 'conversas',
  MENSAGENS: 'mensagens',
  LANCES: 'lances',
  AVALIACOES: 'avaliacoes',
  REPUTACAO_USUARIOS: 'reputacao_usuarios',
  LISTA_DESEJOS: 'lista_desejos',
  NOTIFICACOES_DESEJOS: 'notificacoes_desejos',
} as const;

export const VALOR_ASSINATURA_MENSAL = 1.99;
export const VALOR_RADAR_VIP_MENSAL = 1.99;
export const VALOR_DESTAQUE_AVULSO = 1.99;
export const VALOR_DESTAQUE_PACOTE_10 = 4.90;

export const STORAGE_BUCKETS = {
  ANUNCIOS: 'anuncios',
  AVATARS: 'avatars',
} as const;

export const STATUS_ANUNCIO = {
  ATIVO: 'ativo',
  PAUSADO: 'pausado',
  VENDIDO: 'vendido',
  EXCLUIDO: 'excluido',
} as const;

export const REALTIME_CHANNELS = {
  MENSAGENS: 'canal_mensagens',
  CONVERSAS: 'canal_conversas',
} as const;
