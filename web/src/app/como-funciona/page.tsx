import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Handshake,
  Gavel,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Truck,
  KeyRound,
  FileVideo,
  Star,
  Flame,
  Crown,
  Radio,
  BarChart3,
  HelpCircle,
  ShoppingBag,
} from 'lucide-react';

export const metadata = {
  title: 'Como Funciona o TroqJá | O Primeiro Marketplace 3 em 1 do Brasil',
  description:
    'Venda à vista, participe de leilões ao vivo com Anti-Sniping de 5s ou faça permutas inteligentes com volta em dinheiro. Conheça as regras, planos e protocolo de segurança do TroqJá.',
};

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-gray-50/60 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white border-b border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#FF6B00]/15 border border-[#FF6B00]/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold text-[#FF6B00] backdrop-blur-xs shadow-xs animate-fade-in">
            <Sparkles className="w-4 h-4 text-[#FF6B00]" />
            <span>Guia Oficial TroqJá • Anunciou, trocou, fechou!</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            Como funciona o primeiro marketplace{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-amber-400 to-[#FF6B00]">
              3 em 1 do Brasil
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed">
            No <strong>TroqJá</strong> você tem liberdade total para negociar: venda à vista com preço fixo,
            dispute o maior lance em <strong>leilões em tempo real</strong> ou faça{' '}
            <strong>permutas inteligentes</strong> com ou sem volta em dinheiro, sem intermediários abusivos.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/anunciar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white font-extrabold px-8 py-3.5 rounded-full shadow-lg shadow-orange-500/20 transition transform active:scale-95 text-sm sm:text-base"
            >
              <Sparkles className="w-4 h-4" />
              <span>Inserir Anúncio Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/busca"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-7 py-3.5 rounded-full backdrop-blur-xs transition text-sm sm:text-base"
            >
              <span>Explorar Ofertas</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Micro badges com métricas transparentes */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left text-xs">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
              <span className="text-emerald-400 font-black block text-sm">R$ 0,00</span>
              <span className="text-gray-400">Publicação 100% gratuita</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
              <span className="text-orange-400 font-black block text-sm">Anti-Sniping 5s</span>
              <span className="text-gray-400">Leilão limpo sem bots</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
              <span className="text-emerald-400 font-black block text-sm">Permuta Segura</span>
              <span className="text-gray-400">Pau a pau ou com volta</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
              <span className="text-purple-400 font-black block text-sm">1 a 5★ Auditado</span>
              <span className="text-gray-400">Reputação de compradores reais</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEÇÃO 1: AS 3 MODALIDADES DE NEGOCIAÇÃO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#FF6B00]">
            Flexibilidade Absoluta
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            As 3 Formas de Fazer Negócio no TroqJá
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Você decide como quer desapegar e como quer pagar. Sem fórmulas engessadas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Venda Direta */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-olx-purple flex items-center justify-center font-black shadow-2xs">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="bg-purple-100 text-olx-purple text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Preço Fixo
                </span>
                <h3 className="text-xl font-black text-gray-900 pt-1">
                  🏷️ Venda Direta
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Para quem quer velocidade e certeza de valor. Anuncie por um preço determinado e negocie
                  diretamente com os interessados através do chat em tempo real.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Taxa de publicação R$ 0,00:</strong> cadastre quantos itens quiser sem mensalidade inicial.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Taxa progressiva justa:</strong> apenas 5% para negociações até R$ 1.000 e 7% acima de R$ 1.000 (com Pix e Cartão 1x pelo preço anunciado e parcelamento em até 12x).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Chat com fotos WebP:</strong> tire dúvidas, negocie e marque o encontro com segurança.</span>
                </li>
              </ul>
            </div>

            <Link
              href="/busca?tipo=venda"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-olx-purple font-bold text-xs transition"
            >
              <span>Ver anúncios de venda direta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Leilão em Tempo Real com Anti-Sniping 5s */}
          <div className="bg-white rounded-2xl border-2 border-orange-300 p-6 shadow-md hover:shadow-lg transition flex flex-col justify-between space-y-5 relative">
            <div className="absolute -top-3 right-4 bg-[#FF6B00] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              ⚡ Anti-Sniping 5s
            </div>

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#FF6B00] flex items-center justify-center font-black shadow-2xs">
                <Gavel className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="bg-orange-100 text-[#FF6B00] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Quem Dá Mais
                </span>
                <h3 className="text-xl font-black text-gray-900 pt-1">
                  🔨 Leilão em Tempo Real
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Defina um lance inicial e uma data de término. Os compradores disputam em tempo real com lances
                  ao vivo sem precisar dar F5 na tela.
                </p>
              </div>

              {/* Destaque especial da Regra de Anti-Sniping */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-orange-950">
                  <Zap className="w-4 h-4 text-[#FF6B00]" />
                  <span>Regra Exclusiva Anti-Sniping de 5 Segundos</span>
                </div>
                <p className="text-[11px] text-orange-900 leading-snug">
                  Se um lance for dado nos <strong>últimos 5 segundos</strong> do leilão, o cronômetro ganha
                  automaticamente <strong>+1 minuto (+60s) extra</strong>. Isso garante disputas justas e impede que
                  robôs ou lances no último milissegundo roubem a oportunidade dos outros participantes!
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Incremento mínimo transparente:</strong> R$ 10, R$ 50 ou R$ 100 por lance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Notificação ao vivo:</strong> saiba na hora se o seu lance foi superado.</span>
                </li>
              </ul>
            </div>

            <Link
              href="/busca?tipo=leilao"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E65A00] text-white font-bold text-xs transition shadow-xs"
            >
              <span>Ver leilões ao vivo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Troca-Troca / Permuta Inteligente */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#00C853] flex items-center justify-center font-black shadow-2xs">
                <ArrowLeftRight className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="bg-emerald-100 text-[#00C853] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Permuta Inteligente
                </span>
                <h3 className="text-xl font-black text-gray-900 pt-1">
                  🔄 Troca-Troca TroqJá
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Não quer gastar dinheiro? Troque seu item parado por algo de que você precisa. Negociação oficial
                  sem comentários perdidos e com vistoria no chat.
                </p>
              </div>

              <div className="space-y-2 text-xs bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                <span className="font-extrabold text-emerald-950 block text-[11px] uppercase tracking-wider">
                  As 3 Condições de Permuta:
                </span>
                <div className="space-y-1 text-emerald-900 text-[11px]">
                  <p>• <strong>Pau a pau:</strong> troca direta sem complemento em dinheiro.</p>
                  <p>• <strong>Aceito volta:</strong> você recebe o produto e mais uma quantia em dinheiro.</p>
                  <p>• <strong>Dou volta:</strong> você entrega o seu item e complementa a diferença.</p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Vistoria no chat:</strong> fotos reais em WebP antes de selar o aperto de mão.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Volta segura com custódia:</strong> Taxa progressiva justa: apenas 5% para negociações até R$ 1.000 e 7% acima de R$ 1.000 (com Pix e Cartão 1x pelo preço anunciado e parcelamento em até 12x).</span>
                </li>
              </ul>
            </div>

            <Link
              href="/busca?tipo=troca"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
            >
              <span>Explorar permutas ativas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO 2: TRANSPARÊNCIA TOTAL EM PLANOS E DESTAQUES */}
      <section className="bg-white border-y border-gray-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-olx-purple">
              Tabela de Preços e Serviços
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Preços Transparentes Sem Pegadinhas
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Microtransações a partir de R$ 0,49. Você paga apenas se quiser acelerar o fechamento do seu anúncio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Publicação Padrão */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Para Todo Mundo
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    Sempre Grátis
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Publicação Padrão
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-gray-900">R$ 0,00</span>
                  <span className="text-xs text-gray-500">/anúncio</span>
                </div>
                <p className="text-xs text-gray-600">
                  Ideal para quem quer anunciar itens casuais sem gastar um centavo.
                </p>
                <ul className="space-y-2 text-xs text-gray-700 pt-3 border-t border-gray-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Até 6 fotos convertidas automaticamente em WebP</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Micro-vídeos demonstrativos futuros de até 7 segundos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chat integrado em tempo real</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Filtro de busca e página detalhada</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/anunciar"
                className="w-full text-center py-2.5 rounded-xl border border-gray-300 hover:bg-white text-gray-800 font-bold text-xs transition"
              >
                Publicar Agora Grátis
              </Link>
            </div>

            {/* 2. Destaque Opção A: Global Multi-Categorias */}
            <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-2xl border-2 border-amber-300 p-6 flex flex-col justify-between space-y-4 shadow-sm relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    Opção A • Carrossel Topo
                  </span>
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    Mais Potente
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Destaque Global Multi-Categorias
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-amber-900">R$ 1,99</span>
                  <span className="text-xs text-gray-500">avulso</span>
                </div>
                <p className="text-xs text-gray-600">
                  Visibilidade máxima absoluta em todos os pontos da plataforma.
                </p>
                <ul className="space-y-2 text-xs text-gray-700 pt-3 border-t border-amber-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Carrossel deslizante no topo da Página Inicial</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Topo da Busca Geral e de <strong>todas as categorias</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Selo dourado exclusivo 👑 Destaque Global</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Até 10x mais visualizações e propostas rápidas</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/anunciar"
                className="w-full text-center py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs transition shadow-xs"
              >
                Destacar Anúncio por R$ 1,99
              </Link>
            </div>

            {/* 3. Destaque Opção B: Pacote Categoria */}
            <div className="bg-gradient-to-br from-orange-50/80 via-white to-orange-50/40 rounded-2xl border-2 border-orange-300 p-6 flex flex-col justify-between space-y-4 shadow-sm relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-orange-800 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Opção B • Pacote Inteligente
                  </span>
                  <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    R$ 0,49/cada
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Pacote Categoria (10 Créditos)
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-orange-600">R$ 4,90</span>
                  <span className="text-xs text-gray-500">por 10 destaques</span>
                </div>
                <p className="text-xs text-gray-600">
                  Usa 1 crédito agora e guarda 9 na carteira para usar quando quiser.
                </p>
                <ul className="space-y-2 text-xs text-gray-700 pt-3 border-t border-orange-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Topo exclusivo da categoria do seu produto</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Selo laranja 🔥 Destaque na Categoria</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Créditos nunca expiram na sua conta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Economia de mais de 75% em relação ao avulso</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/anunciar"
                className="w-full text-center py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E65A00] text-white font-black text-xs transition shadow-xs"
              >
                Comprar 10 Créditos por R$ 4,90
              </Link>
            </div>

            {/* 4. Radar VIP do Comprador */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    Para Compradores
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                    Radar 24h
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  📡 Radar VIP na Lista de Desejos
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-emerald-700">R$ 1,99</span>
                  <span className="text-xs text-gray-500">/mês</span>
                </div>
                <p className="text-xs text-gray-600">
                  Nunca mais perca uma pechincha na sua cidade por não estar online.
                </p>
                <ul className="space-y-2 text-xs text-gray-700 pt-3 border-t border-gray-100">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Monitoramento contínuo das suas palavras-chave e teto de preço</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Alerta imediato assim que alguém publica o que você procura</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Seja o primeiro a dar o lance ou fechar a permuta</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/desejos"
                className="w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
              >
                Ativar Radar VIP
              </Link>
            </div>

            {/* 5. Plano Lojista CNPJ */}
            <div className="md:col-span-2 lg:col-span-2 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 text-white rounded-2xl border border-gray-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    B2B • Inteligência de Mercado
                  </span>
                  <span className="bg-emerald-500 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    Apenas R$ 9,90/mês
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Plano Lojista CNPJ — Data & Analytics
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
                  Acesso completo aos dados de buscas reais na sua região, produtos com demanda reprimida sem estoque
                  e contato com a Lista de Desejos de compradores reais. Sem pacotes caros de créditos.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-300 pt-2">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Demanda sem estoque
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mapa de calor de lances
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Logística com Código PIN
                  </span>
                </div>
              </div>

              <Link
                href="/sobre?aba=lojistas"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black px-6 py-3.5 rounded-xl transition text-xs sm:text-sm shrink-0 shadow-lg shadow-emerald-500/20"
              >
                <span>Conhecer Painel Lojista</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO 3: PROTOCOLO DE SEGURANÇA, REPUTAÇÃO E ENTREGA CNPJ (ID=seguranca) */}
      <section id="seguranca" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-purple-100 text-olx-purple px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-olx-purple" />
            <span>Blindagem & Reputação</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Protocolo de Segurança e Confiança TroqJá
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Estrutura desenhada para coibir fraudes, perfis fakes e lances desonestos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pilar 1: Avaliação Mútua Auditada */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900">
              Avaliação Mútua Auditada (1 a 5★)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Diferente de redes sociais onde qualquer um avalia, no TroqJá <strong>apenas negociações concluídas
              e registradas</strong> entre comprador e vendedor desbloqueiam o envio de notas e comentários.
            </p>
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <span className="font-bold block">Reputação Inviolável:</span>
              <span>A nota no perfil do anunciante (ex: ★ 4.9) reflete o histórico verdadeiro de entregas e pontualidade.</span>
            </div>
          </div>

          {/* Pilar 2: Negociação Local Segura C2C */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <Handshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900">
              Negociação Local Segura (C2C e Trocas)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Para produtos usados e trocas entre pessoas físicas da mesma cidade, o TroqJá recomenda o encontro presencial
              em locais públicos e movimentados.
            </p>
            <ul className="space-y-1.5 text-xs text-gray-600 pt-1">
              <li>• Prefira shoppings, estações de metrô ou praças de alimentação;</li>
              <li>• Ligue e teste o aparelho na frente do vendedor antes de fechar;</li>
              <li>• Nunca faça depósitos antecipados para suposta &ldquo;reserva de item&rdquo;.</li>
            </ul>
          </div>

          {/* Pilar 3: Logística Blindada CNPJ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900">
              Logística Blindada Exclusiva CNPJ
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Lojistas cadastrados com CNPJ que vendem produtos novos contam com o sistema de custódia (Escrow) e frete integrado
              com proteção dupla.
            </p>
            <ul className="space-y-1.5 text-xs text-gray-600 pt-1">
              <li>• <strong>Liberação Imediata:</strong> assim que o cliente confirma e avalia;</li>
              <li>• <strong>Liberação em 7 dias:</strong> automática após comprovante de entrega;</li>
              <li>• <strong>Código PIN + Vídeo Unboxing:</strong> segurança mútua garantida.</li>
            </ul>
          </div>
        </div>

        {/* Banner Detalhado do Código PIN + Vídeo de Abertura */}
        <div className="rounded-2xl bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 border border-gray-800 p-6 sm:p-8 text-white space-y-4 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#FF6B00] flex items-center justify-center font-black">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-white">
                  Código PIN de Recebimento + Vídeo de Abertura (Unboxing Seguro)
                </h4>
                <p className="text-xs text-gray-400">
                  Como funciona a entrega com custódia blindada para produtos novos de lojistas CNPJ
                </p>
              </div>
            </div>
            <span className="bg-[#FF6B00] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Exclusivo CNPJ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300 leading-relaxed">
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <KeyRound className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-white block font-bold">1. Código PIN de 6 dígitos gerado no app</strong>
                <p>
                  O comprador recebe um código único que só deve ser informado ao entregador no momento em que o pacote
                  estiver em suas mãos, confirmando fisicamente o recebimento.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <FileVideo className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-white block font-bold">2. Gravação do Vídeo Unboxing sem cortes</strong>
                <p>
                  O comprador é orientado a filmar a abertura da embalagem mostrando etiqueta e lacre intactos. Se houver
                  qualquer avaria de transporte ou erro de produto, o reembolso é imediato pela plataforma.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ RÁPIDO */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#FF6B00]" />
            <span>Dúvidas Frequentes sobre o Funcionamento</span>
          </h2>
          <p className="text-xs text-gray-500">
            Respostas diretas para as dúvidas mais comuns
          </p>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
            <strong className="text-gray-900 font-bold block">
              Como funciona na prática a prorrogação de 5 segundos no leilão?
            </strong>
            <p className="text-gray-600">
              Se qualquer participante der um lance faltando 5 segundos ou menos para o fim do leilão, o cronômetro
              automaticamente ganha +1 minuto extra. Essa extensão ocorre para dar chance de contra-lance e impedir
              snipers/robôs. Se ninguém mais der lance no novo minuto, o leilão se encerra normalmente.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
            <strong className="text-gray-900 font-bold block">
              Como funciona o pagamento da volta em dinheiro na troca?
            </strong>
            <p className="text-gray-600">
              Quando um usuário aceita ou dá volta, ele pode transferir o valor acordado diretamente no encontro presencial
              ou optar pela custódia garantida dentro da plataforma (com retenção do valor até a conferência mútua dos bens).
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
            <strong className="text-gray-900 font-bold block">
              Eu pago alguma taxa para anunciar no TroqJá?
            </strong>
            <p className="text-gray-600">
              Não! A publicação padrão de anúncios é 100% gratuita. Você só paga se optar por adquirir destaques avulsos
              (R$ 1,99), pacotes de categoria (R$ 0,49/cada), Radar VIP (R$ 1,99/mês) ou a assinatura do Painel Lojista CNPJ (R$ 9,90/mês).
            </p>
          </div>
        </div>
      </section>

      {/* 6. CTA FINAL */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl space-y-4 relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Pronto para fechar seu melhor negócio hoje?
          </h2>
          <p className="text-sm sm:text-base text-orange-100 max-w-xl mx-auto font-medium">
            Junte-se a milhares de brasileiros que já estão vendendo, leiloando e permutando com transparência total.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/anunciar"
              className="bg-white hover:bg-gray-100 text-[#FF6B00] font-black px-8 py-3.5 rounded-full shadow-md transition transform active:scale-95 text-sm"
            >
              Inserir Anúncio Grátis Agora
            </Link>
            <Link
              href="/busca"
              className="bg-black/20 hover:bg-black/30 border border-white/30 text-white font-bold px-7 py-3.5 rounded-full transition text-sm backdrop-blur-xs"
            >
              Explorar Ofertas Disponíveis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}