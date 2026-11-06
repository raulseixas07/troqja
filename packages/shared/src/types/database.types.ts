export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StatusAnuncio = 'ativo' | 'pausado' | 'vendido' | 'excluido';
export type ModalidadeAnuncio = 'venda' | 'leilao' | 'troca';
export type CondicaoTroca = 'pau_a_pau' | 'aceita_volta' | 'da_volta' | 'qualquer';
export type TipoMatchDesejo = 'radar_vip' | 'impulso_vendedor' | 'padrao';
export type TipoDestaque = 'global' | 'categoria';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          telefone: string | null;
          avatar_url: string | null;
          bio: string | null;
          cidade: string | null;
          estado: string | null;
          cep: string | null;
          assinante_comprador_desejos: boolean;
          assinante_anunciante_impulso: boolean;
          creditos_destaque_vitrine: number;
          reputacao_media: number;
          total_avaliacoes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          telefone?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          assinante_comprador_desejos?: boolean;
          assinante_anunciante_impulso?: boolean;
          creditos_destaque_vitrine?: number;
          reputacao_media?: number;
          total_avaliacoes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          telefone?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          assinante_comprador_desejos?: boolean;
          assinante_anunciante_impulso?: boolean;
          creditos_destaque_vitrine?: number;
          reputacao_media?: number;
          total_avaliacoes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      categorias: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          icone: string | null;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          icone?: string | null;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          slug?: string;
          icone?: string | null;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      anuncios: {
        Row: {
          id: string;
          user_id: string;
          categoria_id: string;
          titulo: string;
          descricao: string;
          preco: number;
          modalidade: ModalidadeAnuncio;
          aceita_troca: boolean;
          itens_troca: string | null;
          condicao_troca: CondicaoTroca | null;
          lance_inicial: number | null;
          lance_atual: number | null;
          incremento_minimo: number;
          leilao_encerramento: string | null;
          impulso_desejos: boolean;
          destacado_vitrine: boolean;
          tipo_destaque: TipoDestaque | null;
          comprador_id: string | null;
          data_fechamento: string | null;
          status: StatusAnuncio;
          visualizacoes: number;
          cep: string | null;
          cidade: string;
          estado: string;
          bairro: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          categoria_id: string;
          titulo: string;
          descricao: string;
          preco?: number;
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
          status?: StatusAnuncio;
          visualizacoes?: number;
          cep?: string | null;
          cidade: string;
          estado: string;
          bairro?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          categoria_id?: string;
          titulo?: string;
          descricao?: string;
          preco?: number;
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
          status?: StatusAnuncio;
          visualizacoes?: number;
          cep?: string | null;
          cidade?: string;
          estado?: string;
          bairro?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anuncios_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anuncios_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      fotos_anuncio: {
        Row: {
          id: string;
          anuncio_id: string;
          storage_path: string;
          url: string;
          ordem: number;
          is_principal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          storage_path: string;
          url: string;
          ordem?: number;
          is_principal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          anuncio_id?: string;
          storage_path?: string;
          url?: string;
          ordem?: number;
          is_principal?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fotos_anuncio_anuncio_id_fkey";
            columns: ["anuncio_id"];
            isOneToOne: false;
            referencedRelation: "anuncios";
            referencedColumns: ["id"];
          }
        ];
      };
      conversas: {
        Row: {
          id: string;
          anuncio_id: string;
          comprador_id: string;
          vendedor_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          comprador_id: string;
          vendedor_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          anuncio_id?: string;
          comprador_id?: string;
          vendedor_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversas_anuncio_id_fkey";
            columns: ["anuncio_id"];
            isOneToOne: false;
            referencedRelation: "anuncios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversas_comprador_id_fkey";
            columns: ["comprador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversas_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      mensagens: {
        Row: {
          id: string;
          conversa_id: string;
          sender_id: string;
          conteudo: string | null;
          imagem_url: string | null;
          lida: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversa_id: string;
          sender_id: string;
          conteudo?: string | null;
          imagem_url?: string | null;
          lida?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversa_id?: string;
          sender_id?: string;
          conteudo?: string | null;
          imagem_url?: string | null;
          lida?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey";
            columns: ["conversa_id"];
            isOneToOne: false;
            referencedRelation: "conversas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mensagens_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      lances: {
        Row: {
          id: string;
          anuncio_id: string;
          usuario_id: string;
          valor: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          usuario_id: string;
          valor: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          anuncio_id?: string;
          usuario_id?: string;
          valor?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lances_anuncio_id_fkey";
            columns: ["anuncio_id"];
            isOneToOne: false;
            referencedRelation: "anuncios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lances_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      avaliacoes: {
        Row: {
          id: string;
          anuncio_id: string | null;
          avaliador_id: string;
          avaliado_id: string;
          nota: number;
          comentario: string | null;
          tipo_negocio: 'venda' | 'leilao' | 'troca';
          created_at: string;
        };
        Insert: {
          id?: string;
          anuncio_id?: string | null;
          avaliador_id: string;
          avaliado_id: string;
          nota: number;
          comentario?: string | null;
          tipo_negocio?: 'venda' | 'leilao' | 'troca';
          created_at?: string;
        };
        Update: {
          id?: string;
          anuncio_id?: string | null;
          avaliador_id?: string;
          avaliado_id?: string;
          nota?: number;
          comentario?: string | null;
          tipo_negocio?: 'venda' | 'leilao' | 'troca';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "avaliacoes_anuncio_id_fkey";
            columns: ["anuncio_id"];
            isOneToOne: false;
            referencedRelation: "anuncios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avaliacoes_avaliador_id_fkey";
            columns: ["avaliador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avaliacoes_avaliado_id_fkey";
            columns: ["avaliado_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      lista_desejos: {
        Row: {
          id: string;
          usuario_id: string;
          termo_desejo: string;
          categoria_id: string | null;
          valor_maximo: number | null;
          alerta_vip_ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          termo_desejo: string;
          categoria_id?: string | null;
          valor_maximo?: number | null;
          alerta_vip_ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          termo_desejo?: string;
          categoria_id?: string | null;
          valor_maximo?: number | null;
          alerta_vip_ativo?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lista_desejos_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lista_desejos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          }
        ];
      };
      notificacoes_desejos: {
        Row: {
          id: string;
          usuario_id: string;
          anuncio_id: string;
          desejo_id: string | null;
          tipo_match: TipoMatchDesejo;
          prioritario: boolean;
          bloqueada_monetizacao: boolean;
          lida: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          anuncio_id: string;
          desejo_id?: string | null;
          tipo_match: TipoMatchDesejo;
          prioritario?: boolean;
          bloqueada_monetizacao?: boolean;
          lida?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          anuncio_id?: string;
          desejo_id?: string | null;
          tipo_match?: TipoMatchDesejo;
          prioritario?: boolean;
          bloqueada_monetizacao?: boolean;
          lida?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notificacoes_desejos_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificacoes_desejos_anuncio_id_fkey";
            columns: ["anuncio_id"];
            isOneToOne: false;
            referencedRelation: "anuncios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificacoes_desejos_desejo_id_fkey";
            columns: ["desejo_id"];
            isOneToOne: false;
            referencedRelation: "lista_desejos";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      reputacao_usuarios: {
        Row: {
          user_id: string;
          media_estrelas: number;
          total_avaliacoes: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      incrementar_visualizacoes_anuncio: {
        Args: {
          p_anuncio_id: string;
        };
        Returns: number;
      };
      marcar_mensagens_como_lidas: {
        Args: {
          p_conversa_id: string;
          p_user_id: string;
        };
        Returns: number;
      };
      obter_total_mensagens_nao_lidas: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      registrar_lance: {
        Args: {
          p_anuncio_id: string;
          p_valor: number;
        };
        Returns: Json;
      };
      obter_reputacao_usuario: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      contar_interessados_desejo: {
        Args: {
          p_titulo?: string | null;
          p_categoria_id?: string | null;
        };
        Returns: number;
      };
      ativar_assinatura_comprador: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      ativar_assinatura_anunciante: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      destacar_anuncio_vitrine: {
        Args: {
          p_anuncio_id: string;
          p_opcao?: string;
        };
        Returns: Json;
      };
      fechar_negocio_anuncio: {
        Args: {
          p_anuncio_id: string;
          p_comprador_id?: string | null;
          p_tipo_fechamento?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      status_anuncio: StatusAnuncio;
    };
  };
}
