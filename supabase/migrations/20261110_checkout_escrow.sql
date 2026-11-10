-- ==============================================================================
-- MIGRATION: Checkout Integrado com Custódia (Escrow), Split Progressivo (5% / 7%)
-- e Código PIN de 6 Dígitos - TroqJá
-- Data: 2026-11-10
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transacoes_escrow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id TEXT NOT NULL,
    comprador_id TEXT NOT NULL,
    vendedor_id TEXT NOT NULL,
    modalidade TEXT NOT NULL CHECK (modalidade IN ('venda_direta', 'leilao', 'permuta_volta')),
    metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('pix', 'cartao_credito')),
    parcelas INTEGER NOT NULL DEFAULT 1 CHECK (parcelas >= 1 AND parcelas <= 12),
    valor_base NUMERIC(12, 2) NOT NULL CHECK (valor_base > 0),
    valor_total_comprador NUMERIC(12, 2) NOT NULL CHECK (valor_total_comprador >= valor_base),
    percentual_taxa NUMERIC(5, 2) NOT NULL CHECK (percentual_taxa IN (5, 7)),
    taxa_troqja NUMERIC(12, 2) NOT NULL CHECK (taxa_troqja >= 0),
    liquido_vendedor NUMERIC(12, 2) NOT NULL CHECK (liquido_vendedor >= 0),
    codigo_pin TEXT,
    status TEXT NOT NULL DEFAULT 'aguardando_pagamento' CHECK (
        status IN (
            'aguardando_pagamento',
            'pago_em_custodia',
            'liberado_vendedor',
            'em_disputa',
            'cancelado'
        )
    ),
    gateway_provider TEXT NOT NULL DEFAULT 'simulador_troqja' CHECK (
        gateway_provider IN ('mercadopago', 'asaas', 'simulador_troqja')
    ),
    gateway_payment_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
    liberado_em TIMESTAMPTZ DEFAULT NULL
);

-- Índices para performance em consultas por anúncio, comprador, vendedor e status
CREATE INDEX IF NOT EXISTS idx_transacoes_escrow_anuncio_id
    ON public.transacoes_escrow(anuncio_id);

CREATE INDEX IF NOT EXISTS idx_transacoes_escrow_comprador_id
    ON public.transacoes_escrow(comprador_id);

CREATE INDEX IF NOT EXISTS idx_transacoes_escrow_vendedor_id
    ON public.transacoes_escrow(vendedor_id);

CREATE INDEX IF NOT EXISTS idx_transacoes_escrow_status
    ON public.transacoes_escrow(status);

CREATE INDEX IF NOT EXISTS idx_transacoes_escrow_created_at
    ON public.transacoes_escrow(created_at DESC);

COMMENT ON TABLE public.transacoes_escrow IS 'Transações financeiras com custódia (Escrow), split automático TroqJá (5% até R$ 1.000 / 7% acima) e liberação por Código PIN de 6 dígitos.';
COMMENT ON COLUMN public.transacoes_escrow.codigo_pin IS 'Código aleatório de 6 dígitos gerado na aprovação do pagamento para confirmação de entrega (Unboxing Seguro).';
COMMENT ON COLUMN public.transacoes_escrow.liquido_vendedor IS 'Valor líquido protegido em custódia que será liberado ao vendedor após validação do PIN ou em 7 dias.';

-- Segurança: Row Level Security (RLS)
ALTER TABLE public.transacoes_escrow ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transacoes_escrow'
          AND policyname = 'Participantes podem visualizar suas transacoes escrow'
    ) THEN
        CREATE POLICY "Participantes podem visualizar suas transacoes escrow"
            ON public.transacoes_escrow
            FOR SELECT
            USING (
                auth.uid()::text = comprador_id
                OR auth.uid()::text = vendedor_id
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transacoes_escrow'
          AND policyname = 'Comprador autenticado pode criar transacao escrow'
    ) THEN
        CREATE POLICY "Comprador autenticado pode criar transacao escrow"
            ON public.transacoes_escrow
            FOR INSERT
            WITH CHECK (auth.uid()::text = comprador_id);
    END IF;
END $$;

-- Função RPC para validação do Código PIN e liberação imediata do saldo em custódia
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

    IF v_tx.status = 'liberado_vendedor' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'liberado_vendedor',
            'liquido_vendedor', v_tx.liquido_vendedor,
            'liberado_em', v_tx.liberado_em,
            'message', 'O saldo desta transação já foi liberado ao vendedor.'
        );
    END IF;

    IF v_tx.status <> 'pago_em_custodia' THEN
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
    SET status = 'liberado_vendedor',
        liberado_em = TIMEZONE('utc'::TEXT, NOW())
    WHERE id = p_transacao_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'liberado_vendedor',
        'liquido_vendedor', v_tx.liquido_vendedor,
        'liberado_em', TIMEZONE('utc'::TEXT, NOW()),
        'message', 'PIN validado com sucesso! Saldo líquido liberado ao vendedor.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.liberar_escrow_por_pin(UUID, TEXT) TO authenticated, service_role;
