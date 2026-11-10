'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  Rocket,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Target,
  Zap,
  MapPin,
  Flame,
  FileVideo,
  Truck,
  Users,
  Cpu,
  BadgeCheck,
  ArrowLeftRight,
} from 'lucide-react';

type TabType = 'quem-somos' | 'novidades' | 'lojistas';

function SobreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const abaParam = searchParams.get('aba') as TabType | null;
  const initialTab: TabType =
    abaParam === 'novidades' || abaParam === 'lojistas' ? abaParam : 'quem-somos';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sincroniza query string caso mude
  useEffect(() => {
    if (abaParam && (abaParam === 'quem-somos' || abaParam === 'novidades' || abaParam === 'lojistas')) {
      setActiveTab(abaParam);
    }
  }, [abaParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/sobre?aba=${tab}`, { scroll: false });
  };

  // Estado do formulário de pré-cadastro CNPJ
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [segmento, setSegmento] = useState('Eletrônicos e Celulares');
  const [cnpjCadastrado, setCnpjCadastrado] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Recupera cadastro anterior do localStorage se houver
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('troqja_pre_cadastro_cnpj');
      if (salvo) {
        try {
          const dados = JSON.parse(salvo);
          if (dados?.cnpj) {
            setCnpjCadastrado(true);
            setRazaoSocial(dados.razaoSocial || '');
            setCnpj(dados.cnpj || '');
            setWhatsapp(dados.whatsapp || '');
            setSegmento(dados.segmento || 'Eletrônicos e Celulares');
          }
        } catch {
          // ignora erro de parse
        }
      }
    }
  }, []);

  // Máscara para CNPJ
  const formatCNPJ = (v: string) => {
    const limpo = v.replace(/\D/g, '').slice(0, 14);
    return limpo
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Máscara para WhatsApp
  const formatTelefone = (v: string) => {
    const limpo = v.replace(/\D/g, '').slice(0, 11);
    if (limpo.length <= 10) {
      return limpo.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return limpo.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const handleCadastrarCNPJ = (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    const digitosCnpj = cnpj.replace(/\D/g, '');
    const digitosWhats = whatsapp.replace(/\D/g, '');

    if (!razaoSocial.trim()) {
      setErroForm('Por favor, informe a Razão Social ou Nome Fantasia da empresa.');
      return;
    }
    if (digitosCnpj.length < 14) {
      setErroForm('CNPJ incompleto. Deve conter 14 dígitos válidos.');
      return;
    }
    if (digitosWhats.length < 10) {
      setErroForm('WhatsApp incompleto. Informe DDD + número válido.');
      return;
    }

    const payload = {
      razaoSocial: razaoSocial.trim(),
      cnpj,
      whatsapp,
      segmento,
      data: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('troqja_pre_cadastro_cnpj', JSON.stringify(payload));
    }
    setCnpjCadastrado(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20">
      {/* 1. TOPO INSTITUCIONAL */}
      <section className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold text-purple-300">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Portal Institucional & Corporativo TroqJá</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl mx-auto">
            Inovação, transparência e{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-amber-400 to-[#FF6B00]">
              inteligência de mercado
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Conheça o manifesto do TroqJá, acompanhe o nosso roadmap público de novas tecnologias e descubra o
            poder do Dashboard Analítico para Lojistas CNPJ.
          </p>

          {/* Navegação entre as 3 Abas */}
          <div className="pt-6 flex items-center justify-center">
            <div className="inline-flex p-1.5 bg-gray-900/90 rounded-2xl border border-gray-800 gap-1.5 max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => handleTabChange('quem-somos')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap ${
                  activeTab === 'quem-somos'
                    ? 'bg-olx-purple text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>🏢 Quem Somos</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('novidades')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap ${
                  activeTab === 'novidades'
                    ? 'bg-[#FF6B00] text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Rocket className="w-4 h-4" />
                <span>🚀 Novidades & Roadmap</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('lojistas')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap ${
                  activeTab === 'lojistas'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>📊 Área Lojista CNPJ (R$ 9,90)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO DAS 3 ABAS */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ========================================================================= */}
        {/* ABA 1: QUEM SOMOS */}
        {/* ========================================================================= */}
        {activeTab === 'quem-somos' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Bloco 1: A Visão Central */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                  Troq<span className="text-[#FF6B00]">Já</span>
                </span>
                <span className="text-gray-400 font-light text-2xl">|</span>
                <span className="italic font-bold text-gray-600 text-sm sm:text-base">
                  &ldquo;Anunciou, trocou, fechou!&rdquo;
                </span>
              </div>

              <div className="prose prose-gray max-w-none text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
                <p>
                  O <strong>TroqJá</strong> nasceu com uma missão inegociável: transformar radicalmente a forma como
                  brasileiros compram, vendem e permutam mercadorias pela internet.
                </p>
                <p>
                  Durante anos, os usuários de classificados tradicionais foram forçados a improvisar permutas
                  e trocas nos campos de comentários, sem garantias, sem critérios de valor e sujeitos a golpes.
                  Ao mesmo tempo, leilões online ficavam restritos a processos judiciais ou plataformas burocráticas
                  com comissões exorbitantes.
                </p>
                <p>
                  Criamos o primeiro ecossistema <strong>3 em 1 do Brasil</strong>, onde no mesmo anúncio o usuário pode
                  comprar no preço fixo, disputar lances em leilões ao vivo sem F5 ou propor uma permuta justa
                  (pau a pau, aceitando ou dando volta em dinheiro).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100 text-center">
                <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-100">
                  <span className="text-2xl font-black text-[#FF6B00] block">3 em 1</span>
                  <span className="text-xs text-gray-600 font-medium">Venda, Leilão e Permuta Integrados</span>
                </div>
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                  <span className="text-2xl font-black text-emerald-600 block">R$ 0,49</span>
                  <span className="text-xs text-gray-600 font-medium">Microtransações Acessíveis</span>
                </div>
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100">
                  <span className="text-2xl font-black text-olx-purple block">100% Realtime</span>
                  <span className="text-xs text-gray-600 font-medium">WebSockets e WebP Eco-Friendly</span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Pilares Tecnológicos */}
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-olx-purple">
                  Engenharia e Experiência
                </span>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Nossos Pilares Tecnológicos
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#00C853] flex items-center justify-center font-black">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-gray-900">
                    Compressão WebP no Cliente
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Todas as fotos enviadas nos anúncios e no chat são comprimidas e convertidas para WebP no próprio
                    navegador antes do upload. Isso economiza o plano de dados móveis do usuário brasileiro e garante
                    carregamento instantâneo.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center font-black">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-gray-900">
                    WebSockets e Leilões em Tempo Real
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Arquitetura em tempo real para sincronização instantânea de lances, chat com confirmação de leitura
                    e extensão dinâmica de tempo Anti-Sniping sem que ninguém precise dar F5.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-olx-purple flex items-center justify-center font-black">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-gray-900">
                    Economia Circular & Inclusão
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Facilitamos a permuta de itens para que famílias e empreendedores consigam bens de que precisam sem
                    depender exclusivamente de capital financeiro, prolongando o ciclo de vida dos produtos.
                  </p>
                </div>
              </div>
            </div>

            {/* Links rápidos para outras áreas */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-bold text-sm sm:text-base">Quer saber o que estamos construindo a seguir?</h4>
                <p className="text-xs text-gray-400">Veja nosso Roadmap Público e as próximas funcionalidades no forno.</p>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('novidades')}
                className="bg-[#FF6B00] hover:bg-[#E65A00] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2"
              >
                <span>Ver Roadmap Público</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: NOVIDADES & ROADMAP */}
        {/* ========================================================================= */}
        {activeTab === 'novidades' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6B00]">
                Transparência Tecnológica
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
                Roadmap de Desenvolvimento TroqJá
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Acompanhe o que já está funcionando no ar, o que chega nas próximas semanas e o que estamos preparando para o futuro.
              </p>
            </div>

            {/* 3 Colunas de Roadmap */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna 1: Já Disponível (No Ar) */}
              <div className="bg-white rounded-3xl border-2 border-emerald-300 p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-base font-black text-emerald-950 uppercase tracking-wider">
                      🟢 Já Disponível (No Ar)
                    </h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    Produção
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <strong className="text-gray-900 font-bold block">
                      Vitrines Separadas 3 em 1
                    </strong>
                    <p className="text-gray-600">
                      Venda Direta, Leilão ao Vivo e Troca-Troca com filtros inteligentes por modalidade na Home e na Busca.
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <strong className="text-gray-900 font-bold block">
                      Carrossel de Destaques
                    </strong>
                    <p className="text-gray-600">
                      Destaque Opção A Global (topo de tudo por R$ 1,99) e Opção B Categoria (pacote de 10 créditos por R$ 4,90).
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <strong className="text-gray-900 font-bold block">
                      Chat em Tempo Real com Fotos WebP
                    </strong>
                    <p className="text-gray-600">
                      Mensagens instantâneas via WebSockets, upload ecológico de fotos com visualização Lightbox ampliada.
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <strong className="text-gray-900 font-bold block">
                      Radar VIP & Avaliação de 1 a 5★
                    </strong>
                    <p className="text-gray-600">
                      Lista de Desejos monitorada e sistema de reputação auditada pós-fechamento de negócio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Em Breve (Próximas Atualizações) */}
              <div className="bg-white rounded-3xl border-2 border-orange-300 p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-orange-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF6B00]" />
                    <h3 className="text-base font-black text-orange-950 uppercase tracking-wider">
                      🟠 Em Breve
                    </h3>
                  </div>
                  <span className="bg-orange-100 text-[#FF6B00] text-[10px] font-black px-2 py-0.5 rounded-full">
                    Sprint Atual
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-100 space-y-1">
                    <strong className="text-gray-900 font-bold block flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#FF6B00]" />
                      Checkout Integrado com Custódia (5% / 7%)
                    </strong>
                    <p className="text-gray-600">
                      Taxa progressiva justa: apenas 5% para negociações até R$ 1.000 e 7% acima de R$ 1.000 (com Pix e Cartão 1x pelo preço anunciado e parcelamento em até 12x), para venda direta, liquidação de leilões e volta em permutas.
                    </p>
                  </div>

                  <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-100 space-y-1">
                    <strong className="text-gray-900 font-bold block flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#FF6B00]" />
                      Gatilho Anti-Sniping de 5 Segundos
                    </strong>
                    <p className="text-gray-600">
                      Prorrogação automática de +60s para lances nos últimos 5 segundos do leilão em tempo real.
                    </p>
                  </div>

                  <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-100 space-y-1">
                    <strong className="text-gray-900 font-bold block">
                      Cards de Proposta Oficial no Chat
                    </strong>
                    <p className="text-gray-600">
                      Selecione um anúncio seu e envie como proposta formal de permuta com 1 clique dentro da conversa.
                    </p>
                  </div>

                  <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-100 space-y-1">
                    <strong className="text-gray-900 font-bold block">
                      Notificações Push e Alertas WhatsApp
                    </strong>
                    <p className="text-gray-600">
                      Alertas instantâneos no celular quando alguém der um lance maior ou cobrir seu desejo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Em Desenvolvimento (Expansão & Escala) */}
              <div className="bg-white rounded-3xl border-2 border-purple-300 p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-olx-purple" />
                    <h3 className="text-base font-black text-purple-950 uppercase tracking-wider">
                      🟣 Em Desenvolvimento
                    </h3>
                  </div>
                  <span className="bg-purple-100 text-olx-purple text-[10px] font-black px-2 py-0.5 rounded-full">
                    Escala
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1">
                    <strong className="text-gray-900 font-bold block flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-olx-purple" />
                      Dashboard Analítico CNPJ (R$ 9,90/mês)
                    </strong>
                    <p className="text-gray-600">
                      Painel B2B com inteligência de dados, buscas sem estoque e contato direto com lista de desejos.
                    </p>
                  </div>

                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1">
                    <strong className="text-gray-900 font-bold block flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-olx-purple" />
                      Logística com Código PIN e Vídeo Unboxing
                    </strong>
                    <p className="text-gray-600">
                      Frete integrado exclusivo para CNPJ com liberação imediata pós-avaliação ou em 7 dias.
                    </p>
                  </div>

                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1">
                    <strong className="text-gray-900 font-bold block flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-olx-purple" />
                      Match Duplo Automático (&ldquo;Tinder de Trocas&rdquo;)
                    </strong>
                    <p className="text-gray-600">
                      Algoritmo cruza automaticamente o que você tem e quer trocar com quem procura o seu item na mesma cidade.
                    </p>
                  </div>

                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1">
                    <strong className="text-gray-900 font-bold block flex items-center gap-1.5">
                      <FileVideo className="w-3.5 h-3.5 text-olx-purple" />
                      Micro-Vídeos de 7 Segundos
                    </strong>
                    <p className="text-gray-600">
                      Demonstração rápida do funcionamento de motores, telas e instrumentos nos anúncios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: ÁREA LOJISTA CNPJ — R$ 9,90/MÊS */}
        {/* ========================================================================= */}
        {activeTab === 'lojistas' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Header da Landing Page B2B */}
            <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 text-white rounded-3xl p-8 sm:p-12 border border-gray-800 shadow-xl space-y-6">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs font-black text-emerald-400">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>B2B Data & Analytics TroqJá</span>
              </div>

              <div className="space-y-3 max-w-3xl">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Pare de anunciar no escuro. Acesse a{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                    demanda real de clientes da sua cidade.
                  </span>
                </h2>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  Por apenas <strong>R$ 9,90/mês</strong>, sua loja tem acesso a um painel analítico com volume
                  de buscas da região, itens procurados com zero estoque no mercado e contato direto com quem já cadastrou
                  o que quer comprar na Lista de Desejos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Sem venda casada de pacotes caros</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Cancele a qualquer momento</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Frete CNPJ com Código PIN e Vídeo de Abertura</span>
                </div>
              </div>
            </div>

            {/* MOCKUP VISUAL INTERATIVO DO DASHBOARD CNPJ (5 MÓDULOS) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                    Demonstração Visual Interativa
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    Os 5 Módulos Exclusivos do Dashboard CNPJ
                  </h3>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full self-start sm:self-auto">
                  Exclusivo Assinantes R$ 9,90/mês
                </span>
              </div>

              {/* Moldura do Dashboard Mockup */}
              <div className="bg-slate-950 rounded-3xl border-2 border-emerald-500/40 p-5 sm:p-8 shadow-2xl text-white space-y-6">
                {/* Barra de Topo do Painel */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-gray-950 font-black flex items-center justify-center text-sm">
                      TJ
                    </div>
                    <div>
                      <span className="font-extrabold text-white block">Painel Executivo CNPJ • TroqJá Analytics</span>
                      <span className="text-gray-400 text-[11px]">Filtro Ativo: Região Metropolitana de São Paulo e Campinas</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-emerald-400 font-bold text-[11px]">Dados Atualizados em Tempo Real</span>
                  </div>
                </div>

                {/* Grade dos 5 Módulos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Módulo 1: Top Produtos Mais Pesquisados na Região */}
                  <div className="bg-gray-900/90 rounded-2xl border border-gray-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-400" />
                        1. Top Buscas na Região
                      </span>
                      <span className="text-[10px] text-gray-400">Últimos 7 dias</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-gray-300 font-semibold mb-1">
                          <span>iPhone 13 / 14 128GB</span>
                          <span className="text-orange-400 font-bold">4.280 buscas</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-gray-300 font-semibold mb-1">
                          <span>Honda CG 160 Fan / Titan</span>
                          <span className="text-orange-400 font-bold">3.150 buscas</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: '78%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-gray-300 font-semibold mb-1">
                          <span>PlayStation 5 Slim 1TB</span>
                          <span className="text-orange-400 font-bold">2.490 buscas</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: '64%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Módulo 2: Acesso Direto à Lista de Desejos dos Clientes */}
                  <div className="bg-gray-900/90 rounded-2xl border border-gray-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-emerald-400" />
                        2. Lista de Desejos Direta
                      </span>
                      <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        Leads Prontos
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-gray-800/80 rounded-xl space-y-1">
                        <div className="flex justify-between font-bold text-gray-200">
                          <span>Ricardo M. (Campinas, SP)</span>
                          <span className="text-emerald-400">Até R$ 2.800</span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Procura: <strong>iPhone 13 128GB com caixa e bateria &gt; 85%</strong>
                        </p>
                        <span className="inline-block text-[10px] text-emerald-400 font-semibold hover:underline cursor-pointer">
                          ⚡ Enviar oferta direta da sua loja →
                        </span>
                      </div>

                      <div className="p-2.5 bg-gray-800/80 rounded-xl space-y-1">
                        <div className="flex justify-between font-bold text-gray-200">
                          <span>Camila S. (São Paulo, SP)</span>
                          <span className="text-emerald-400">Até R$ 3.200</span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Procura: <strong>PlayStation 5 com 2 controles</strong>
                        </p>
                        <span className="inline-block text-[10px] text-emerald-400 font-semibold hover:underline cursor-pointer">
                          ⚡ Enviar oferta direta da sua loja →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Módulo 3: Radar de Demanda Reprimida ("Busca Sem Estoque") */}
                  <div className="bg-gray-900/90 rounded-2xl border border-gray-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        3. Demanda Sem Estoque
                      </span>
                      <span className="bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        Zero Concorrência
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-snug">
                      Itens com centenas de buscas na cidade e <strong>zero anúncios ativos</strong>. Excelente para girar estoque:
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-amber-950/30 border border-amber-900/50 rounded-xl">
                        <div className="flex justify-between text-gray-200 font-bold">
                          <span>Drone DJI Mini 4 Pro</span>
                          <span className="text-amber-400 font-extrabold">340 buscas / 0 anúncios</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Região: Campinas e RMC</span>
                      </div>

                      <div className="p-2.5 bg-amber-950/30 border border-amber-900/50 rounded-xl">
                        <div className="flex justify-between text-gray-200 font-bold">
                          <span>Placa de Vídeo RTX 4070 Super</span>
                          <span className="text-amber-400 font-extrabold">215 buscas / 0 anúncios</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Região: Baixada Santista</span>
                      </div>
                    </div>
                  </div>

                  {/* Módulo 4: Termômetro de Preço Médio Real de Fechamento */}
                  <div className="bg-gray-900/90 rounded-2xl border border-gray-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        4. Preço Real de Fechamento
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-snug">
                      Veja por quanto os concorrentes estão anunciando vs. o valor exato pelo qual o produto realmente fecha:
                    </p>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-2.5 bg-gray-800/80 rounded-xl space-y-1">
                        <div className="font-bold text-gray-200">iPhone 13 128GB Seminovo</div>
                        <div className="flex justify-between text-[11px] pt-1">
                          <span className="text-gray-400">Preço Anunciado Médio: <strong className="text-gray-200">R$ 3.100</strong></span>
                          <span className="text-emerald-400">Preço Fechado: <strong className="text-emerald-300">R$ 2.850</strong></span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-gray-800/80 rounded-xl space-y-1">
                        <div className="font-bold text-gray-200">Honda CG 160 Fan 2022</div>
                        <div className="flex justify-between text-[11px] pt-1">
                          <span className="text-gray-400">Preço Anunciado Médio: <strong className="text-gray-200">R$ 15.800</strong></span>
                          <span className="text-emerald-400">Preço Fechado: <strong className="text-emerald-300">R$ 15.100</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Módulo 5: Mapa de Calor por Bairro e Horários de Pico */}
                  <div className="md:col-span-2 bg-gray-900/90 rounded-2xl border border-gray-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-purple-400" />
                        5. Mapa de Calor por Bairro & Horários de Pico de Lances
                      </span>
                      <span className="text-[10px] text-gray-400">Distribuição Geográfica</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2 p-3 bg-gray-800/70 rounded-xl">
                        <strong className="text-gray-200 block text-[11px] uppercase tracking-wider">
                          Bairros com Maior Volume de Compras:
                        </strong>
                        <ul className="space-y-1 text-gray-300 text-[11px]">
                          <li className="flex justify-between"><span>1. Pinheiros / Vila Madalena (SP)</span><span className="text-purple-400 font-bold">28%</span></li>
                          <li className="flex justify-between"><span>2. Cambuí / Taquaral (Campinas)</span><span className="text-purple-400 font-bold">22%</span></li>
                          <li className="flex justify-between"><span>3. Tatuapé / Mooca (SP)</span><span className="text-purple-400 font-bold">19%</span></li>
                        </ul>
                      </div>

                      <div className="space-y-2 p-3 bg-gray-800/70 rounded-xl">
                        <strong className="text-gray-200 block text-[11px] uppercase tracking-wider">
                          Horários com Maior Disputa de Leilões:
                        </strong>
                        <ul className="space-y-1 text-gray-300 text-[11px]">
                          <li className="flex justify-between"><span>1. Seg a Sex: 19h30 às 22h00</span><span className="text-orange-400 font-bold">Pico Máximo</span></li>
                          <li className="flex justify-between"><span>2. Domingo: 18h00 às 21h30</span><span className="text-orange-400 font-bold">Alta Disputa</span></li>
                          <li className="flex justify-between"><span>3. Intervalo Almoço: 12h30 às 13h30</span><span className="text-emerald-400 font-bold">Foco Tech</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BENEFÍCIO ADICIONAL: LOGÍSTICA BLINDADA EXCLUSIVA CNPJ */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    Logística Integrada com Custódia Segura para Produtos Novos
                  </h3>
                  <p className="text-xs text-gray-500">
                    Exclusivo para empresas CNPJ vendendo produtos novos com envio para todo o Brasil
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700 leading-relaxed">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <strong className="text-gray-900 font-bold text-sm block">1. Frete Calculado Automático</strong>
                  <p>
                    O cliente calcula o frete diretamente na página do anúncio e paga junto com o valor da compra.
                    A plataforma gera a etiqueta dos Correios ou transportadora parceira.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <strong className="text-gray-900 font-bold text-sm block">2. Liberação Dupla de Saldo</strong>
                  <p>
                    O lojista recebe a liberação <strong>imediata</strong> assim que o cliente confirma e avalia a compra,
                    ou liberação <strong>automática em 7 dias corridos</strong> após a entrega confirmada pela transportadora.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <strong className="text-gray-900 font-bold text-sm block">3. Código PIN + Vídeo Unboxing</strong>
                  <p>
                    O comprador confirma o recebimento com o código PIN gerado pelo aplicativo e é orientado a gravar a abertura
                    do pacote lacrado, garantindo proteção jurídica total contra fraudes ao lojista.
                  </p>
                </div>
              </div>
            </div>

            {/* FORMULÁRIO DE PRÉ-CADASTRO CNPJ */}
            <div id="cadastro-cnpj" className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-3xl border-2 border-emerald-300 p-8 sm:p-10 shadow-lg space-y-6">
              <div className="max-w-2xl mx-auto text-center space-y-2">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Fila Prioritária de Lançamento
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  Cadastre sua Empresa no Painel Lojista CNPJ
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Garanta a tarifa de <strong>apenas R$ 9,90/mês</strong> vitalícia e seja um dos primeiros lojistas
                  a ter acesso aos dados da sua cidade.
                </p>
              </div>

              {cnpjCadastrado ? (
                <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border-2 border-emerald-500 text-center space-y-4 shadow-sm animate-scaleIn">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-emerald-950">
                      ✅ Seu CNPJ foi registrado na fila prioritária do Dashboard Analítico TroqJá (R$ 9,90/mês)!
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Razão Social: <strong>{razaoSocial}</strong> • CNPJ: <strong>{cnpj}</strong>
                    </p>
                    <p className="text-xs text-emerald-800 font-medium">
                      Nossa equipe B2B entrará em contato via WhatsApp ({whatsapp}) para liberar seu acesso antecipado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCnpjCadastrado(false)}
                    className="text-xs text-emerald-700 font-bold hover:underline pt-2 block mx-auto"
                  >
                    Editar dados ou cadastrar outro CNPJ
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCadastrarCNPJ} className="max-w-xl mx-auto space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-emerald-200 shadow-sm">
                  {erroForm && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                      {erroForm}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Razão Social ou Nome Fantasia *
                    </label>
                    <input
                      type="text"
                      required
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      placeholder="Ex: TechStore Comércio de Eletrônicos Ltda"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        CNPJ da Empresa *
                      </label>
                      <input
                        type="text"
                        required
                        value={cnpj}
                        onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        WhatsApp Comercial *
                      </label>
                      <input
                        type="text"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(formatTelefone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Segmento Principal de Atuação
                    </label>
                    <select
                      value={segmento}
                      onChange={(e) => setSegmento(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option value="Eletrônicos e Celulares">Eletrônicos, Celulares e Computadores</option>
                      <option value="Autopeças e Veículos">Autopeças, Pneus e Acessórios Automotivos</option>
                      <option value="Games e Consoles">Games, Consoles e Colecionáveis</option>
                      <option value="Casa, Decoração e Eletro">Casa, Móveis e Eletrodomésticos</option>
                      <option value="Moda, Roupas e Calçados">Moda, Calçados e Artigos Esportivos</option>
                      <option value="Instrumentos e Música">Instrumentos Musicais e Áudio Profissional</option>
                      <option value="Outros Segmentos">Outros Segmentos no Varejo</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition shadow-md flex items-center justify-center gap-2"
                    >
                      <BadgeCheck className="w-5 h-5" />
                      <span>Garantir Vaga no Painel Lojista (R$ 9,90/mês)</span>
                    </button>
                    <p className="text-[11px] text-gray-500 text-center mt-2">
                      Sem taxa de adesão imediata. Você só começa a pagar quando seu painel for ativado.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SobrePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-sm text-gray-500 font-medium">Carregando portal institucional...</p>
        </div>
      }
    >
      <SobreContent />
    </Suspense>
  );
}
