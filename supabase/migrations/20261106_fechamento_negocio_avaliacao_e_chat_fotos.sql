-- ==============================================================================
-- MIGRATION: Fechamento de Negócio, Avaliação Mútua (1 a 5 Estrelas) 
-- & Suporte a Fotos WebP no Chat em Tempo Real - TroqJá
-- Data: 2026-11-06
-- ==============================================================================

-- 1. SUPORTE A FOTOS NO CHAT (tabela mensagens)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'mensagens' AND column_name = 'imagem_url'
    ) THEN
        ALTER TABLE public.mensagens ADD COLUMN imagem_url TEXT DEFAULT NULL;
    END IF;
END $$;

-- Permitir que o conteúdo textual seja opcional quando houver imagem anexada
ALTER TABLE public.mensagens ALTER COLUMN conteudo DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_mensagem_conteudo_ou_imagem'
    ) THEN
        ALTER TABLE public.mensagens 
        ADD CONSTRAINT chk_mensagem_conteudo_ou_imagem 
        CHECK (
            (conteudo IS NOT NULL AND length(trim(conteudo)) > 0) 
            OR (imagem_url IS NOT NULL AND length(trim(imagem_url)) > 0)
        );
    END IF;
END $$;

COMMENT ON COLUMN public.mensagens.imagem_url IS 'URL da foto compactada em WebP enviada na conversa de negociação ou permuta.';

-- 2. VÍNCULO DE COMPRADOR / PARCEIRO DE TROCA NO FECHAMENTO (tabela anuncios)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'comprador_id'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN comprador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'data_fechamento'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN data_fechamento TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_anuncios_comprador_id ON public.anuncios(comprador_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_data_fechamento ON public.anuncios(data_fechamento);

COMMENT ON COLUMN public.anuncios.comprador_id IS 'ID do usuário comprador ou parceiro de troca com quem a negociação foi concretizada.';
COMMENT ON COLUMN public.anuncios.data_fechamento IS 'Data e hora exata em que o negócio foi marcado como concluído/vendido.';

-- 3. TABELA DE AVALIAÇÕES & CACHE DE REPUTAÇÃO EM PROFILES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'avaliacoes' AND column_name = 'tipo_negocio'
    ) THEN
        ALTER TABLE public.avaliacoes ADD COLUMN tipo_negocio TEXT DEFAULT 'venda';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_avaliacoes_tipo_negocio'
    ) THEN
        ALTER TABLE public.avaliacoes 
        ADD CONSTRAINT chk_avaliacoes_tipo_negocio 
        CHECK (tipo_negocio IN ('venda', 'leilao', 'troca'));
    END IF;
END $$;

-- Impedir avaliação duplicada para o mesmo anúncio pelo mesmo avaliador
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_avaliacoes_anuncio_avaliador'
    ) THEN
        ALTER TABLE public.avaliacoes 
        ADD CONSTRAINT uq_avaliacoes_anuncio_avaliador 
        UNIQUE (anuncio_id, avaliador_id);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Colunas de Cache de Reputação na tabela profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'reputacao_media'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN reputacao_media NUMERIC(3,2) NOT NULL DEFAULT 5.00;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'total_avaliacoes'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN total_avaliacoes INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Trigger para recalcular reputação do usuário após inserção/atualização/exclusão de avaliação
CREATE OR REPLACE FUNCTION public.fn_atualizar_reputacao_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_avaliado_id UUID;
    v_media NUMERIC(3,2);
    v_total INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_avaliado_id := OLD.avaliado_id;
    ELSE
        v_avaliado_id := NEW.avaliado_id;
    END IF;

    SELECT 
        COALESCE(ROUND(AVG(nota)::numeric, 2), 5.00),
        COUNT(*)::INTEGER
    INTO v_media, v_total
    FROM public.avaliacoes
    WHERE avaliado_id = v_avaliado_id;

    UPDATE public.profiles
    SET reputacao_media = v_media,
        total_avaliacoes = v_total,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = v_avaliado_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_atualizar_reputacao_perfil ON public.avaliacoes;
CREATE TRIGGER tr_atualizar_reputacao_perfil
AFTER INSERT OR UPDATE OR DELETE ON public.avaliacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_reputacao_perfil();

-- 4. FUNÇÃO RPC: fechar_negocio_anuncio
CREATE OR REPLACE FUNCTION public.fechar_negocio_anuncio(
    p_anuncio_id UUID,
    p_comprador_id UUID DEFAULT NULL,
    p_tipo_fechamento TEXT DEFAULT 'venda'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_anuncio RECORD;
    v_conversa_id UUID;
    v_msg_texto TEXT;
BEGIN
    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Usuário não autenticado.'
        );
    END IF;

    -- Localiza o anúncio
    SELECT id, user_id, titulo, status, modalidade INTO v_anuncio
    FROM public.anuncios
    WHERE id = p_anuncio_id;

    IF v_anuncio.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Anúncio não encontrado.'
        );
    END IF;

    IF v_anuncio.user_id <> v_current_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Apenas o anunciante proprietário pode encerrar ou marcar o anúncio como vendido.'
        );
    END IF;

    -- Atualiza anúncio como vendido e vincula o comprador
    UPDATE public.anuncios
    SET status = 'vendido',
        comprador_id = p_comprador_id,
        data_fechamento = TIMEZONE('utc'::TEXT, NOW()),
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_anuncio_id;

    -- Se um comprador foi informado, localiza conversa ativa correspondente para injetar mensagem de sistema
    IF p_comprador_id IS NOT NULL THEN
        SELECT id INTO v_conversa_id
        FROM public.conversas
        WHERE anuncio_id = p_anuncio_id
          AND ((comprador_id = p_comprador_id AND vendedor_id = v_current_user_id)
            OR (comprador_id = v_current_user_id AND vendedor_id = p_comprador_id))
        LIMIT 1;

        IF v_conversa_id IS NOT NULL THEN
            IF p_tipo_fechamento = 'troca' OR v_anuncio.modalidade = 'troca' THEN
                v_msg_texto := '🤝 Permuta fechada no TroqJá! Ambos os lados já podem avaliar a negociação de 1 a 5 estrelas.';
            ELSE
                v_msg_texto := '🤝 Negócio fechado no TroqJá! Agora vocês já podem avaliar a negociação de 1 a 5 estrelas.';
            END IF;

            INSERT INTO public.mensagens (
                conversa_id,
                sender_id,
                conteudo,
                lida,
                created_at
            ) VALUES (
                v_conversa_id,
                v_current_user_id,
                v_msg_texto,
                false,
                TIMEZONE('utc'::TEXT, NOW())
            );

            UPDATE public.conversas
            SET updated_at = TIMEZONE('utc'::TEXT, NOW())
            WHERE id = v_conversa_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'anuncio_id', p_anuncio_id,
        'comprador_id', p_comprador_id,
        'status', 'vendido',
        'conversa_id', v_conversa_id,
        'message', 'Negócio fechado com sucesso! Agora as partes podem avaliar mutuamente a negociação.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fechar_negocio_anuncio(UUID, UUID, TEXT) TO authenticated, service_role;
