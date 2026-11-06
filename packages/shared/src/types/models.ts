import type { Database, StatusAnuncio, ModalidadeAnuncio, CondicaoTroca, TipoMatchDesejo, TipoDestaque } from './database.types';

export type { CondicaoTroca, TipoMatchDesejo, TipoDestaque };

// Modelos Base (Tabelas)
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Categoria = Database['public']['Tables']['categorias']['Row'];
export type CategoriaInsert = Database['public']['Tables']['categorias']['Insert'];
export type CategoriaUpdate = Database['public']['Tables']['categorias']['Update'];

export type Anuncio = Database['public']['Tables']['anuncios']['Row'];
export type AnuncioInsert = Database['public']['Tables']['anuncios']['Insert'];
export type AnuncioUpdate = Database['public']['Tables']['anuncios']['Update'];

export type FotoAnuncio = Database['public']['Tables']['fotos_anuncio']['Row'];
export type FotoAnuncioInsert = Database['public']['Tables']['fotos_anuncio']['Insert'];
export type FotoAnuncioUpdate = Database['public']['Tables']['fotos_anuncio']['Update'];

export type Conversa = Database['public']['Tables']['conversas']['Row'];
export type ConversaInsert = Database['public']['Tables']['conversas']['Insert'];
export type ConversaUpdate = Database['public']['Tables']['conversas']['Update'];

export type Mensagem = Database['public']['Tables']['mensagens']['Row'];
export type MensagemInsert = Database['public']['Tables']['mensagens']['Insert'];
export type MensagemUpdate = Database['public']['Tables']['mensagens']['Update'];

export type Lance = Database['public']['Tables']['lances']['Row'];
export type LanceInsert = Database['public']['Tables']['lances']['Insert'];
export type LanceUpdate = Database['public']['Tables']['lances']['Update'];

export type Avaliacao = Database['public']['Tables']['avaliacoes']['Row'];
export type AvaliacaoInsert = Database['public']['Tables']['avaliacoes']['Insert'];
export type AvaliacaoUpdate = Database['public']['Tables']['avaliacoes']['Update'];

export type ListaDesejo = Database['public']['Tables']['lista_desejos']['Row'];
export type ListaDesejoInsert = Database['public']['Tables']['lista_desejos']['Insert'];
export type ListaDesejoUpdate = Database['public']['Tables']['lista_desejos']['Update'];

export type NotificacaoDesejo = Database['public']['Tables']['notificacoes_desejos']['Row'];
export type NotificacaoDesejoInsert = Database['public']['Tables']['notificacoes_desejos']['Insert'];
export type NotificacaoDesejoUpdate = Database['public']['Tables']['notificacoes_desejos']['Update'];

export interface NotificacaoDesejoComAnuncio extends NotificacaoDesejo {
  anuncio?: (Pick<Anuncio, 'id' | 'titulo' | 'preco' | 'modalidade' | 'aceita_troca' | 'condicao_troca' | 'cidade' | 'estado' | 'created_at'> & {
    foto_principal_url?: string | null;
  }) | null;
  desejo?: Pick<ListaDesejo, 'id' | 'termo_desejo' | 'categoria_id'> | null;
}

export interface LanceComUsuario extends Lance {
  usuario?: Pick<Profile, 'id' | 'nome' | 'avatar_url'> | null;
}

export interface AvaliacaoComAvaliador extends Avaliacao {
  avaliador?: Pick<Profile, 'id' | 'nome' | 'avatar_url'> | null;
}

export interface ReputacaoUsuario {
  user_id: string;
  media_estrelas: number;
  total_avaliacoes: number;
}

// Modelos Compostos / Visualizações Ricas (Para o Front-End e Mobile)
export interface AnuncioCard {
  id: string;
  titulo: string;
  preco: number;
  cidade: string;
  estado: string;
  bairro: string | null;
  created_at: string;
  foto_principal_url: string | null;
  categoria_nome?: string;
  modalidade?: ModalidadeAnuncio;
  aceita_troca?: boolean;
  itens_troca?: string | null;
  condicao_troca?: CondicaoTroca | null;
  lance_inicial?: number | null;
  lance_atual?: number | null;
  incremento_minimo?: number;
  leilao_encerramento?: string | null;
  impulso_desejos?: boolean;
  destacado_vitrine?: boolean;
  tipo_destaque?: TipoDestaque | null;
  comprador_id?: string | null;
  data_fechamento?: string | null;
}

export interface MeuAnuncioItem {
  id: string;
  titulo: string;
  preco: number;
  status: StatusAnuncio;
  visualizacoes: number;
  cidade: string;
  estado: string;
  bairro: string | null;
  created_at: string;
  updated_at: string;
  categoria_id: string;
  categoria_nome?: string;
  categoria_slug?: string;
  foto_principal_url: string | null;
  total_fotos: number;
  modalidade?: ModalidadeAnuncio;
  aceita_troca?: boolean;
  itens_troca?: string | null;
  condicao_troca?: CondicaoTroca | null;
  lance_atual?: number | null;
  leilao_encerramento?: string | null;
  impulso_desejos?: boolean;
  destacado_vitrine?: boolean;
  tipo_destaque?: TipoDestaque | null;
  comprador_id?: string | null;
  data_fechamento?: string | null;
  comprador?: Pick<Profile, 'id' | 'nome' | 'avatar_url'> | null;
}

export interface AnuncioDetalhe extends Anuncio {
  categoria: Categoria;
  anunciante: Pick<Profile, 'id' | 'nome' | 'telefone' | 'avatar_url' | 'created_at'>;
  fotos: FotoAnuncio[];
  reputacao_anunciante?: ReputacaoUsuario | null;
  comprador?: Pick<Profile, 'id' | 'nome' | 'avatar_url'> | null;
}

export interface ConversaComUltimaMensagem extends Conversa {
  anuncio: Pick<Anuncio, 'id' | 'titulo' | 'preco'> & {
    foto_principal_url?: string | null;
  };
  outro_usuario: Pick<Profile, 'id' | 'nome' | 'avatar_url'> & {
    reputacao?: ReputacaoUsuario | null;
  };
  ultima_mensagem?: Mensagem | null;
  mensagens_nao_lidas: number;
}

export interface FiltrosBuscaAnuncios {
  termo?: string;
  categoria_slug?: string;
  categoria_id?: string;
  estado?: string;
  cidade?: string;
  preco_min?: number;
  preco_max?: number;
  status?: StatusAnuncio;
  modalidade?: 'todos' | 'venda' | 'leilao' | 'troca';
  aceita_troca?: boolean;
  limite?: number;
  pagina?: number;
  ordenacao?: 'recentes' | 'menor_preco' | 'maior_preco';
}
