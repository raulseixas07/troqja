-- ==============================================================================
-- MIGRATION: Refinamento de Monetização — Radar VIP (R$ 1,99/mês) 
-- & Vitrine Destaque do Vendedor (Pay-per-Highlight) - TroqJá
-- Data: 2026-11-05
-- ==============================================================================

-- 1. ATUALIZAÇÕES NA TABELA 'anuncios'
DO $$
BEGIN
    -- Coluna destacado_vitrine: Prioridade no topo da busca e feed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'destacado_vitrine'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN destacado_vitrine BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN public.anuncios.destacado_vitrine IS 'Indica se o anúncio possui destaque de vitrine ativo (Pay-per-Highlight), ganhando prioridade no topo e selo dourado exclusivo.';
COMMENT ON COLUMN public.anuncios.impulso_desejos IS 'Campo legado mantido por compatibilidade. Disparos da lista de desejos agora são 100% gratuitos e integrados para anúncios de troca e permuta.';

CREATE INDEX IF NOT EXISTS idx_anuncios_destacado_vitrine ON public.anuncios(destacado_vitrine DESC);

-- 2. ATUALIZAÇÕES NA TABELA 'profiles'
DO $$
BEGIN
    -- Créditos avulsos de destaques do vendedor (ex: pacote de 10 destaques por R$ 4,90)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'creditos_destaque_vitrine'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN creditos_destaque_vitrine INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.creditos_destaque_vitrine IS 'Saldo de créditos pré-pagos do vendedor para aplicar Destaque de Vitrine em seus anúncios.';
COMMENT ON COLUMN public.profiles.assinante_comprador_desejos IS 'Assinatura Radar VIP de R$ 1,99/mês para desbloquear todos os alertas da Lista de Desejos em tempo real com selo RADAR VIP.';

-- 3. AJUSTE NA TRIGGER DE NOTIFICAÇÕES (fn_verificar_match_lista_desejos)
-- Lógica Simplificada e Gratuita para o Vendedor:
-- Todo anúncio cruza com a lista_desejos gratuitamente. Se o comprador é assinante do Radar VIP
-- (ou tem alerta_vip_ativo), recebe notificação liberada com selo 'radar_vip'.
-- Caso contrário, recebe com bloqueada_monetizacao = true (convite de R$ 1,99/mês).
CREATE OR REPLACE FUNCTION public.fn_verificar_match_lista_desejos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r_desejo RECORD;
    v_tipo_match TEXT;
    v_prioritario BOOLEAN;
    v_bloqueada BOOLEAN;
BEGIN
    -- Varre a lista de desejos para encontrar correspondências com o título ou categoria do novo anúncio
    FOR r_desejo IN
        SELECT DISTINCT ON (ld.usuario_id, ld.id)
            ld.id AS desejo_id,
            ld.usuario_id,
            ld.termo_desejo,
            ld.alerta_vip_ativo,
            p.assinante_comprador_desejos
        FROM public.lista_desejos ld
        JOIN public.profiles p ON p.id = ld.usuario_id
        WHERE ld.usuario_id <> NEW.user_id
          AND (
            NEW.titulo ILIKE '%' || ld.termo_desejo || '%'
            OR ld.termo_desejo ILIKE '%' || NEW.titulo || '%'
            OR (ld.categoria_id IS NOT NULL AND ld.categoria_id = NEW.categoria_id)
          )
    LOOP
        -- Regras de Notificação:
        -- Se o comprador é assinante Radar VIP (R$ 1,99/mês) ou marcou alerta VIP no termo:
        IF r_desejo.assinante_comprador_desejos = true OR r_desejo.alerta_vip_ativo = true THEN
            v_tipo_match := 'radar_vip';
            v_prioritario := true;
            v_bloqueada := false;
        ELSE
            -- Comprador não assinante: notificação chega bloqueada por monetização
            v_tipo_match := 'padrao';
            v_prioritario := false;
            v_bloqueada := true;
        END IF;

        -- Insere alerta para o comprador interessado
        INSERT INTO public.notificacoes_desejos (
            usuario_id,
            anuncio_id,
            desejo_id,
            tipo_match,
            prioritario,
            bloqueada_monetizacao,
            lida,
            created_at
        ) VALUES (
            r_desejo.usuario_id,
            NEW.id,
            r_desejo.desejo_id,
            v_tipo_match,
            v_prioritario,
            v_bloqueada,
            false,
            TIMEZONE('utc'::TEXT, NOW())
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- Recria a trigger na tabela 'anuncios'
DROP TRIGGER IF EXISTS trg_verificar_match_lista_desejos ON public.anuncios;
CREATE TRIGGER trg_verificar_match_lista_desejos
    AFTER INSERT ON public.anuncios
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_verificar_match_lista_desejos();

-- 4. RPC: destacar_anuncio_vitrine (Pay-per-Highlight do Vendedor)
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
    v_current_user_id UUID;
    v_anuncio_user_id UUID;
    v_saldo_creditos INTEGER := 0;
    v_novos_creditos INTEGER := 0;
    v_preco_cobrado NUMERIC(10, 2) := 1.99;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Usuário não autenticado.'
        );
    END IF;

    -- Verifica se o anúncio existe e pertence ao usuário autenticado
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

    -- Processa conforme a opção escolhida
    IF p_opcao = 'pacote_10' THEN
        -- Pacote com 10 Destaques por R$ 4,90 (1 aplicado agora + 9 créditos salvos no saldo)
        v_novos_creditos := v_saldo_creditos + 9;
        v_preco_cobrado := 4.90;

        UPDATE public.profiles
        SET creditos_destaque_vitrine = v_novos_creditos,
            updated_at = TIMEZONE('utc'::TEXT, NOW())
        WHERE id = v_current_user_id;
    ELSIF p_opcao = 'credito' AND v_saldo_creditos > 0 THEN
        -- Utiliza 1 crédito pré-pago existente
        v_novos_creditos := v_saldo_creditos - 1;
        v_preco_cobrado := 0.00;

        UPDATE public.profiles
        SET creditos_destaque_vitrine = v_novos_creditos,
            updated_at = TIMEZONE('utc'::TEXT, NOW())
        WHERE id = v_current_user_id;
    ELSE
        -- Opção A: Destaque Avulso por R$ 1,99
        v_novos_creditos := v_saldo_creditos;
        v_preco_cobrado := 1.99;
    END IF;

    -- Ativa o destaque de vitrine no anúncio
    UPDATE public.anuncios
    SET destacado_vitrine = true,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_anuncio_id;

    RETURN jsonb_build_object(
        'success', true,
        'anuncio_id', p_anuncio_id,
        'destacado_vitrine', true,
        'opcao', p_opcao,
        'valor_pago', v_preco_cobrado,
        'creditos_restantes', v_novos_creditos,
        'message', 'Anúncio turbinado com Destaque de Vitrine com sucesso! Ele aparecerá com o selo 🔥 DESTAQUE no topo das buscas.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.destacar_anuncio_vitrine(UUID, TEXT) TO authenticated, service_role;
