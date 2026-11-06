-- ==============================================================================
-- MIGRATION: Modo Leilão (eBay), Aceita Troca e Sistema de Reputação - TroqJá
-- Data: 2026-11-04
-- ==============================================================================

-- 1. NOVOS CAMPOS NA TABELA 'anuncios'
DO $$ 
BEGIN
    -- Modalidade: venda, leilao, troca
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'modalidade'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN modalidade TEXT NOT NULL DEFAULT 'venda' CHECK (modalidade IN ('venda', 'leilao', 'troca'));
    END IF;

    -- Aceita Troca / Permuta (switch independente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'aceita_troca'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN aceita_troca BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Itens ou condições de interesse na troca
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'itens_troca'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN itens_troca TEXT;
    END IF;

    -- Campos específicos de Leilão estilo eBay
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'lance_inicial'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN lance_inicial NUMERIC(12, 2) CHECK (lance_inicial >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'lance_atual'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN lance_atual NUMERIC(12, 2) CHECK (lance_atual >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'incremento_minimo'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN incremento_minimo NUMERIC(12, 2) NOT NULL DEFAULT 10.00 CHECK (incremento_minimo > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'leilao_encerramento'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN leilao_encerramento TIMESTAMPTZ;
    END IF;
END $$;

-- Índices de performance para busca por modalidade, troca e status de leilões
CREATE INDEX IF NOT EXISTS idx_anuncios_modalidade ON public.anuncios(modalidade);
CREATE INDEX IF NOT EXISTS idx_anuncios_aceita_troca ON public.anuncios(aceita_troca);
CREATE INDEX IF NOT EXISTS idx_anuncios_leilao_encerramento ON public.anuncios(leilao_encerramento);

-- ==============================================================================
-- 2. TABELA: lances (Histórico de Lances em Tempo Real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.lances IS 'Histórico de lances dados por usuários em anúncios com modalidade de leilão.';

CREATE INDEX IF NOT EXISTS idx_lances_anuncio_id ON public.lances(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_lances_usuario_id ON public.lances(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lances_created_at ON public.lances(created_at DESC);

-- ==============================================================================
-- 3. FUNÇÃO RPC: registrar_lance (Execução Atômica e Concorrência Segura)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.registrar_lance(
    p_anuncio_id UUID,
    p_valor NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_anuncio RECORD;
    v_minimo_necessario NUMERIC;
    v_novo_lance RECORD;
BEGIN
    -- 1. Obter usuário logado
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado. Faça login para dar lances.';
    END IF;

    -- 2. Travar a linha do anúncio com lock exclusivo FOR UPDATE para evitar race condition
    SELECT * INTO v_anuncio
    FROM public.anuncios
    WHERE id = p_anuncio_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anúncio não encontrado.';
    END IF;

    -- 3. Validações de negócio do leilão
    IF v_anuncio.modalidade <> 'leilao' THEN
        RAISE EXCEPTION 'Este anúncio não está configurado na modalidade leilão.';
    END IF;

    IF v_anuncio.status <> 'ativo' THEN
        RAISE EXCEPTION 'Este leilão não está ativo para receber lances.';
    END IF;

    IF v_anuncio.user_id = v_user_id THEN
        RAISE EXCEPTION 'Você é o proprietário deste anúncio e não pode dar lances nele.';
    END IF;

    IF v_anuncio.leilao_encerramento IS NOT NULL AND NOW() >= v_anuncio.leilao_encerramento THEN
        RAISE EXCEPTION 'Este leilão já encerrou o período de lances.';
    END IF;

    -- 4. Cálculo do valor mínimo permitido
    IF v_anuncio.lance_atual IS NOT NULL AND v_anuncio.lance_atual > 0 THEN
        v_minimo_necessario := v_anuncio.lance_atual + COALESCE(v_anuncio.incremento_minimo, 10.00);
    ELSE
        v_minimo_necessario := COALESCE(v_anuncio.lance_inicial, 1.00);
    END IF;

    IF p_valor < v_minimo_necessario THEN
        RAISE EXCEPTION 'O valor do lance (R$ %) é inferior ao mínimo obrigatório (R$ %).', p_valor, v_minimo_necessario;
    END IF;

    -- 5. Inserir lance no histórico
    INSERT INTO public.lances (anuncio_id, usuario_id, valor, created_at)
    VALUES (p_anuncio_id, v_user_id, p_valor, TIMEZONE('utc'::TEXT, NOW()))
    RETURNING * INTO v_novo_lance;

    -- 6. Atualizar anúncio de forma atômica
    UPDATE public.anuncios
    SET lance_atual = p_valor,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_anuncio_id;

    RETURN jsonb_build_object(
        'success', true,
        'lance_id', v_novo_lance.id,
        'anuncio_id', p_anuncio_id,
        'valor', p_valor,
        'created_at', v_novo_lance.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_lance(UUID, NUMERIC) TO authenticated, service_role;

-- ==============================================================================
-- 4. TABELA: avaliacoes (Feedback Stars Estilo eBay)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id UUID REFERENCES public.anuncios(id) ON DELETE SET NULL,
    avaliador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    avaliado_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT chk_diferente_usuario_avaliacao CHECK (avaliador_id <> avaliado_id)
);

COMMENT ON TABLE public.avaliacoes IS 'Avaliações e reputação com estrelas (1 a 5) entre usuários do TroqJá.';

CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliado_id ON public.avaliacoes(avaliado_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliador_id ON public.avaliacoes(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_anuncio_id ON public.avaliacoes(anuncio_id);

-- View para consulta consolidada de reputação
CREATE OR REPLACE VIEW public.reputacao_usuarios AS
SELECT 
    p.id AS user_id,
    COALESCE(ROUND(AVG(a.nota)::numeric, 1), 5.0) AS media_estrelas,
    COUNT(a.id)::INTEGER AS total_avaliacoes
FROM public.profiles p
LEFT JOIN public.avaliacoes a ON a.avaliado_id = p.id
GROUP BY p.id;

-- Função segura para obter reputação de qualquer perfil
CREATE OR REPLACE FUNCTION public.obter_reputacao_usuario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_media NUMERIC(3, 1);
    v_total INTEGER;
BEGIN
    SELECT 
        COALESCE(ROUND(AVG(nota)::numeric, 1), 5.0),
        COUNT(*)::INTEGER
    INTO v_media, v_total
    FROM public.avaliacoes
    WHERE avaliado_id = p_user_id;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'media_estrelas', COALESCE(v_media, 5.0),
        'total_avaliacoes', COALESCE(v_total, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_reputacao_usuario(UUID) TO anon, authenticated, service_role;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.lances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- 5.1 Policies para 'lances'
DROP POLICY IF EXISTS "Lances são visíveis publicamente" ON public.lances;
CREATE POLICY "Lances são visíveis publicamente"
    ON public.lances FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir lances" ON public.lances;
CREATE POLICY "Usuários autenticados podem inserir lances"
    ON public.lances FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

-- 5.2 Policies para 'avaliacoes'
DROP POLICY IF EXISTS "Avaliações são públicas para leitura" ON public.avaliacoes;
CREATE POLICY "Avaliações são públicas para leitura"
    ON public.avaliacoes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar avaliações" ON public.avaliacoes;
CREATE POLICY "Usuários autenticados podem criar avaliações"
    ON public.avaliacoes FOR INSERT
    WITH CHECK (auth.uid() = avaliador_id AND auth.uid() <> avaliado_id);

-- ==============================================================================
-- 6. SUPABASE REALTIME
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lances;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.avaliacoes;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
