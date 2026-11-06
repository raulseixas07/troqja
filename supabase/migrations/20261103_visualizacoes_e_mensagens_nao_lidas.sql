-- ==============================================================================
-- MIGRATION: Contador de Visitas e Mensagens Não Lidas (Clone OLX)
-- Data: 2026-11-03
-- ==============================================================================

-- 1. Habilitar publicação Realtime para 'anuncios' (caso ainda não esteja habilitado)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.anuncios;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Função segura (SECURITY DEFINER) para incremento de visualizações de anúncio
-- Permite que compradores ou visitantes incrementem +1 visita sem violar a política RLS do dono
CREATE OR REPLACE FUNCTION public.incrementar_visualizacoes_anuncio(p_anuncio_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
BEGIN
    UPDATE public.anuncios
    SET visualizacoes = COALESCE(visualizacoes, 0) + 1
    WHERE id = p_anuncio_id
    RETURNING visualizacoes INTO v_total;

    RETURN COALESCE(v_total, 0);
END;
$$;

-- Permissões de execução para visitantes anônimos e usuários autenticados
GRANT EXECUTE ON FUNCTION public.incrementar_visualizacoes_anuncio(UUID) TO anon, authenticated, service_role;

-- 3. RLS para atualizar mensagens: destinatário pode marcar mensagens recebidas como lidas
DROP POLICY IF EXISTS "Destinatários podem marcar mensagens como lidas" ON public.mensagens;
CREATE POLICY "Destinatários podem marcar mensagens como lidas"
    ON public.mensagens FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversas
            WHERE conversas.id = mensagens.conversa_id
            AND (conversas.comprador_id = auth.uid() OR conversas.vendedor_id = auth.uid())
        )
        AND sender_id <> auth.uid()
    );

-- 4. Função segura para marcar todas as mensagens de uma conversa como lidas
CREATE OR REPLACE FUNCTION public.marcar_mensagens_como_lidas(p_conversa_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_afetadas INTEGER;
BEGIN
    UPDATE public.mensagens
    SET lida = true
    WHERE conversa_id = p_conversa_id
      AND sender_id <> p_user_id
      AND lida = false;

    GET DIAGNOSTICS v_afetadas = ROW_COUNT;
    RETURN COALESCE(v_afetadas, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_mensagens_como_lidas(UUID, UUID) TO anon, authenticated, service_role;

-- 5. Função segura para obter contagem total de mensagens não lidas de um usuário
CREATE OR REPLACE FUNCTION public.obter_total_mensagens_nao_lidas(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.mensagens m
    JOIN public.conversas c ON c.id = m.conversa_id
    WHERE (c.comprador_id = p_user_id OR c.vendedor_id = p_user_id)
      AND m.sender_id <> p_user_id
      AND m.lida = false;

    RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_total_mensagens_nao_lidas(UUID) TO anon, authenticated, service_role;
