'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  MessageSquare,
  QrCode,
  CreditCard,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { formatCurrencyBRL } from '@olx-clone/shared';
import {
  carregarComprasComprador,
  solicitarReembolsoCompra,
  calcularDiasRestantes7D,
  formatarDataBR,
  formatarDataHoraBR,
  formatarCodigoPin,
  adicionarOuAtualizarCompraComprador,
  type PedidoComprador,
} from '@/lib/checkout';
type TabFiltro = 'todos' | 'aguardando' | 'entregue_7d' | 'concluido';

function MinhasComprasContent() {
  const searchParams = useSearchParams();
  const pedidoIdParam = searchParams.get('pedidoId');

  const [compras, setCompras] = useState<PedidoComprador[]>([]);
  const [tabAtiva, setTabAtiva] = useState<TabFiltro>('todos');
  const [busca, setBusca] = useState<string>('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoComprador | null>(null);

  // Estados de modais secundários
  const [modalReembolsoAberto, setModalReembolsoAberto] = useState<boolean>(false);
  const [motivoReembolso, setMotivoReembolso] = useState<string>('Produto diferente do anunciado');
  const [descricaoReembolso, setDescricaoReembolso] = useState<string>('');
  const [reembolsoConfirmadoMsg, setReembolsoConfirmadoMsg] = useState<string | null>(null);

  const [modalValidarPinAberto, setModalValidarPinAberto] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [erroPin, setErroPin] = useState<string | null>(null);

  const [copiadoId, setCopiadoId] = useState<boolean>(false);
  const [copiadoPin, setCopiadoPin] = useState<boolean>(false);

  // Carrega lista de compras
  const recarregarCompras = () => {
    const dados = carregarComprasComprador();
    setCompras(dados);
    if (pedidoIdParam) {
      const match = dados.find((c) => c.id === pedidoIdParam);
      if (match) {
        setPedidoSelecionado(match);
      }
    }
  };

  useEffect(() => {
    recarregarCompras();
    const handleUpdated = () => recarregarCompras();
    window.addEventListener('troqja_compras_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('troqja_compras_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [pedidoIdParam]);

  // Filtra compras por tab e busca
  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      if (tabAtiva === 'aguardando' && c.status !== 'aguardando_pin') return false;
      if (tabAtiva === 'entregue_7d' && c.status !== 'pin_verified_blocked_7d') return false;
      if (tabAtiva === 'concluido' && c.status !== 'liberado_vendedor') return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const coincide =
          c.tituloProduto.toLowerCase().includes(termo) ||
          c.vendedorNome.toLowerCase().includes(termo) ||
          c.id.toLowerCase().includes(termo);
        if (!coincide) return false;
      }
      return true;
    });
  }, [compras, tabAtiva, busca]);

  // Copiar ID do pedido
  const handleCopiarId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiadoId(true);
      setTimeout(() => setCopiadoId(false), 2000);
    } catch {
      // ignore
    }
  };

  // Copiar PIN
  const handleCopiarPin = async (pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopiadoPin(true);
      setTimeout(() => setCopiadoPin(false), 2000);
    } catch {
      // ignore
    }
  };

  // Solicitar Reembolso
  const handleConfirmarReembolso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoSelecionado) return;

    const atualizados = solicitarReembolsoCompra(pedidoSelecionado.id);
    setCompras(atualizados);
    setPedidoSelecionado({ ...pedidoSelecionado, reembolsoSolicitado: true });
    setReembolsoConfirmadoMsg(
      'Solicitação de Reembolso registrada com sucesso! Nossa equipe de Mediação Segura TroqJá entrará em contato em até 24h e o saldo permanece retido em garantia.'
    );
    setTimeout(() => {
      setReembolsoConfirmadoMsg(null);
      setModalReembolsoAberto(false);
    }, 3500);
  };

  // Validar PIN presencial direto pelo painel de compras
  const handleValidarPinPresencial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoSelecionado) return;
    setErroPin(null);

    const limpo = pinInput.replace(/\D/g, '');
    if (limpo.length !== 6) {
      setErroPin('Digite os 6 dígitos do Código PIN.');
      return;
    }

    if (limpo !== pedidoSelecionado.codigoPin) {
      setErroPin('Código PIN incorreto para este pedido.');
      return;
    }

    const agora = new Date();
    const releaseDate = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const atualizados = adicionarOuAtualizarCompraComprador({
      id: pedidoSelecionado.id,
      status: 'pin_verified_blocked_7d',
      pinVerifiedAt: agora.toISOString(),
      releaseDate,
    });

    setCompras(atualizados);
    const atual = atualizados.find((c) => c.id === pedidoSelecionado.id) || null;
    setPedidoSelecionado(atual);
    setModalValidarPinAberto(false);
    setPinInput('');
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-gray-900 pb-16">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/conta"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
              title="Voltar para Minha Conta"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <ShoppingBag className="w-3 h-3 text-[#FF6B00]" /> Comprador
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Custódia Segura
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                Minhas Compras
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/conta/painel-receita"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition"
              title="Alternar para Painel do Vendedor"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Visão Vendedor</span>
            </Link>
          </div>
        </div>

        {/* ABAS DE STATUS ESTILO SHOPEE / TIKTOK SHOP */}
        <div className="max-w-4xl mx-auto px-4 flex items-center border-t border-gray-100 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'aguardando', label: 'Aguardando Entrega (PIN)' },
              { id: 'entregue_7d', label: 'Pedido Entregue (Garantia 7D)' },
              { id: 'concluido', label: 'Concluídos' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setTabAtiva(tab.id);
                setPedidoSelecionado(null);
              }}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
                tabAtiva === tab.id
                  ? 'border-[#FF6B00] text-[#FF6B00]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* =============================================================== */}
        {/* CASO: TELA DE DETALHES DO PEDIDO SELECIONADO                   */}
        {/* =============================================================== */}
        {pedidoSelecionado ? (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. CABEÇALHO DE STATUS DO PEDIDO */}
            <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPedidoSelecionado(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para lista de compras</span>
                </button>
                <span className="text-[11px] font-mono text-gray-400">
                  ID: {pedidoSelecionado.id}
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-950 flex items-center gap-2">
                  {pedidoSelecionado.status === 'aguardando_pin' ? (
                    <>
                      <Clock className="w-6 h-6 text-[#FF6B00]" />
                      Aguardando entrega presencial
                    </>
                  ) : pedidoSelecionado.status === 'pin_verified_blocked_7d' ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      Pedido entregue
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      Compra Concluída com Sucesso
                    </>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Realizado em {formatarDataHoraBR(pedidoSelecionado.dataHoraCriacao)}
                </p>
              </div>

              {/* Banner de Proteção 7 Dias */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">
                    🛡️ Garantia TroqJá ativa{' '}
                    {pedidoSelecionado.releaseDate
                      ? `até ${formatarDataBR(pedidoSelecionado.releaseDate)} (Pagamento retido por 7 dias)`
                      : '(Pagamento 100% retido em custódia até conferência)'}
                  </p>
                  <p className="text-[11px] text-amber-900">
                    Seu dinheiro fica protegido conosco. Caso haja qualquer divergência no pacote ou no produto, você pode solicitar ajuda ou reembolso imediato.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. CABEÇALHO DO VENDEDOR */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-gray-200 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-olx-purple flex items-center justify-center font-bold text-sm">
                  {pedidoSelecionado.vendedorNome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-950">
                    {pedidoSelecionado.vendedorNome}
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Vendedor Verificado TroqJá
                  </span>
                </div>
              </div>

              <Link
                href={`/chat`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-300 hover:border-gray-400 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-olx-purple" />
                <span>Ver perfil / Chat &gt;</span>
              </Link>
            </div>

            {/* 3. BLOCO DO PRODUTO COMPRADO */}
            <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0 flex items-center justify-center">
                    {pedidoSelecionado.fotoUrl ? (
                      <Image
                        src={pedidoSelecionado.fotoUrl}
                        alt={pedidoSelecionado.tituloProduto}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-black text-gray-950 truncate">
                      {pedidoSelecionado.tituloProduto}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {pedidoSelecionado.categoria || 'Geral'} • {pedidoSelecionado.condicao || 'Usado'} • Qtd: <strong>1x</strong>
                    </p>
                    <span className="inline-inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100/80 px-2 py-0.5 rounded-md">
                      📦 Proteção de 7 dias após PIN
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-400 block">Preço Unitário</span>
                  <strong className="text-lg font-black text-gray-950 font-mono">
                    {formatCurrencyBRL(pedidoSelecionado.valorTotal)}
                  </strong>
                </div>
              </div>

              {/* Se PIN ainda não foi validado, exibe Código do Comprador */}
              {pedidoSelecionado.status === 'aguardando_pin' && (
                <div className="p-4 rounded-2xl bg-gray-950 text-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-400">
                      Seu Código PIN de Entrega (Token Presencial)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopiarPin(pedidoSelecionado.codigoPin)}
                      className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiadoPin ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-3xl font-black font-mono tracking-[0.2em] text-white">
                      PIN: {formatarCodigoPin(pedidoSelecionado.codigoPin)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalValidarPinAberto(true)}
                      className="px-4 py-2 rounded-xl bg-[#00C853] hover:bg-emerald-600 text-white text-xs font-black shadow transition active:scale-95"
                    >
                      Validar PIN de Entrega
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Apenas informe este PIN ao entregador/vendedor no ato da entrega após conferir o pacote.
                  </p>
                </div>
              )}

              {/* Botões em Formato de Pílula */}
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalReembolsoAberto(true)}
                  disabled={pedidoSelecionado.reembolsoSolicitado}
                  className="px-4 py-2 rounded-full border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs font-bold text-gray-800 transition disabled:opacity-50"
                >
                  {pedidoSelecionado.reembolsoSolicitado
                    ? 'Reembolso em Mediação'
                    : 'Solicitar reembolso / Ajuda'}
                </button>

                <Link
                  href={`/anuncio/${pedidoSelecionado.anuncioId}`}
                  className="px-4 py-2 rounded-full border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs font-bold text-gray-800 transition inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ver anúncio</span>
                </Link>
              </div>
            </div>

            {/* 4. DECOMPOSIÇÃO DO PEDIDO DO COMPRADOR (SEM TAXAS DO VENDEDOR!) */}
            <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 pb-2 border-b border-gray-100">
                Resumo dos Valores da Compra
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-700">
                  <span>Subtotal dos produtos:</span>
                  <strong className="font-mono text-gray-900 text-sm">
                    {formatCurrencyBRL(pedidoSelecionado.valorTotal)}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Taxa de Custódia / Serviço Comprador:</span>
                  <strong className="font-mono font-bold">R$ 0,00 (Grátis)</strong>
                </div>
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pedidoSelecionado.metodoPagamento === 'pix' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                        <QrCode className="w-3.5 h-3.5 text-emerald-600" /> PIX
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                        <CreditCard className="w-3.5 h-3.5 text-[#FF6B00]" /> Cartão {pedidoSelecionado.parcelas}x
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500">Custódia 100% protegida</span>
                  </div>
                  <strong className="text-xl font-black text-gray-950 font-mono">
                    Total: {formatCurrencyBRL(pedidoSelecionado.valorTotal)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 5. BLOCO DE RASTREABILIDADE E DATAS DO PEDIDO */}
            <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 pb-2 border-b border-gray-100">
                Rastreabilidade e Informações do Pedido
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">ID do pedido:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">
                      {pedidoSelecionado.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopiarId(pedidoSelecionado.id)}
                      className="text-[11px] font-bold text-olx-purple hover:underline"
                    >
                      {copiadoId ? 'Copiado!' : '[Copiar]'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Pago por:</span>
                  <span className="font-bold text-gray-900">
                    {pedidoSelecionado.metodoPagamento === 'pix'
                      ? 'Pix Instantâneo'
                      : `Cartão de Crédito (${pedidoSelecionado.parcelas}x)`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Pedido realizado em:</span>
                  <span className="font-mono text-gray-800">
                    {formatarDataHoraBR(pedidoSelecionado.dataHoraCriacao)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Data do pagamento:</span>
                  <span className="font-mono text-gray-800">
                    {formatarDataHoraBR(pedidoSelecionado.dataHoraPagamento)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Entrega confirmada com PIN em:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {pedidoSelecionado.pinVerifiedAt
                      ? formatarDataHoraBR(pedidoSelecionado.pinVerifiedAt)
                      : 'Pendente de encontro'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Liberação final ao vendedor (D+7):</span>
                  <span className="font-mono font-bold text-gray-900">
                    {pedidoSelecionado.releaseDate
                      ? formatarDataBR(pedidoSelecionado.releaseDate)
                      : 'Calculado após validação do PIN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =============================================================== */
          /* CASO: LISTA GERAL DE COMPRAS DO COMPRADOR                      */
          /* =============================================================== */
          <div className="space-y-4">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por produto, vendedor ou código do pedido..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-gray-200 text-xs sm:text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100 outline-none shadow-xs"
              />
            </div>

            {comprasFiltradas.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-xs space-y-3">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="text-base font-bold text-gray-800">
                  Nenhuma compra encontrada nesta aba
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Quando você comprar produtos protegidos com Escrow & PIN, eles aparecerão aqui com status e comprovantes.
                </p>
                <Link
                  href="/"
                  className="inline-block mt-2 px-5 py-2.5 rounded-full bg-[#FF6B00] hover:bg-[#E65A00] text-white text-xs font-bold transition shadow-sm"
                >
                  Explorar anúncios
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {comprasFiltradas.map((compra) => {
                  const diasRestantes =
                    compra.status === 'pin_verified_blocked_7d'
                      ? calcularDiasRestantes7D(compra.releaseDate)
                      : null;

                  return (
                    <div
                      key={compra.id}
                      onClick={() => setPedidoSelecionado(compra)}
                      className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs hover:border-orange-300 hover:shadow-md transition cursor-pointer space-y-4 group"
                    >
                      {/* Topo do Card: Vendedor e Status */}
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-black text-gray-900">
                            {compra.vendedorNome}
                          </span>
                        </div>

                        {/* Status visual */}
                        {compra.status === 'aguardando_pin' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                            <Clock className="w-3 h-3" /> Aguardando Entrega (PIN)
                          </span>
                        )}
                        {compra.status === 'pin_verified_blocked_7d' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                            <Lock className="w-3 h-3" /> Entregue • Garantia {diasRestantes}D
                          </span>
                        )}
                        {compra.status === 'liberado_vendedor' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </span>
                        )}
                      </div>

                      {/* Corpo do Card: Foto, Título e Valor */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0 flex items-center justify-center">
                            {compra.fotoUrl ? (
                              <Image
                                src={compra.fotoUrl}
                                alt={compra.tituloProduto}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <ShoppingBag className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-gray-950 truncate group-hover:text-[#FF6B00] transition">
                              {compra.tituloProduto}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {formatarDataBR(compra.dataHoraCriacao)} • {compra.metodoPagamento === 'pix' ? 'Pix' : 'Cartão'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-gray-400 block">Total pago</span>
                          <strong className="text-base font-black text-gray-950 font-mono">
                            {formatCurrencyBRL(compra.valorTotal)}
                          </strong>
                        </div>
                      </div>

                      {/* Rodapé do Card: Ação rápida */}
                      <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                        <span className="font-mono text-[11px]">
                          PIN: {formatarCodigoPin(compra.codigoPin)}
                        </span>
                        <span className="font-bold text-[#FF6B00] group-hover:underline">
                          Ver Detalhes do Pedido →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =============================================================== */}
      {/* MODAL DE SOLICITAÇÃO DE REEMBOLSO / AJUDA                       */}
      {/* =============================================================== */}
      {modalReembolsoAberto && pedidoSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-gray-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black">Solicitar Reembolso / Mediação</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalReembolsoAberto(false)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarReembolso} className="p-6 space-y-4">
              {reembolsoConfirmadoMsg ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-black text-gray-900">Solicitação Registrada!</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{reembolsoConfirmadoMsg}</p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                    O pagamento deste pedido de <strong>{formatCurrencyBRL(pedidoSelecionado.valorTotal)}</strong> está em garantia de 7 dias e será retido até a resolução da mediação.
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                      Motivo Principal
                    </label>
                    <select
                      value={motivoReembolso}
                      onChange={(e) => setMotivoReembolso(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-200"
                    >
                      <option value="Produto diferente do anunciado">Produto diferente do anunciado</option>
                      <option value="Produto com defeito não informado">Produto com defeito não informado</option>
                      <option value="Pacote com itens faltando">Pacote com itens faltando</option>
                      <option value="Desistência dentro do prazo legal">Desistência dentro do prazo legal</option>
                      <option value="Outro motivo">Outro motivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                      Descreva o ocorrido
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={descricaoReembolso}
                      onChange={(e) => setDescricaoReembolso(e.target.value)}
                      placeholder="Explique o problema encontrado e se possui fotos/vídeo de unboxing..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow transition active:scale-95"
                  >
                    Confirmar Abertura de Disputa / Reembolso
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL DE VALIDAÇÃO DE PIN DIRETO NO DETALHE DO PEDIDO          */}
      {/* =============================================================== */}
      {modalValidarPinAberto && pedidoSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-white" />
                <h3 className="text-base font-black">Validar PIN de Entrega</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalValidarPinAberto(false)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleValidarPinPresencial} className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Digite os 6 dígitos do seu Código PIN para registrar a entrega presencial e iniciar a garantia de 7 dias:
              </p>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder={pedidoSelecionado.codigoPin}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-300 text-center font-mono text-2xl font-black tracking-[0.25em] outline-none focus:border-emerald-600"
                />
              </div>

              {erroPin && (
                <p className="text-xs font-bold text-red-600">{erroPin}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow transition active:scale-95"
              >
                Confirmar PIN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MinhasComprasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-xs font-bold text-gray-500">Carregando compras...</span>
        </div>
      }
    >
      <MinhasComprasContent />
    </Suspense>
  );
}
