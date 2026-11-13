'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  FileVideo,
  Gavel,
  KeyRound,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Star,
  Unlock,
  X,
  ArrowLeftRight,
  AlertCircle,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { formatCurrencyBRL } from '@olx-clone/shared';
import {
  calcularParcelamentoTroqJa,
  calcularSplitTroqJa,
  formatarCodigoPin,
  formatarDataBR,
  formatarDataHoraBR,
  gerarPixCopiaEColaSandbox,
  gerarTabelaParcelas,
  adicionarOuAtualizarPedidoVendedor,
  type GatewayProvider,
  type MetodoPagamento,
  type ModalidadeCheckout,
  type ParcelamentoOption,
  type SplitTroqJaResult,
} from '@/lib/checkout';

export interface CheckoutAnuncioInfo {
  id: string;
  titulo: string;
  preco: number;
  user_id: string;
  modalidade?: string;
  lance_atual?: number | null;
  lance_inicial?: number | null;
  aceita_troca?: boolean;
}

export interface CheckoutLiberadoPayload {
  transacaoId: string;
  codigoPin: string;
  valorBase: number;
  valorTotalComprador: number;
  taxaPlataforma: number;
  percentualTaxa: 5 | 7;
  liquidoVendedor: number;
  modalidade: ModalidadeCheckout;
  metodoPagamento: MetodoPagamento;
  parcelas: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  anuncio: CheckoutAnuncioInfo;
  modalidadeInicial?: ModalidadeCheckout;
  valorInicial?: number;
  compradorId?: string;
  vendedorNome?: string;
  onEscrowLiberado?: (payload: CheckoutLiberadoPayload) => void;
}

type EtapaModal = 'checkout' | 'custodia' | 'liberado';
type AbaCustodia = 'resumo_pin' | 'validar_pin';

interface CheckoutApiResponse {
  success: boolean;
  error?: string;
  sandbox?: boolean;
  transacaoId?: string;
  gatewayProvider?: GatewayProvider;
  gatewayPaymentId?: string;
  split?: SplitTroqJaResult;
  parcelamento?: ParcelamentoOption;
  pixCopiaECola?: string;
  codigoPin?: string;
  codigoPinFormatado?: string;
}

/**
 * Gera uma matriz visual determinística de QR Code (21x21) a partir do payload Pix
 * sem depender de APIs externas.
 */
function VisualPixQrCode({ payload }: { payload: string }) {
  const size = 21;

  const matrix = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false)
    );

    const drawFinder = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          const row = grid[startRow + r];
          if (row) {
            row[startCol + c] = isBorder || isCenter;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Preenche módulos internos de forma determinística baseada no texto do Pix
    let seed = 2166136261;
    for (let i = 0; i < payload.length; i++) {
      seed ^= payload.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= size - 8;
        const inBottomLeft = r >= size - 8 && c < 8;
        if (inTopLeft || inTopRight || inBottomLeft) continue;

        seed ^= (r * 31 + c * 17) & 0xff;
        seed = Math.imul(seed, 16777619);
        const row = grid[r];
        if (row) {
          row[c] = ((seed >>> 0) % 10) < 5;
        }
      }
    }

    return grid;
  }, [payload]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-36 h-36 bg-white p-2 rounded-xl border border-gray-200 shadow-xs shrink-0"
      aria-label="QR Code Pix TroqJá"
    >
      {matrix.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx}
              y={rIdx}
              width={1}
              height={1}
              fill="#111827"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function CheckoutModal({
  isOpen,
  onClose,
  anuncio,
  modalidadeInicial = 'venda_direta',
  valorInicial,
  compradorId,
  vendedorNome = 'Vendedor TroqJá',
  onEscrowLiberado,
}: CheckoutModalProps) {
  const router = useRouter();

  const valorPadrao = useMemo(() => {
    if (typeof valorInicial === 'number' && valorInicial > 0) {
      return valorInicial;
    }
    if (modalidadeInicial === 'leilao') {
      return anuncio.lance_atual || anuncio.lance_inicial || anuncio.preco || 100;
    }
    if (modalidadeInicial === 'permuta_volta') {
      return 350;
    }
    return anuncio.preco || 100;
  }, [valorInicial, modalidadeInicial, anuncio]);

  const [etapa, setEtapa] = useState<EtapaModal>('checkout');
  const [abaCustodia, setAbaCustodia] = useState<AbaCustodia>('resumo_pin');
  const [modalidade, setModalidade] = useState<ModalidadeCheckout>(modalidadeInicial);
  const [valorVoltaTexto, setValorVoltaTexto] = useState<string>(String(valorPadrao));
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [parcelas, setParcelas] = useState<number>(1);

  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const [validandoPin, setValidandoPin] = useState(false);
  const [erroCheckout, setErroCheckout] = useState<string | null>(null);
  const [erroPin, setErroPin] = useState<string | null>(null);
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [copiadoPin, setCopiadoPin] = useState(false);
  const [avaliacaoEstrelas, setAvaliacaoEstrelas] = useState<number>(5);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);

  // Dados da transação criada em custódia
  const [transacaoId, setTransacaoId] = useState<string>('');
  const [gatewayProvider, setGatewayProvider] = useState<GatewayProvider>('simulador_troqja');
  const [pixCopiaEColaApi, setPixCopiaEColaApi] = useState<string>('');
  const [codigoPin, setCodigoPin] = useState<string>('');
  const [pinDigitado, setPinDigitado] = useState<string>('');
  const [splitConfirmado, setSplitConfirmado] = useState<SplitTroqJaResult | null>(null);
  const [parcelamentoConfirmado, setParcelamentoConfirmado] =
    useState<ParcelamentoOption | null>(null);
  const [dadosComprovanteD7, setDadosComprovanteD7] = useState<{
    valorBruto: number;
    percentualTaxa: 5 | 7;
    valorTaxa: number;
    valorLiquido: number;
    releaseDate: string;
    pinVerifiedAt: string;
  } | null>(null);

  // Sincroniza quando modal abre com novos props
  useEffect(() => {
    if (!isOpen) return;
    setEtapa('checkout');
    setAbaCustodia('resumo_pin');
    setModalidade(modalidadeInicial);
    setValorVoltaTexto(String(valorPadrao));
    setMetodoPagamento('pix');
    setParcelas(1);
    setErroCheckout(null);
    setErroPin(null);
    setCopiadoPix(false);
    setCopiadoPin(false);
    setAvaliacaoEstrelas(5);
    setAvaliacaoEnviada(false);
    setTransacaoId('');
    setPixCopiaEColaApi('');
    setCodigoPin('');
    setPinDigitado('');
    setSplitConfirmado(null);
    setParcelamentoConfirmado(null);
    setDadosComprovanteD7(null);
  }, [isOpen, modalidadeInicial, valorPadrao]);

  const valorBaseAtual = useMemo(() => {
    if (modalidade === 'permuta_volta') {
      const parsed = parseFloat(valorVoltaTexto.replace(',', '.'));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return valorPadrao;
  }, [modalidade, valorVoltaTexto, valorPadrao]);

  const splitAtual = useMemo(
    () => calcularSplitTroqJa(valorBaseAtual),
    [valorBaseAtual]
  );

  const parcelamentoAtual = useMemo(
    () => calcularParcelamentoTroqJa(valorBaseAtual, parcelas, metodoPagamento),
    [valorBaseAtual, parcelas, metodoPagamento]
  );

  const tabelaParcelas = useMemo(
    () => gerarTabelaParcelas(valorBaseAtual),
    [valorBaseAtual]
  );

  const pixPreview = useMemo(() => {
    if (pixCopiaEColaApi) return pixCopiaEColaApi;
    return gerarPixCopiaEColaSandbox(
      parcelamentoAtual.valorTotalComprador,
      anuncio.id,
      anuncio.titulo
    );
  }, [pixCopiaEColaApi, parcelamentoAtual.valorTotalComprador, anuncio.id, anuncio.titulo]);

  if (!isOpen) return null;

  const handleCopiarTexto = async (texto: string, tipo: 'pix' | 'pin') => {
    try {
      await navigator.clipboard.writeText(texto);
      if (tipo === 'pix') {
        setCopiadoPix(true);
        setTimeout(() => setCopiadoPix(false), 2000);
      } else {
        setCopiadoPin(true);
        setTimeout(() => setCopiadoPin(false), 2000);
      }
    } catch {
      // ignora erro de clipboard em ambientes restritos
    }
  };

  const handleConfirmarPagamento = async () => {
    setErroCheckout(null);

    if (valorBaseAtual <= 0) {
      setErroCheckout('Informe um valor válido maior que R$ 0,00 para prosseguir com a custódia.');
      return;
    }

    setProcessandoPagamento(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anuncioId: anuncio.id,
          compradorId: compradorId || 'comprador-sandbox',
          vendedorId: anuncio.user_id,
          tituloAnuncio: anuncio.titulo,
          modalidade,
          metodoPagamento,
          parcelas: metodoPagamento === 'pix' ? 1 : parcelas,
          valorBase: valorBaseAtual,
          simularWebhookAprovado: true,
        }),
      });

      const data = (await response.json()) as CheckoutApiResponse;

      if (!response.ok || !data.success) {
        setErroCheckout(data.error || 'Não foi possível processar o pagamento.');
        return;
      }

      const txId = data.transacaoId || `tx-${Date.now()}`;
      const pinGerado = data.codigoPin || '482915';
      const splitFinal = data.split || splitAtual;
      const parcFinal = data.parcelamento || parcelamentoAtual;

      setTransacaoId(txId);
      setGatewayProvider(data.gatewayProvider || 'simulador_troqja');
      if (data.pixCopiaECola) setPixCopiaEColaApi(data.pixCopiaECola);
      setCodigoPin(pinGerado);
      setSplitConfirmado(splitFinal);
      setParcelamentoConfirmado(parcFinal);

      // Registra no histórico do vendedor como aguardando PIN presencial
      adicionarOuAtualizarPedidoVendedor({
        id: txId,
        anuncioId: anuncio.id,
        tituloProduto: anuncio.titulo,
        compradorNome: 'Comprador TroqJá',
        compradorId: compradorId || 'comprador-sandbox',
        vendedorId: anuncio.user_id,
        dataHora: new Date().toISOString(),
        valorBruto: splitFinal.valorBase,
        taxaPercentual: splitFinal.percentualTaxa,
        valorTaxa: splitFinal.taxaPlataforma,
        valorLiquido: splitFinal.liquidoVendedor,
        status: 'aguardando_pin',
        codigoPin: pinGerado,
        metodoPagamento,
        parcelas: parcFinal.parcelas,
      });

      setEtapa('custodia');
      setAbaCustodia('resumo_pin');
    } catch (err: unknown) {
      setErroCheckout(
        err instanceof Error ? err.message : 'Falha de comunicação com o checkout.'
      );
    } finally {
      setProcessandoPagamento(false);
    }
  };

  const handleValidarPinELiberar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroPin(null);

    const pinLimpo = pinDigitado.replace(/\D/g, '');
    if (pinLimpo.length !== 6) {
      setErroPin('Digite os 6 dígitos do Código PIN.');
      return;
    }

    setValidandoPin(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validar_pin',
          transacaoId,
          pinDigitado: pinLimpo,
          pinEsperado: codigoPin,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        releaseDate?: string;
        pinVerifiedAt?: string;
      };

      if (!response.ok || !data.success) {
        setErroPin(data.error || 'Código PIN inválido. Verifique os 6 dígitos.');
        return;
      }

      const splitFinal = splitConfirmado || splitAtual;
      const parcFinal = parcelamentoConfirmado || parcelamentoAtual;
      const agoraIso = data.pinVerifiedAt || new Date().toISOString();
      const releaseDateIso =
        data.releaseDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Regra D+7: Registra e move para Saldo Bloqueado (Garantia 7D)
      adicionarOuAtualizarPedidoVendedor({
        id: transacaoId || `tx-${Date.now()}`,
        anuncioId: anuncio.id,
        tituloProduto: anuncio.titulo,
        compradorNome: 'Comprador Verificado',
        compradorId: compradorId || 'comprador-sandbox',
        vendedorId: anuncio.user_id,
        valorBruto: splitFinal.valorBase,
        taxaPercentual: splitFinal.percentualTaxa,
        valorTaxa: splitFinal.taxaPlataforma,
        valorLiquido: splitFinal.liquidoVendedor,
        status: 'pin_verified_blocked_7d',
        pinVerifiedAt: agoraIso,
        releaseDate: releaseDateIso,
        codigoPin,
        metodoPagamento,
        parcelas: parcFinal.parcelas,
      });

      setDadosComprovanteD7({
        valorBruto: splitFinal.valorBase,
        percentualTaxa: splitFinal.percentualTaxa,
        valorTaxa: splitFinal.taxaPlataforma,
        valorLiquido: splitFinal.liquidoVendedor,
        releaseDate: releaseDateIso,
        pinVerifiedAt: agoraIso,
      });

      setEtapa('liberado');
    } catch (err: unknown) {
      setErroPin(err instanceof Error ? err.message : 'Erro ao validar PIN.');
    } finally {
      setValidandoPin(false);
    }
  };

  const handleIrParaPainelReceita = () => {
    const splitFinal = splitConfirmado || splitAtual;
    const parcFinal = parcelamentoConfirmado || parcelamentoAtual;
    onClose();
    if (onEscrowLiberado) {
      onEscrowLiberado({
        transacaoId,
        codigoPin,
        valorBase: splitFinal.valorBase,
        valorTotalComprador: parcFinal.valorTotalComprador,
        taxaPlataforma: splitFinal.taxaPlataforma,
        percentualTaxa: splitFinal.percentualTaxa,
        liquidoVendedor: splitFinal.liquidoVendedor,
        modalidade,
        metodoPagamento,
        parcelas: parcFinal.parcelas,
      });
    }
    router.push('/conta/painel-receita');
  };

  const parcExibido = parcelamentoConfirmado || parcelamentoAtual;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* TOPO DO MODAL */}
        <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 text-white px-5 py-4 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                Custódia Segura TroqJá
              </span>
              <span className="inline-flex items-center gap-1 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {modalidade === 'leilao' && (
                  <>
                    <Gavel className="w-3 h-3" /> Liquidação de Leilão
                  </>
                )}
                {modalidade === 'permuta_volta' && (
                  <>
                    <ArrowLeftRight className="w-3 h-3" /> Volta em Dinheiro (Permuta)
                  </>
                )}
                {modalidade === 'venda_direta' && (
                  <>
                    <ShoppingBag className="w-3 h-3" /> Venda Direta
                  </>
                )}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
              Pagamento Protegido com Escrow & PIN
            </h2>
            <p className="text-xs text-gray-300 truncate">
              {anuncio.titulo} • Vendedor: <strong>{vendedorNome}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0"
            title="Fechar checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTEÚDO POR ETAPA */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* =============================================================== */}
          {/* ETAPA 1: CHECKOUT (MEIO DE PAGAMENTO, PARCELAS E SPLIT)         */}
          {/* =============================================================== */}
          {etapa === 'checkout' && (
            <>
              {/* Campo Editável quando for Volta de Permuta */}
              {modalidade === 'permuta_volta' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Valor acordado da Volta em Dinheiro (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-black text-emerald-700">
                      R$
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={valorVoltaTexto}
                      onChange={(e) => setValorVoltaTexto(e.target.value)}
                      placeholder="350.00"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-lg font-black text-gray-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Digite exatamente a diferença em dinheiro combinada no chat para proteger o pagamento em custódia.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      {modalidade === 'leilao'
                        ? 'Valor do Lance Vencedor'
                        : 'Valor Anunciado à Vista'}
                    </span>
                    <span className="text-2xl font-black text-gray-900">
                      {formatCurrencyBRL(valorBaseAtual)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Garantia TroqJá
                  </span>
                </div>
              )}

              {/* Abas de Meio de Pagamento */}
              <div className="space-y-3">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                  Escolha a forma de pagamento
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMetodoPagamento('pix');
                      setParcelas(1);
                    }}
                    className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-2.5 ${
                      metodoPagamento === 'pix'
                        ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <QrCode
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        metodoPagamento === 'pix' ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <span className="text-xs font-black text-gray-900 block">
                        💠 Pix Instantâneo
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        Aprovação em 3s • Sem taxas extras
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagamento('cartao_credito')}
                    className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-2.5 ${
                      metodoPagamento === 'cartao_credito'
                        ? 'border-[#FF6B00] bg-orange-50/80 ring-2 ring-orange-200'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <CreditCard
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        metodoPagamento === 'cartao_credito'
                          ? 'text-[#FF6B00]'
                          : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <span className="text-xs font-black text-gray-900 block">
                        💳 Cartão de Crédito
                      </span>
                      <span className="text-[11px] text-orange-700 font-semibold">
                        1x sem acréscimo ou 2x a 12x
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conteúdo da Aba Selecionada */}
              {metodoPagamento === 'pix' ? (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center gap-4">
                  <VisualPixQrCode payload={pixPreview} />
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                        Pix Copia e Cola (Sandbox TroqJá)
                      </span>
                      <p className="text-lg font-black text-gray-900">
                        Total a pagar: {formatCurrencyBRL(parcExibido.valorTotalComprador)}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Zero acréscimo no Pix. O valor fica retido no TroqJá até você conferir o produto.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixPreview}
                        className="flex-1 min-w-0 text-[11px] font-mono bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-600 truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopiarTexto(pixPreview, 'pix')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiadoPix ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-orange-50/40 border border-orange-200 space-y-3">
                  <div>
                    <label className="block text-xs font-black text-gray-800 uppercase tracking-wider mb-1.5">
                      Selecione o parcelamento no cartão
                    </label>
                    <select
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-orange-300 bg-white text-sm font-bold text-gray-900 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-200 outline-none"
                    >
                      {tabelaParcelas.map((opt) => (
                        <option key={opt.parcelas} value={opt.parcelas}>
                          {opt.parcelas}x de {formatCurrencyBRL(opt.valorParcela)}{' '}
                          {opt.semJuros
                            ? '(sem acréscimo — preço anunciado)'
                            : `(Total ${formatCurrencyBRL(opt.valorTotalComprador)} • juros 2,49% a.m.)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-orange-100">
                    <span className="text-gray-600">
                      {parcExibido.semJuros
                        ? 'Cartão 1x à vista sem acréscimo:'
                        : `Parcelado em ${parcExibido.parcelas}x (${formatCurrencyBRL(parcExibido.valorParcela)}/mês):`}
                    </span>
                    <strong className="text-sm font-black text-gray-900">
                      {formatCurrencyBRL(parcExibido.valorTotalComprador)}
                    </strong>
                  </div>

                  {!parcExibido.semJuros && (
                    <p className="text-[11px] text-orange-900 leading-snug">
                      💡 No Pix ou em 1x no cartão você paga o valor anunciado sem acréscimo. De 2x a 12x, os encargos do parcelamento ({formatCurrencyBRL(parcExibido.jurosTotal)}) são da adquirente.
                    </p>
                  )}
                </div>
              )}

              {erroCheckout && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{erroCheckout}</span>
                </div>
              )}

              {/* CTA Principal */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmarPagamento}
                  disabled={processandoPagamento || valorBaseAtual <= 0}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#00C853] to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processandoPagamento ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando Custódia TroqJá...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Confirmar Pagamento (Simular Webhook Aprovado)</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-gray-500">
                  Operando em Modo Sandbox Oficial caso as chaves Mercado Pago/Asaas não estejam configuradas.
                </p>
              </div>
            </>
          )}

          {/* =============================================================== */}
          {/* ETAPA 2: CUSTÓDIA ATIVA + CÓDIGO PIN 6 DÍGITOS + UNBOXING      */}
          {/* =============================================================== */}
          {etapa === 'custodia' && (
            <div className="space-y-4">
              {/* Sub-abas dentro da custódia */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAbaCustodia('resumo_pin')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    abaCustodia === 'resumo_pin'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Meu Código PIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbaCustodia('validar_pin')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    abaCustodia === 'validar_pin'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Validar PIN de Entrega</span>
                </button>
              </div>

              {abaCustodia === 'resumo_pin' ? (
                <div className="space-y-4">
                  {/* Banner de Sucesso */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-emerald-950">
                        ✅ Pagamento Retido em Custódia Segura!
                      </h3>
                      <p className="text-xs text-emerald-800">
                        Total pago: <strong>{formatCurrencyBRL(parcExibido.valorTotalComprador)}</strong>{' '}
                        ({metodoPagamento === 'pix' ? 'Pix' : `Cartão ${parcExibido.parcelas}x`}) •{' '}
                        Valor 100% protegido em custódia até a confirmação da entrega.
                      </p>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md">
                        Gateway: {gatewayProvider === 'simulador_troqja' ? 'Simulador Oficial TroqJá (Sandbox)' : gatewayProvider}
                      </span>
                    </div>
                  </div>

                  {/* Card em Destaque do Código PIN de 6 Dígitos */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white text-center space-y-3 border border-gray-800 shadow-lg">
                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-400 block">
                      Seu Código PIN Exclusivo de Recebimento
                    </span>
                    <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 px-6 py-3 rounded-2xl">
                      <span className="text-3xl sm:text-4xl font-black tracking-[0.2em] font-mono text-white">
                        PIN: {formatarCodigoPin(codigoPin)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopiarTexto(codigoPin, 'pin')}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                        title="Copiar PIN"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copiadoPin && (
                      <p className="text-[11px] text-emerald-400 font-bold">
                        Código PIN copiado para a área de transferência!
                      </p>
                    )}
                  </div>

                  {/* Alerta de Unboxing Seguro */}
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-xs text-amber-950 leading-relaxed">
                    <FileVideo className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      🔒 Guarde seu Código PIN! Só informe este código ao vendedor/entregador após receber e conferir o produto. Lembre-se de filmar a abertura do pacote (Unboxing Seguro). O pagamento fica 100% retido no TroqJá e só é liberado automaticamente após 7 dias da entrega registrada no ato da entrega e confirmada com Código PIN!
                    </p>
                  </div>

                  {/* Botão Rápido para Validar PIN */}
                  <button
                    type="button"
                    onClick={() => setAbaCustodia('validar_pin')}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#FF6B00] hover:bg-[#E65A00] text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>🔒 Validar PIN de Entrega</span>
                  </button>
                </div>
              ) : (
                /* Formulário de Validação do Código PIN Presencial */
                <form onSubmit={handleValidarPinELiberar} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
                    <h3 className="text-sm font-black text-purple-950 flex items-center gap-2">
                      <Unlock className="w-4 h-4 text-olx-purple" />
                      Validação de Entrega Presencial por PIN
                    </h3>
                    <p className="text-xs text-purple-900 leading-relaxed">
                      Digite os 6 dígitos do Código PIN gerado para registrar a entrega presencial do produto, notificar o vendedor em tempo real e iniciar o prazo de 7 dias para liberação automática do pagamento.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Código PIN de 6 Dígitos
                      </label>
                      <button
                        type="button"
                        onClick={() => setPinDigitado(codigoPin)}
                        className="text-[11px] font-bold text-olx-purple hover:underline"
                      >
                        Preencher PIN ({formatarCodigoPin(codigoPin)})
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={7}
                      value={pinDigitado}
                      onChange={(e) => setPinDigitado(e.target.value)}
                      placeholder="Ex: 482915"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-300 text-center text-2xl font-black font-mono tracking-[0.25em] focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none"
                    />
                  </div>

                  {erroPin && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{erroPin}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={validandoPin}
                    className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {validandoPin ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validando PIN e Registrando Entrega...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar PIN</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* ETAPA 3: CONFIRMAÇÃO DE ENTREGA SEGURA (D+7 & COMPROVANTE)      */}
          {/* =============================================================== */}
          {etapa === 'liberado' && dadosComprovanteD7 && (
            <div className="py-2 space-y-5 animate-in fade-in duration-200">
              {/* Cabeçalho Verde com Selo */}
              <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full inline-block mb-0.5">
                    Comprovante Digital Verificado
                  </span>
                  <h3 className="text-sm sm:text-base font-black leading-tight">
                    ✅ PIN CONFIRMADO COM SUCESSO! ENTREGA REGISTRADA
                  </h3>
                </div>
              </div>

              {/* Box de Segurança para o Vendedor */}
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-1.5 text-xs text-emerald-950 leading-relaxed">
                <div className="flex items-center gap-1.5 font-black text-emerald-900 text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Atenção Vendedor:</span>
                </div>
                <p>
                  O código PIN foi validado! Você já pode entregar o produto ao comprador com total segurança. O seu valor líquido já está garantido no seu Painel de Receita como Saldo Bloqueado e será liberado automaticamente para saque em 7 dias ({formatarDataBR(dadosComprovanteD7.releaseDate)}).
                </p>
              </div>

              {/* Resumo Financeiro Transparente do Recibo */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block pb-1 border-b border-gray-200">
                  Resumo Financeiro do Recibo
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Valor Pago pelo Comprador (Bruto):</span>
                    <strong className="font-mono text-sm text-gray-900">
                      {formatCurrencyBRL(dadosComprovanteD7.valorBruto)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-orange-700">
                    <span>Taxa de Proteção TroqJá ({dadosComprovanteD7.percentualTaxa}%):</span>
                    <strong className="font-mono text-sm">
                      - {formatCurrencyBRL(dadosComprovanteD7.valorTaxa)}
                    </strong>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-emerald-900">
                    <span className="font-black text-sm">Valor Líquido Garantido ao Vendedor:</span>
                    <strong className="font-mono text-base sm:text-lg font-black text-emerald-700">
                      {formatCurrencyBRL(dadosComprovanteD7.valorLiquido)}
                    </strong>
                  </div>
                  <div className="pt-1.5 flex items-center justify-between text-[11px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                      Registro do PIN Presencial:
                    </span>
                    <strong className="font-mono text-gray-900">
                      {formatarDataHoraBR(dadosComprovanteD7.pinVerifiedAt)}
                    </strong>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      Liberação Programada (D+7):
                    </span>
                    <strong className="font-mono text-emerald-700 font-bold">
                      {formatarDataBR(dadosComprovanteD7.releaseDate)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Avaliação Rápida (1 a 5 Estrelas) */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-2">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider block">
                  Como foi a experiência desta negociação?
                </span>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setAvaliacaoEstrelas(star);
                        setAvaliacaoEnviada(true);
                      }}
                      className="p-1 hover:scale-115 transition"
                      title={`${star} estrela${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= avaliacaoEstrelas
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {avaliacaoEnviada && (
                  <p className="text-[11px] text-amber-800 font-bold flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Avaliação registrada com sucesso!
                  </p>
                )}
              </div>

              {/* Ação Principal: Abrir Painel de Receita do Vendedor */}
              <button
                type="button"
                onClick={handleIrParaPainelReceita}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-gray-900 via-slate-800 to-gray-950 hover:from-black hover:to-slate-900 text-white font-black text-sm shadow-xl transition flex items-center justify-center gap-2 group cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                <span>📊 Abrir Painel de Receita do Vendedor</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
