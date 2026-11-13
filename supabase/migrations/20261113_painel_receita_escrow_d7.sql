-- ==============================================================================
-- MIGRATION: Escrow TroqJá com Liberação D+7 & Painel de Receita do Vendedor
-- Data: 2026-11-13
-- Regra de Negócio:
-- 1. O PIN de 6 dígitos confirma a entrega presencial do produto.
-- 2. A validação do PIN move o status para 'pin_verified_blocked_7d' (Saldo Bloqueado 7D).
-- 3. Inicia contagem regressiva obrigatória de 7 dias antes do saldo migrar para disponível.
-- ==============================================================================

-- 1. Adiciona colunas de auditoria de PIN e liberação programada D+7
ALTER TABLE IF EXISTS public.transacoes_escrow
    ADD COLUMN IF NOT EXISTS pin_verified_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ DEFAULT NULL;

-- 2. Atualiza constraint de status para permitir os novos estados
ALTER TABLE IF EXISTS public.transacoes_escrow
    DROP CONSTRAINT IF EXISTS transacoes_escrow_status_check;

ALTER TABLE IF EXISTS public.transacoes_escrow
    ADD CONSTRAINT transacoes_escrow_status_check CHECK (
        status IN (
            'aguardando_pagamento',
            'escrow_retained',
            'pago_em_custodia',
            'pin_verified_blocked_7d',
            'liberado_vendedor',
            'em_disputa',
            'cancelado'
        )
    );

-- 3. Atualiza função RPC para validar PIN presencial e colocar em garantia D+7
CREATE OR REPLACE FUNCTION public.liberar_escrow_por_pin(
    p_transacao_id UUID,
    p_codigo_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx public.transacoes_escrow%ROWTYPE;
    v_pin_limpo TEXT := regexp_replace(COALESCE(p_codigo_pin, ''), '\D', '', 'g');
    v_now TIMESTAMPTZ := TIMEZONE('utc'::TEXT, NOW());
    v_release_date TIMESTAMPTZ := v_now + INTERVAL '7 days';
BEGIN
    SELECT * INTO v_tx
    FROM public.transacoes_escrow
    WHERE id = p_transacao_id;

    IF v_tx.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Transação de custódia não encontrada.'
        );
    END IF;

    IF v_tx.status = 'pin_verified_blocked_7d' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'pin_verified_blocked_7d',
            'liquido_vendedor', v_tx.liquido_vendedor,
            'pin_verified_at', v_tx.pin_verified_at,
            'release_date', v_tx.release_date,
            'message', 'A entrega já foi confirmada por PIN e o saldo está em Garantia de 7 Dias.'
        );
    END IF;

    IF v_tx.status = 'liberado_vendedor' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'liberado_vendedor',
            'liquido_vendedor', v_tx.liquido_vendedor,
            'liberado_em', v_tx.liberado_em,
            'message', 'O saldo desta transação já foi liberado para saque.'
        );
    END IF;

    IF v_tx.status NOT IN ('pago_em_custodia', 'escrow_retained') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A transação ainda não está com pagamento retido em custódia.'
        );
    END IF;

    IF v_tx.codigo_pin IS NULL OR v_tx.codigo_pin <> v_pin_limpo THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Código PIN inválido. Verifique os 6 dígitos informados pelo comprador.'
        );
    END IF;

    UPDATE public.transacoes_escrow
    SET status = 'pin_verified_blocked_7d',
        pin_verified_at = v_now,
        release_date = v_release_date
    WHERE id = p_transacao_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'pin_verified_blocked_7d',
        'liquido_vendedor', v_tx.liquido_vendedor,
        'pin_verified_at', v_now,
        'release_date', v_release_date,
        'message', 'PIN confirmado com sucesso! Entrega presencial registrada e saldo em garantia 7D.'
    );
END;
$$;

-- 4. Função RPC para migrar pedidos de Saldo Bloqueado 7D para Saldo Disponível após vencimento
CREATE OR REPLACE FUNCTION public.processar_liberacao_automatica_7d()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE public.transacoes_escrow
    SET status = 'liberado_vendedor',
        liberado_em = TIMEZONE('utc'::TEXT, NOW())
    WHERE status = 'pin_verified_blocked_7d'
      AND release_date <= TIMEZONE('utc'::TEXT, NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
