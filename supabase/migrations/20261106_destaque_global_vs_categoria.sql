-- ==============================================================================
-- MIGRATION: Destaque de Vitrine Diferenciado (Opção A Global vs Opção B Categoria)
-- Plataforma: TroqJá
-- Data: 2026-11-06
-- ==============================================================================

-- 1. ADICIONA A COLUNA tipo_destaque NA TABELA 'anuncios'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'tipo_destaque'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN tipo_destaque TEXT DEFAULT NULL;
    END IF;
END $$;

-- Garante restrição de valores válidos ('global' ou 'categoria')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_anuncios_tipo_destaque'
    ) THEN
        ALTER TABLE public.anuncios 
        ADD CONSTRAINT chk_anuncios_tipo_destaque 
        CHECK (tipo_destaque IS NULL OR tipo_destaque IN ('global', 'categoria'));
    END IF;
END $$;

COMMENT ON COLUMN public.anuncios.tipo_destaque IS 'Tipo de alcance do destaque: "global" (Opção A - visível em todas as categorias e home) ou "categoria" (Opção B - visível prioritariamente na categoria correspondente).';

-- 2. MIGRAÇÃO DE DADOS ANTIGOS
-- Anúncios antigos que já possuíam destaque ativo recebem tipo_destaque padrão ('categoria' ou 'global')
UPDATE public.anuncios
SET tipo_destaque = 'categoria'
WHERE destacado_vitrine = true AND (tipo_destaque IS NULL OR tipo_destaque = '');

-- 3. ÍNDICES DE PERFORMANCE PARA O CARROSSEL E BUSCAS
CREATE INDEX IF NOT EXISTS idx_anuncios_destaque_tipo 
ON public.anuncios(destacado_vitrine, tipo_destaque, categoria_id) 
WHERE status = 'ativo';

-- 4. ATUALIZAÇÃO DA FUNÇÃO RPC: destacar_anuncio_vitrine
CREATE OR REPLACE FUNCTION public.destacar_anuncio_vitrine(
    p_anuncio_id UUID,
    p_opcao TEXT DEFAULT 'avulso'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_anuncio_user_id UUID;
    v_saldo_creditos INTEGER;
    v_novos_creditos INTEGER;
    v_preco_cobrado NUMERIC(10,2);
    v_tipo_destaque TEXT;
BEGIN
    -- Verifica se o usuário está autenticado
    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Usuário não autenticado.'
        );
    END IF;

    -- Localiza o anúncio e confere o proprietário
    SELECT user_id INTO v_anuncio_user_id
    FROM public.anuncios
    WHERE id = p_anuncio_id;

    IF v_anuncio_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Anúncio não encontrado.'
        );
    END IF;

    IF v_anuncio_user_id <> v_current_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Você só pode destacar seus próprios anúncios.'
        );
    END IF;

    -- Busca saldo de créditos do vendedor
    SELECT COALESCE(creditos_destaque_vitrine, 0)
    INTO v_saldo_creditos
    FROM public.profiles
    WHERE id = v_current_user_id;

    -- Processa conforme a opção escolhida:
    -- 'avulso' -> Opção A: Destaque Global em Todas as Categorias (R$ 1,99)
    -- 'pacote_10' -> Opção B: Pacote com 10 Destaques na Categoria (R$ 4,90 - 1 imediato + 9 no saldo)
    -- 'credito' -> Opção B: Usa 1 crédito salvo do saldo na categoria do anúncio
    IF p_opcao = 'pacote_10' THEN
        v_novos_creditos := v_saldo_creditos + 9;
        v_preco_cobrado := 4.90;
        v_tipo_destaque := 'categoria';

        UPDATE public.profiles
        SET creditos_destaque_vitrine = v_novos_creditos,
            updated_at = TIMEZONE('utc'::TEXT, NOW())
        WHERE id = v_current_user_id;
    ELSIF p_opcao = 'credito' AND v_saldo_creditos > 0 THEN
        v_novos_creditos := v_saldo_creditos - 1;
        v_preco_cobrado := 0.00;
        v_tipo_destaque := 'categoria';

        UPDATE public.profiles
        SET creditos_destaque_vitrine = v_novos_creditos,
            updated_at = TIMEZONE('utc'::TEXT, NOW())
        WHERE id = v_current_user_id;
    ELSE
        -- Opção A: Destaque Avulso Global (R$ 1,99)
        v_novos_creditos := v_saldo_creditos;
        v_preco_cobrado := 1.99;
        v_tipo_destaque := 'global';
    END IF;

    -- Ativa o destaque de vitrine e grava o tipo_destaque
    UPDATE public.anuncios
    SET destacado_vitrine = true,
        tipo_destaque = v_tipo_destaque,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_anuncio_id;

    RETURN jsonb_build_object(
        'success', true,
        'anuncio_id', p_anuncio_id,
        'destacado_vitrine', true,
        'tipo_destaque', v_tipo_destaque,
        'opcao', p_opcao,
        'valor_pago', v_preco_cobrado,
        'creditos_restantes', v_novos_creditos,
        'message', CASE 
            WHEN v_tipo_destaque = 'global' THEN 'Anúncio turbinado com 👑 DESTAQUE GLOBAL! Visível em todas as categorias e no carrossel superior.'
            ELSE 'Anúncio turbinado com 🔥 DESTAQUE NA CATEGORIA! Visível no carrossel de destaques da categoria correspondente.'
        END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.destacar_anuncio_vitrine(UUID, TEXT) TO authenticated, service_role;
