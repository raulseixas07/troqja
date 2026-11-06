-- ==============================================================================
-- MIGRATION: Modalidade "Troca-Troca", Lista de Desejos, Contador em Tempo Real
-- e Dupla Assinatura de Monetização (R$ 1,99/mês) - TroqJá
-- Data: 2026-11-04
-- ==============================================================================

-- 1. NOVOS CAMPOS EM 'profiles' (Controle de Assinaturas de R$ 1,99/mês)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assinante_comprador_desejos'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN assinante_comprador_desejos BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assinante_anunciante_impulso'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN assinante_anunciante_impulso BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.assinante_comprador_desejos IS 'Assinatura Radar VIP de R$ 1,99/mês para desbloquear alertas da Lista de Desejos em tempo real.';
COMMENT ON COLUMN public.profiles.assinante_anunciante_impulso IS 'Assinatura Impulso de R$ 1,99/mês para vendedores dispararem alertas prioritários aos interessados na Wishlist.';

-- 2. NOVOS CAMPOS NA TABELA 'anuncios'
DO $$
BEGIN
    -- Condição de Negociação da Troca
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'condicao_troca'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN condicao_troca TEXT CHECK (condicao_troca IN ('pau_a_pau', 'aceita_volta', 'da_volta', 'qualquer'));
    END IF;

    -- Impulso de Desejos no Anúncio (Vendedor Assinante R$ 1,99/mês)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'anuncios' AND column_name = 'impulso_desejos'
    ) THEN
        ALTER TABLE public.anuncios ADD COLUMN impulso_desejos BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_anuncios_condicao_troca ON public.anuncios(condicao_troca);
CREATE INDEX IF NOT EXISTS idx_anuncios_impulso_desejos ON public.anuncios(impulso_desejos);

-- ==============================================================================
-- 3. TABELA: lista_desejos (Wishlist de Termos e Categorias dos Usuários)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lista_desejos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    termo_desejo TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    valor_maximo NUMERIC(12, 2) CHECK (valor_maximo IS NULL OR valor_maximo >= 0),
    alerta_vip_ativo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.lista_desejos IS 'Itens e termos monitorados pelos usuários do TroqJá para receber alertas de novos anúncios compatíveis.';

CREATE INDEX IF NOT EXISTS idx_lista_desejos_usuario_id ON public.lista_desejos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lista_desejos_termo ON public.lista_desejos USING gin (to_tsvector('portuguese', termo_desejo));
CREATE INDEX IF NOT EXISTS idx_lista_desejos_categoria_id ON public.lista_desejos(categoria_id);

-- ==============================================================================
-- 4. TABELA: notificacoes_desejos (Alertas de Match em Tempo Real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notificacoes_desejos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    anuncio_id UUID NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
    desejo_id UUID REFERENCES public.lista_desejos(id) ON DELETE SET NULL,
    tipo_match TEXT NOT NULL CHECK (tipo_match IN ('radar_vip', 'impulso_vendedor', 'padrao')),
    prioritario BOOLEAN NOT NULL DEFAULT false,
    bloqueada_monetizacao BOOLEAN NOT NULL DEFAULT false,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

COMMENT ON TABLE public.notificacoes_desejos IS 'Notificações geradas quando um anúncio dá match com termos da lista de desejos.';

CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_usuario_id ON public.notificacoes_desejos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_anuncio_id ON public.notificacoes_desejos(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_lida ON public.notificacoes_desejos(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_desejos_created_at ON public.notificacoes_desejos(created_at DESC);

-- ==============================================================================
-- 5. RPC: contar_interessados_desejo (Radar de Interessados Ao Vivo)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.contar_interessados_desejo(
    p_titulo TEXT,
    p_categoria_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER := 0;
    v_clean_titulo TEXT;
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    v_clean_titulo := TRIM(COALESCE(p_titulo, ''));

    -- Se o título tem pelo menos 2 caracteres ou categoria informada
    IF LENGTH(v_clean_titulo) >= 2 OR p_categoria_id IS NOT NULL THEN
        SELECT COUNT(DISTINCT ld.usuario_id)
        INTO v_total
        FROM public.lista_desejos ld
        WHERE (v_current_user_id IS NULL OR ld.usuario_id <> v_current_user_id)
          AND (
            (LENGTH(v_clean_titulo) >= 2 AND (
                v_clean_titulo ILIKE '%' || ld.termo_desejo || '%'
                OR ld.termo_desejo ILIKE '%' || v_clean_titulo || '%'
            ))
            OR (p_categoria_id IS NOT NULL AND ld.categoria_id = p_categoria_id)
          );
    END IF;

    RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.contar_interessados_desejo(TEXT, UUID) TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. RPC: ativar_assinatura_comprador (Radar VIP - R$ 1,99/mês)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.ativar_assinatura_comprador(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        v_current_user_id := p_user_id;
    END IF;

    -- Ativar assinatura do comprador no perfil
    UPDATE public.profiles
    SET assinante_comprador_desejos = true,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = v_current_user_id;

    -- Ativar alerta VIP para todos os desejos atuais do usuário
    UPDATE public.lista_desejos
    SET alerta_vip_ativo = true
    WHERE usuario_id = v_current_user_id;

    -- Desbloquear notificações bloqueadas anteriormente
    UPDATE public.notificacoes_desejos
    SET bloqueada_monetizacao = false
    WHERE usuario_id = v_current_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_current_user_id,
        'plano', 'radar_vip_comprador',
        'valor_mensal', 1.99,
        'message', 'Assinatura Radar VIP ativada com sucesso! Todos os matches foram desbloqueados.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ativar_assinatura_comprador(UUID) TO authenticated, service_role;

-- ==============================================================================
-- 7. RPC: ativar_assinatura_anunciante (Impulso de Desejos - R$ 1,99/mês)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.ativar_assinatura_anunciante(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        v_current_user_id := p_user_id;
    END IF;

    -- Ativar assinatura de impulso do vendedor no perfil
    UPDATE public.profiles
    SET assinante_anunciante_impulso = true,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = v_current_user_id;

    -- Ativar impulso em todos os anúncios ativos deste vendedor
    UPDATE public.anuncios
    SET impulso_desejos = true,
        updated_at = TIMEZONE('utc'::TEXT, NOW())
    WHERE user_id = v_current_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_current_user_id,
        'plano', 'impulso_anunciante',
        'valor_mensal', 1.99,
        'message', 'Assinatura Impulso de Desejos ativada com sucesso! Seus anúncios notificarão interessados na Wishlist prioritariamente.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ativar_assinatura_anunciante(UUID) TO authenticated, service_role;

-- ==============================================================================
-- 8. TRIGGER AUTOMÁTICA: fn_verificar_match_lista_desejos
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_verificar_match_lista_desejos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vendedor_tem_impulso BOOLEAN := false;
    r_desejo RECORD;
    v_tipo_match TEXT;
    v_prioritario BOOLEAN;
    v_bloqueada BOOLEAN;
BEGIN
    -- 1. Verifica se o vendedor tem assinatura de impulso ou se o anúncio veio com impulso
    IF NEW.impulso_desejos = true THEN
        v_vendedor_tem_impulso := true;
    ELSE
        SELECT assinante_anunciante_impulso
        INTO v_vendedor_tem_impulso
        FROM public.profiles
        WHERE id = NEW.user_id;
        v_vendedor_tem_impulso := COALESCE(v_vendedor_tem_impulso, false);
    END IF;

    -- 2. Varre a lista de desejos para encontrar correspondências
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
        -- Regras de Notificação e Monetização
        IF v_vendedor_tem_impulso THEN
            v_tipo_match := 'impulso_vendedor';
            v_prioritario := true;
            v_bloqueada := false;
        ELSE
            IF r_desejo.assinante_comprador_desejos = true OR r_desejo.alerta_vip_ativo = true THEN
                v_tipo_match := 'radar_vip';
                v_prioritario := false;
                v_bloqueada := false;
            ELSE
                v_tipo_match := 'padrao';
                v_prioritario := false;
                v_bloqueada := true;
            END IF;
        END IF;

        -- Insere alerta para o interessado
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

DROP TRIGGER IF EXISTS trg_verificar_match_lista_desejos ON public.anuncios;
CREATE TRIGGER trg_verificar_match_lista_desejos
    AFTER INSERT ON public.anuncios
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_verificar_match_lista_desejos();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.lista_desejos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_desejos ENABLE ROW LEVEL SECURITY;

-- 9.1 Policies para 'lista_desejos'
DROP POLICY IF EXISTS "Usuários gerenciam sua própria lista de desejos" ON public.lista_desejos;
CREATE POLICY "Usuários gerenciam sua própria lista de desejos"
    ON public.lista_desejos
    FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- 9.2 Policies para 'notificacoes_desejos'
DROP POLICY IF EXISTS "Usuários visualizam e gerenciam suas próprias notificações de desejos" ON public.notificacoes_desejos;
CREATE POLICY "Usuários visualizam e gerenciam suas próprias notificações de desejos"
    ON public.notificacoes_desejos
    FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- ==============================================================================
-- 10. SUPABASE REALTIME
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lista_desejos;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes_desejos;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
