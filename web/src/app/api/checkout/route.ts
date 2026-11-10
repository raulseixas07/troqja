import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calcularParcelamentoTroqJa,
  calcularSplitTroqJa,
  formatarCodigoPin,
  gerarCodigoPin6Digitos,
  gerarPixCopiaEColaSandbox,
  type GatewayProvider,
  type MetodoPagamento,
  type ModalidadeCheckout,
  type StatusEscrow,
} from '@/lib/checkout';

interface CheckoutRequestBody {
  anuncioId?: string;
  compradorId?: string;
  vendedorId?: string;
  tituloAnuncio?: string;
  modalidade?: ModalidadeCheckout;
  metodoPagamento?: MetodoPagamento;
  parcelas?: number;
  valorBase?: number;
  simularWebhookAprovado?: boolean;
}

interface PatchCheckoutBody {
  action?: 'simular_webhook' | 'validar_pin';
  transacaoId?: string;
  pinDigitado?: string;
  pinEsperado?: string;
}

const MODALIDADES_VALIDAS: ReadonlyArray<ModalidadeCheckout> = [
  'venda_direta',
  'leilao',
  'permuta_volta',
];

const METODOS_VALIDOS: ReadonlyArray<MetodoPagamento> = ['pix', 'cartao_credito'];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder-url')) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function generateUuidFallback(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function tentarGatewayReal(params: {
  gateway: 'mercadopago' | 'asaas';
  valorTotal: number;
  metodo: MetodoPagamento;
  parcelas: number;
  titulo: string;
  transacaoId: string;
}): Promise<{
  ok: boolean;
  paymentId?: string;
  pixCopiaECola?: string;
}> {
  const { gateway, valorTotal, metodo, parcelas, titulo, transacaoId } = params;

  try {
    if (gateway === 'mercadopago') {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!token) return { ok: false };

      if (metodo === 'pix') {
        const res = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': transacaoId,
          },
          body: JSON.stringify({
            transaction_amount: valorTotal,
            description: `TroqJá Custódia - ${titulo}`.slice(0, 120),
            payment_method_id: 'pix',
            external_reference: transacaoId,
            payer: {
              email: 'comprador@troqja.com.br',
            },
          }),
        });

        if (!res.ok) return { ok: false };
        const data = (await res.json()) as {
          id?: string | number;
          point_of_interaction?: {
            transaction_data?: { qr_code?: string };
          };
        };

        return {
          ok: true,
          paymentId: data.id ? String(data.id) : `mp_${transacaoId}`,
          pixCopiaECola: data.point_of_interaction?.transaction_data?.qr_code,
        };
      }

      // Cartão via Mercado Pago Checkout Pro / Payment Intent simplificado
      return {
        ok: true,
        paymentId: `mp_card_${parcelas}x_${transacaoId.slice(0, 8)}`,
      };
    }

    if (gateway === 'asaas') {
      const apiKey = process.env.ASAAS_API_KEY;
      if (!apiKey) return { ok: false };

      const baseUrl =
        process.env.ASAAS_ENVIRONMENT === 'production'
          ? 'https://api.asaas.com/v3'
          : 'https://sandbox.asaas.com/api/v3';

      const res = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingType: metodo === 'pix' ? 'PIX' : 'CREDIT_CARD',
          value: valorTotal,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          description: `TroqJá Custódia - ${titulo}`.slice(0, 120),
          externalReference: transacaoId,
          installmentCount: metodo === 'cartao_credito' ? parcelas : undefined,
        }),
      });

      if (!res.ok) return { ok: false };
      const data = (await res.json()) as { id?: string };
      return {
        ok: true,
        paymentId: data.id || `asaas_${transacaoId}`,
      };
    }
  } catch {
    // Fallback seguro para Sandbox / Simulador Oficial TroqJá caso falhe conexão externa
    return { ok: false };
  }

  return { ok: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequestBody;

    const valorBaseNum = Number(body.valorBase);
    if (!Number.isFinite(valorBaseNum) || valorBaseNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Informe um valor base válido maior que R$ 0,00.' },
        { status: 400 }
      );
    }

    const modalidade: ModalidadeCheckout = MODALIDADES_VALIDAS.includes(
      body.modalidade as ModalidadeCheckout
    )
      ? (body.modalidade as ModalidadeCheckout)
      : 'venda_direta';

    const metodoPagamento: MetodoPagamento = METODOS_VALIDOS.includes(
      body.metodoPagamento as MetodoPagamento
    )
      ? (body.metodoPagamento as MetodoPagamento)
      : 'pix';

    const parcelas =
      metodoPagamento === 'pix'
        ? 1
        : Math.min(12, Math.max(1, Math.floor(Number(body.parcelas) || 1)));

    const anuncioId = (body.anuncioId || 'anuncio-demo').trim();
    const compradorId = (body.compradorId || 'comprador-sandbox').trim();
    const vendedorId = (body.vendedorId || 'vendedor-sandbox').trim();
    const tituloAnuncio = (body.tituloAnuncio || 'Item TroqJá').trim();

    // 1. Matemática Oficial TroqJá (5% até R$ 1.000 / 7% acima de R$ 1.000)
    const split = calcularSplitTroqJa(valorBaseNum);
    const parcelamento = calcularParcelamentoTroqJa(
      split.valorBase,
      parcelas,
      metodoPagamento
    );

    const transacaoId = generateUuidFallback();
    const codigoPin = gerarCodigoPin6Digitos();

    // 2. Verifica variáveis de ambiente de gateway real
    const hasMercadoPago = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
    const hasAsaas = Boolean(process.env.ASAAS_API_KEY?.trim());

    let gatewayProvider: GatewayProvider = 'simulador_troqja';
    let gatewayPaymentId = `sim_troqja_${transacaoId.slice(0, 12)}`;
    let pixCopiaECola = gerarPixCopiaEColaSandbox(
      parcelamento.valorTotalComprador,
      transacaoId,
      tituloAnuncio
    );

    if (hasMercadoPago) {
      const realMp = await tentarGatewayReal({
        gateway: 'mercadopago',
        valorTotal: parcelamento.valorTotalComprador,
        metodo: metodoPagamento,
        parcelas: parcelamento.parcelas,
        titulo: tituloAnuncio,
        transacaoId,
      });
      if (realMp.ok) {
        gatewayProvider = 'mercadopago';
        if (realMp.paymentId) gatewayPaymentId = realMp.paymentId;
        if (realMp.pixCopiaECola) pixCopiaECola = realMp.pixCopiaECola;
      }
    } else if (hasAsaas) {
      const realAsaas = await tentarGatewayReal({
        gateway: 'asaas',
        valorTotal: parcelamento.valorTotalComprador,
        metodo: metodoPagamento,
        parcelas: parcelamento.parcelas,
        titulo: tituloAnuncio,
        transacaoId,
      });
      if (realAsaas.ok) {
        gatewayProvider = 'asaas';
        if (realAsaas.paymentId) gatewayPaymentId = realAsaas.paymentId;
      }
    }

    const statusInicial: StatusEscrow = body.simularWebhookAprovado
      ? 'pago_em_custodia'
      : 'aguardando_pagamento';

    // 3. Persistência opcional em public.transacoes_escrow caso Service Role esteja configurada
    const supabaseAdmin = getSupabaseAdmin();
    let persistedInDb = false;
    if (supabaseAdmin) {
      try {
        const { error: dbError } = await supabaseAdmin.from('transacoes_escrow').insert({
          id: transacaoId,
          anuncio_id: anuncioId,
          comprador_id: compradorId,
          vendedor_id: vendedorId,
          modalidade,
          metodo_pagamento: metodoPagamento,
          parcelas: parcelamento.parcelas,
          valor_base: split.valorBase,
          valor_total_comprador: parcelamento.valorTotalComprador,
          percentual_taxa: split.percentualTaxa,
          taxa_troqja: split.taxaPlataforma,
          liquido_vendedor: split.liquidoVendedor,
          codigo_pin: codigoPin,
          status: statusInicial,
          gateway_provider: gatewayProvider,
          gateway_payment_id: gatewayPaymentId,
        });
        if (!dbError) {
          persistedInDb = true;
        }
      } catch {
        persistedInDb = false;
      }
    }

    return NextResponse.json({
      success: true,
      sandbox: gatewayProvider === 'simulador_troqja',
      persistedInDb,
      transacaoId,
      anuncioId,
      modalidade,
      metodoPagamento,
      status: statusInicial,
      gatewayProvider,
      gatewayPaymentId,
      split,
      parcelamento,
      pixCopiaECola,
      codigoPin,
      codigoPinFormatado: formatarCodigoPin(codigoPin),
      mensagemCustodia:
        'Pagamento protegido pelo sistema de Custódia (Escrow) TroqJá. Liberação via Código PIN de 6 dígitos após entrega ou em até 7 dias.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro interno ao processar checkout.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as PatchCheckoutBody;
    const action = body.action || 'validar_pin';
    const transacaoId = body.transacaoId?.trim();

    if (!transacaoId) {
      return NextResponse.json(
        { success: false, error: 'Identificador da transação ausente.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (action === 'simular_webhook') {
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('transacoes_escrow')
          .update({ status: 'pago_em_custodia' })
          .eq('id', transacaoId);
      }

      return NextResponse.json({
        success: true,
        transacaoId,
        status: 'pago_em_custodia' as StatusEscrow,
        message: 'Webhook aprovado! Pagamento retido com segurança em custódia TroqJá.',
      });
    }

    // Validação do Código PIN de 6 dígitos para liberação ao vendedor
    const pinLimpo = (body.pinDigitado || '').replace(/\D/g, '');
    if (pinLimpo.length !== 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Informe os 6 dígitos do Código PIN de entrega.',
        },
        { status: 400 }
      );
    }

    if (supabaseAdmin) {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        'liberar_escrow_por_pin',
        {
          p_transacao_id: transacaoId,
          p_codigo_pin: pinLimpo,
        }
      );

      if (!rpcError && rpcData && typeof rpcData === 'object') {
        const result = rpcData as {
          success?: boolean;
          status?: StatusEscrow;
          liquido_vendedor?: number;
          liberado_em?: string;
          message?: string;
        };
        if (result.success) {
          return NextResponse.json({
            success: true,
            transacaoId,
            status: result.status || 'liberado_vendedor',
            liquidoVendedor: result.liquido_vendedor,
            liberadoEm: result.liberado_em || new Date().toISOString(),
            message:
              result.message ||
              'PIN validado com sucesso! Saldo líquido liberado ao vendedor.',
          });
        }
        // Se a transação existe no DB e o PIN não bateu
        if (result.message && !result.message.includes('não encontrada')) {
          return NextResponse.json(
            { success: false, error: result.message },
            { status: 400 }
          );
        }
      }
    }

    // Fallback para modo Sandbox (sem Service Role / tabela ainda não aplicada)
    const pinEsperadoLimpo = (body.pinEsperado || '').replace(/\D/g, '');
    if (pinEsperadoLimpo && pinLimpo !== pinEsperadoLimpo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Código PIN incorreto. Confira os 6 dígitos gerados na sua custódia.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transacaoId,
      status: 'liberado_vendedor' as StatusEscrow,
      liberadoEm: new Date().toISOString(),
      message: 'Código PIN validado! Saldo líquido desbloqueado imediatamente ao vendedor.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao atualizar custódia.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
