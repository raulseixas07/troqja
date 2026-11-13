/**
 * Utilitário Centralizado de Checkout, Custódia (Escrow) e Split Automático - TroqJá
 *
 * Regra Oficial de Taxas Progressivas:
 * - Valores até R$ 1.000,00: taxa de 5% descontada do vendedor no split.
 * - Valores acima de R$ 1.000,00: taxa de 7% descontada do vendedor no split.
 * - Pix e Cartão de Crédito 1x: 0% de acréscimo para o comprador (preço anunciado).
 * - Cartão Parcelado (2x a 12x): juros compostos da adquirente (2,49% a.m.) repassados ao comprador,
 *   mantendo o líquido do vendedor e a comissão do TroqJá intactos.
 */

export type ModalidadeCheckout = 'venda_direta' | 'leilao' | 'permuta_volta';
export type MetodoPagamento = 'pix' | 'cartao_credito';
export type StatusEscrow =
  | 'aguardando_pagamento'
  | 'escrow_retained'
  | 'pago_em_custodia'
  | 'pin_verified_blocked_7d'
  | 'liberado_vendedor'
  | 'em_disputa'
  | 'cancelado';
export type GatewayProvider = 'mercadopago' | 'asaas' | 'simulador_troqja';

export interface PedidoVendedor {
  id: string;
  anuncioId: string;
  tituloProduto: string;
  compradorNome: string;
  compradorId: string;
  vendedorId?: string;
  dataHora: string; // ISO
  valorBruto: number;
  taxaPercentual: 5 | 7;
  valorTaxa: number;
  valorLiquido: number;
  status: 'aguardando_pin' | 'pin_verified_blocked_7d' | 'liberado_vendedor';
  pinVerifiedAt?: string | null;
  releaseDate?: string | null; // ISO D+7
  codigoPin?: string;
  metodoPagamento?: MetodoPagamento;
  parcelas?: number;
}

export const LIMITE_FAIXA_TAXA_REDUZIDA = 1000;
export const TAXA_ATE_MIL_PERCENTUAL = 5 as const;
export const TAXA_ACIMA_MIL_PERCENTUAL = 7 as const;
export const JUROS_MENSAL_CARTAO_PERCENTUAL = 2.49;

export interface SplitTroqJaResult {
  valorBase: number;
  percentualTaxa: 5 | 7;
  taxaPlataforma: number;
  liquidoVendedor: number;
}

export interface ParcelamentoOption {
  parcelas: number;
  taxaJurosMensal: number;
  semJuros: boolean;
  valorParcela: number;
  valorTotalComprador: number;
  jurosTotal: number;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o Split TroqJá descontado do vendedor:
 * - Até R$ 1.000,00: 5%
 * - Acima de R$ 1.000,00: 7%
 */
export function calcularSplitTroqJa(valorBase: number): SplitTroqJaResult {
  if (!Number.isFinite(valorBase) || valorBase <= 0) {
    return {
      valorBase: 0,
      percentualTaxa: TAXA_ATE_MIL_PERCENTUAL,
      taxaPlataforma: 0,
      liquidoVendedor: 0,
    };
  }

  const base = roundCurrency(valorBase);
  const percentualTaxa: 5 | 7 =
    base <= LIMITE_FAIXA_TAXA_REDUZIDA ? TAXA_ATE_MIL_PERCENTUAL : TAXA_ACIMA_MIL_PERCENTUAL;
  const taxaPlataforma = roundCurrency(base * (percentualTaxa / 100));
  const liquidoVendedor = roundCurrency(base - taxaPlataforma);

  return {
    valorBase: base,
    percentualTaxa,
    taxaPlataforma,
    liquidoVendedor,
  };
}

/**
 * Calcula o preço bruto que deve ser anunciado para que o vendedor receba
 * exatamente `liquidoDesejado` após o desconto da taxa TroqJá (5% até R$ 1.000 / 7% acima).
 */
export function calcularPrecoBrutoParaLiquidoDesejado(liquidoDesejado: number): number {
  if (!Number.isFinite(liquidoDesejado) || liquidoDesejado <= 0) {
    return 0;
  }

  const alvo = roundCurrency(liquidoDesejado);
  const cand5 = roundCurrency(alvo / (1 - TAXA_ATE_MIL_PERCENTUAL / 100));

  if (cand5 <= LIMITE_FAIXA_TAXA_REDUZIDA) {
    if (calcularSplitTroqJa(cand5).liquidoVendedor >= alvo) {
      return cand5;
    }
    const cand5Ajustado = roundCurrency(cand5 + 0.01);
    if (
      cand5Ajustado <= LIMITE_FAIXA_TAXA_REDUZIDA &&
      calcularSplitTroqJa(cand5Ajustado).liquidoVendedor >= alvo
    ) {
      return cand5Ajustado;
    }
  }

  const cand7 = roundCurrency(alvo / (1 - TAXA_ACIMA_MIL_PERCENTUAL / 100));
  if (calcularSplitTroqJa(cand7).liquidoVendedor >= alvo) {
    return cand7;
  }
  return roundCurrency(cand7 + 0.01);
}

/**
 * Calcula o valor da parcela e total pago pelo comprador:
 * - Pix ou Cartão 1x: sem acréscimo (valorBase exato).
 * - Cartão 2x a 12x: repasse de 2,49% a.m. (Tabela Price / juros compostos da adquirente),
 *   garantindo que o líquido do vendedor e a taxa TroqJá permaneçam intactos.
 */
export function calcularParcelamentoTroqJa(
  valorBase: number,
  parcelas = 1,
  metodo: MetodoPagamento = 'cartao_credito'
): ParcelamentoOption {
  const base =
    Number.isFinite(valorBase) && valorBase > 0 ? roundCurrency(valorBase) : 0;

  const numParcelas =
    metodo === 'pix'
      ? 1
      : Math.min(12, Math.max(1, Math.floor(Number.isFinite(parcelas) ? parcelas : 1)));

  if (numParcelas === 1 || base === 0) {
    return {
      parcelas: 1,
      taxaJurosMensal: 0,
      semJuros: true,
      valorParcela: base,
      valorTotalComprador: base,
      jurosTotal: 0,
    };
  }

  const i = JUROS_MENSAL_CARTAO_PERCENTUAL / 100;
  const fator = (i * Math.pow(1 + i, numParcelas)) / (Math.pow(1 + i, numParcelas) - 1);
  const valorParcela = roundCurrency(base * fator);
  const valorTotalComprador = roundCurrency(valorParcela * numParcelas);
  const jurosTotal = roundCurrency(Math.max(0, valorTotalComprador - base));

  return {
    parcelas: numParcelas,
    taxaJurosMensal: JUROS_MENSAL_CARTAO_PERCENTUAL,
    semJuros: false,
    valorParcela,
    valorTotalComprador,
    jurosTotal,
  };
}

/**
 * Gera a tabela completa de 1x a 12x para exibição no seletor de cartão.
 */
export function gerarTabelaParcelas(valorBase: number): ParcelamentoOption[] {
  const tabela: ParcelamentoOption[] = [];
  for (let n = 1; n <= 12; n++) {
    tabela.push(calcularParcelamentoTroqJa(valorBase, n, 'cartao_credito'));
  }
  return tabela;
}

/**
 * Gera código PIN aleatório de 6 dígitos para liberação de custódia na entrega.
 */
export function gerarCodigoPin6Digitos(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    const num = 100000 + ((arr[0] ?? 0) % 900000);
    return String(num);
  }
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

/**
 * Formata um código PIN de 6 dígitos no padrão visual `482-915`.
 */
export function formatarCodigoPin(pin: string): string {
  const digits = pin.replace(/\D/g, '').slice(0, 6);
  if (digits.length === 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
  }
  return digits;
}

/**
 * Gera uma string Pix Copia e Cola (padrão EMV BR Code demonstrativo) para o modo Sandbox.
 */
export function gerarPixCopiaEColaSandbox(
  valor: number,
  txId: string,
  descricao = 'TROQJA ESCROW'
): string {
  const valorStr = (Number.isFinite(valor) && valor > 0 ? valor : 0).toFixed(2);
  const txLimpo = txId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'TROQJA001';
  const descLimpa = descricao
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 25) || 'TROQJA CUSTODIA';

  const merchantAccount = `0014br.gov.bcb.pix0122escrow@troqja.com.br02${String(descLimpa.length).padStart(2, '0')}${descLimpa}`;
  const campo26 = `26${String(merchantAccount.length).padStart(2, '0')}${merchantAccount}`;
  const campo54 = `54${String(valorStr.length).padStart(2, '0')}${valorStr}`;
  const campo62Inner = `05${String(txLimpo.length).padStart(2, '0')}${txLimpo}`;
  const campo62 = `62${String(campo62Inner.length).padStart(2, '0')}${campo62Inner}`;

  const payloadSemCrc =
    `000201010212${campo26}520400005303986${campo54}5802BR` +
    `5914TROQJA ESCROW6009SAO PAULO${campo62}6304`;

  // CRC16-CCITT simples determinístico para demonstração EMV
  let crc = 0xffff;
  for (let i = 0; i < payloadSemCrc.length; i++) {
    crc ^= payloadSemCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return `${payloadSemCrc}${crcHex}`;
}

/**
 * Calcula dias corridos restantes até a liberação D+7.
 */
export function calcularDiasRestantes7D(releaseDateIso?: string | null): number {
  if (!releaseDateIso) return 7;
  const target = new Date(releaseDateIso).getTime();
  const diffMs = target - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatarDataBR(dateIso?: string | null): string {
  if (!dateIso) return '--/--/----';
  try {
    const d = new Date(dateIso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateIso;
  }
}

export function formatarDataHoraBR(dateIso?: string | null): string {
  if (!dateIso) return '--/--/---- --:--';
  try {
    const d = new Date(dateIso);
    return `${d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateIso;
  }
}

export const STORAGE_KEY_PEDIDOS_VENDEDOR = 'troqja_painel_receita_pedidos_v1';

export function obterPedidosVendedorMockIniciais(): PedidoVendedor[] {
  const agora = Date.now();
  const umDia = 24 * 60 * 60 * 1000;

  return [
    {
      id: 'tx-vend-001',
      anuncioId: 'anuncio-fone-sony',
      tituloProduto: 'Headphone Sony WH-1000XM4 Noise Cancelling',
      compradorNome: 'Lucas Oliveira',
      compradorId: 'usr-lucas-01',
      dataHora: new Date(agora - 12 * umDia).toISOString(),
      valorBruto: 1450.0,
      taxaPercentual: 7,
      valorTaxa: 101.5,
      valorLiquido: 1348.5,
      status: 'liberado_vendedor',
      pinVerifiedAt: new Date(agora - 10 * umDia).toISOString(),
      releaseDate: new Date(agora - 3 * umDia).toISOString(),
      codigoPin: '931402',
      metodoPagamento: 'pix',
      parcelas: 1,
    },
    {
      id: 'tx-vend-002',
      anuncioId: 'anuncio-camisa-retro',
      tituloProduto: 'Camisa Retrô Seleção Brasileira 1970 Tamanho G',
      compradorNome: 'Mariana Duarte',
      compradorId: 'usr-mari-02',
      dataHora: new Date(agora - 8 * umDia).toISOString(),
      valorBruto: 180.0,
      taxaPercentual: 5,
      valorTaxa: 9.0,
      valorLiquido: 171.0,
      status: 'liberado_vendedor',
      pinVerifiedAt: new Date(agora - 8 * umDia).toISOString(),
      releaseDate: new Date(agora - 1 * umDia).toISOString(),
      codigoPin: '419825',
      metodoPagamento: 'cartao_credito',
      parcelas: 2,
    },
    {
      id: 'tx-vend-003',
      anuncioId: 'anuncio-monitor-dell',
      tituloProduto: 'Monitor Gamer Dell 27" 165Hz IPS QHD',
      compradorNome: 'Gabriel Santos',
      compradorId: 'usr-gab-03',
      dataHora: new Date(agora - 2 * umDia).toISOString(),
      valorBruto: 1890.0,
      taxaPercentual: 7,
      valorTaxa: 132.3,
      valorLiquido: 1757.7,
      status: 'pin_verified_blocked_7d',
      pinVerifiedAt: new Date(agora - 2 * umDia).toISOString(),
      releaseDate: new Date(agora + 5 * umDia).toISOString(),
      codigoPin: '782194',
      metodoPagamento: 'pix',
      parcelas: 1,
    },
    {
      id: 'tx-vend-004',
      anuncioId: 'anuncio-kindle-paperwhite',
      tituloProduto: 'Kindle Paperwhite 16GB 11ª Geração À Prova D’Água',
      compradorNome: 'Beatriz Ramos',
      compradorId: 'usr-bia-04',
      dataHora: new Date(agora - 4 * umDia).toISOString(),
      valorBruto: 520.0,
      taxaPercentual: 5,
      valorTaxa: 26.0,
      valorLiquido: 494.0,
      status: 'pin_verified_blocked_7d',
      pinVerifiedAt: new Date(agora - 4 * umDia).toISOString(),
      releaseDate: new Date(agora + 3 * umDia).toISOString(),
      codigoPin: '635109',
      metodoPagamento: 'cartao_credito',
      parcelas: 3,
    },
    {
      id: 'tx-vend-005',
      anuncioId: 'anuncio-nintendo-switch',
      tituloProduto: 'Nintendo Switch OLED 64GB Completo na Caixa',
      compradorNome: 'Rodrigo Silveira',
      compradorId: 'usr-rod-05',
      dataHora: new Date(agora - 3 * 60 * 60 * 1000).toISOString(),
      valorBruto: 1950.0,
      taxaPercentual: 7,
      valorTaxa: 136.5,
      valorLiquido: 1813.5,
      status: 'aguardando_pin',
      pinVerifiedAt: null,
      releaseDate: null,
      codigoPin: '528913',
      metodoPagamento: 'pix',
      parcelas: 1,
    },
  ];
}

export function carregarPedidosVendedor(): PedidoVendedor[] {
  if (typeof window === 'undefined') {
    return obterPedidosVendedorMockIniciais();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PEDIDOS_VENDEDOR);
    if (!raw) {
      const iniciais = obterPedidosVendedorMockIniciais();
      localStorage.setItem(STORAGE_KEY_PEDIDOS_VENDEDOR, JSON.stringify(iniciais));
      return iniciais;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const fallback = obterPedidosVendedorMockIniciais();
    localStorage.setItem(STORAGE_KEY_PEDIDOS_VENDEDOR, JSON.stringify(fallback));
    return fallback;
  } catch {
    return obterPedidosVendedorMockIniciais();
  }
}

export function salvarPedidosVendedor(pedidos: PedidoVendedor[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PEDIDOS_VENDEDOR, JSON.stringify(pedidos));
    window.dispatchEvent(new CustomEvent('troqja_pedidos_updated'));
  } catch {
    // ignore
  }
}

export function adicionarOuAtualizarPedidoVendedor(
  pedido: Partial<PedidoVendedor> & { id: string }
): PedidoVendedor[] {
  const pedidos = carregarPedidosVendedor();
  const index = pedidos.findIndex((p) => p.id === pedido.id);
  let atualizados: PedidoVendedor[];

  if (index >= 0) {
    const anterior = pedidos[index];
    if (!anterior) return pedidos;
    const merge: PedidoVendedor = {
      id: anterior.id,
      anuncioId: pedido.anuncioId || anterior.anuncioId,
      tituloProduto: pedido.tituloProduto || anterior.tituloProduto,
      compradorNome: pedido.compradorNome || anterior.compradorNome,
      compradorId: pedido.compradorId || anterior.compradorId,
      vendedorId: pedido.vendedorId || anterior.vendedorId,
      dataHora: pedido.dataHora || anterior.dataHora,
      valorBruto: pedido.valorBruto ?? anterior.valorBruto,
      taxaPercentual: pedido.taxaPercentual ?? anterior.taxaPercentual,
      valorTaxa: pedido.valorTaxa ?? anterior.valorTaxa,
      valorLiquido: pedido.valorLiquido ?? anterior.valorLiquido,
      status: pedido.status || anterior.status,
      pinVerifiedAt: pedido.pinVerifiedAt !== undefined ? pedido.pinVerifiedAt : anterior.pinVerifiedAt,
      releaseDate: pedido.releaseDate !== undefined ? pedido.releaseDate : anterior.releaseDate,
      codigoPin: pedido.codigoPin || anterior.codigoPin,
      metodoPagamento: pedido.metodoPagamento || anterior.metodoPagamento,
      parcelas: pedido.parcelas || anterior.parcelas,
    };
    atualizados = [...pedidos];
    atualizados[index] = merge;
  } else {
    const split = calcularSplitTroqJa(pedido.valorBruto || 100);
    const novo: PedidoVendedor = {
      id: pedido.id,
      anuncioId: pedido.anuncioId || 'anuncio-demo',
      tituloProduto: pedido.tituloProduto || 'Produto TroqJá',
      compradorNome: pedido.compradorNome || 'Comprador Verificado',
      compradorId: pedido.compradorId || 'usr-comprador',
      vendedorId: pedido.vendedorId || 'meu-usuario',
      dataHora: pedido.dataHora || new Date().toISOString(),
      valorBruto: split.valorBase,
      taxaPercentual: split.percentualTaxa,
      valorTaxa: split.taxaPlataforma,
      valorLiquido: split.liquidoVendedor,
      status: pedido.status || 'aguardando_pin',
      pinVerifiedAt: pedido.pinVerifiedAt || null,
      releaseDate: pedido.releaseDate || null,
      codigoPin: pedido.codigoPin || '123456',
      metodoPagamento: pedido.metodoPagamento || 'pix',
      parcelas: pedido.parcelas || 1,
    };
    atualizados = [novo, ...pedidos];
  }

  salvarPedidosVendedor(atualizados);
  return atualizados;
}

export function simularAvanco7DiasPedido(transacaoId: string): PedidoVendedor[] {
  const pedidos = carregarPedidosVendedor();
  const atualizados = pedidos.map((p) => {
    if (p.id === transacaoId) {
      return {
        ...p,
        status: 'liberado_vendedor' as const,
        releaseDate: new Date().toISOString(),
      };
    }
    return p;
  });
  salvarPedidosVendedor(atualizados);
  return atualizados;
}

export interface TotaisCarteiraVendedor {
  saldoDisponivel: number;
  saldoBloqueado7D: number;
  saldoAguardandoPin: number;
  totalLiquidoVendedor: number;
  totalTaxasPlataforma: number;
  gmvTotalBruto: number;
}

export function calcularTotaisCarteira(pedidos: PedidoVendedor[]): TotaisCarteiraVendedor {
  let saldoDisponivel = 0;
  let saldoBloqueado7D = 0;
  let saldoAguardandoPin = 0;
  let totalLiquidoVendedor = 0;
  let totalTaxasPlataforma = 0;
  let gmvTotalBruto = 0;

  for (const p of pedidos) {
    gmvTotalBruto += p.valorBruto;
    totalTaxasPlataforma += p.valorTaxa;
    totalLiquidoVendedor += p.valorLiquido;

    if (p.status === 'liberado_vendedor') {
      saldoDisponivel += p.valorLiquido;
    } else if (p.status === 'pin_verified_blocked_7d') {
      saldoBloqueado7D += p.valorLiquido;
    } else if (p.status === 'aguardando_pin') {
      saldoAguardandoPin += p.valorLiquido;
    }
  }

  return {
    saldoDisponivel: roundCurrency(saldoDisponivel),
    saldoBloqueado7D: roundCurrency(saldoBloqueado7D),
    saldoAguardandoPin: roundCurrency(saldoAguardandoPin),
    totalLiquidoVendedor: roundCurrency(totalLiquidoVendedor),
    totalTaxasPlataforma: roundCurrency(totalTaxasPlataforma),
    gmvTotalBruto: roundCurrency(gmvTotalBruto),
  };
}
