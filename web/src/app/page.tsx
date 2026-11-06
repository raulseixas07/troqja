import React from 'react';
import { CategoryGrid } from '@/components/CategoryGrid';
import { AdCard } from '@/components/AdCard';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import type { AnuncioCard } from '@olx-clone/shared';
import { supabase } from '@/lib/supabase';
import { SUPABASE_TABLES } from '@olx-clone/shared';
import Link from 'next/link';
import { Sparkles, ArrowRight, Gavel, ArrowLeftRight, ShoppingBag } from 'lucide-react';

// Mocks Enriquecidos por Modalidade para garantir vitrines completas e atraentes
const MOCK_DESTAQUES: AnuncioCard[] = [
  {
    id: 'destaque-1',
    titulo: 'iPhone 15 Pro Max 256GB Titânio Natural - Bateria 100% Impecável',
    preco: 6499,
    modalidade: 'venda',
    destacado_vitrine: true,
    tipo_destaque: 'global',
    cidade: 'São Paulo',
    estado: 'SP',
    bairro: 'Jardins',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Eletrônicos e celulares',
  },
  {
    id: 'destaque-2',
    titulo: 'BMW 320i M Sport 2023 - IPVA Pago Único Dono',
    preco: 289900,
    modalidade: 'venda',
    aceita_troca: true,
    itens_troca: 'Aceito SUV menor valor',
    destacado_vitrine: true,
    tipo_destaque: 'global',
    cidade: 'Curitiba',
    estado: 'PR',
    bairro: 'Batel',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Autos e peças',
  },
  {
    id: 'destaque-3',
    titulo: 'MacBook Pro 16" M3 Pro 36GB RAM 512GB SSD Espaço Preto',
    preco: 14500,
    modalidade: 'leilao',
    lance_inicial: 11000,
    lance_atual: 13200,
    incremento_minimo: 100,
    leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    destacado_vitrine: true,
    tipo_destaque: 'categoria',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    bairro: 'Barra da Tijuca',
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Eletrônicos e celulares',
  },
  {
    id: 'destaque-4',
    titulo: 'PlayStation 5 Slim 1TB + 2 Controles DualSense + 4 Jogos Físicos',
    preco: 3450,
    modalidade: 'troca',
    aceita_troca: true,
    itens_troca: 'Troco por Notebook Gamer ou Nintendo Switch OLED + volta',
    destacado_vitrine: true,
    tipo_destaque: 'categoria',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    bairro: 'Savassi',
    created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Games',
  },
  {
    id: 'destaque-5',
    titulo: 'Drone DJI Mini 4 Pro Fly More Combo Plus com Tela RC 2',
    preco: 6200,
    modalidade: 'venda',
    destacado_vitrine: true,
    tipo_destaque: 'global',
    cidade: 'Campinas',
    estado: 'SP',
    bairro: 'Cambuí',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Câmeras e drones',
  },
];

const MOCK_LEILOES: AnuncioCard[] = [
  {
    id: 'leilao-1',
    titulo: 'iPhone 13 128GB Meia-Noite - Saúde da Bateria 89%',
    preco: 2850,
    modalidade: 'leilao',
    aceita_troca: true,
    itens_troca: 'Aceito iPhone 12 + volta ou notebook Dell',
    lance_inicial: 2000,
    lance_atual: 2850,
    incremento_minimo: 50,
    leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 14).toISOString(),
    cidade: 'São Paulo',
    estado: 'SP',
    bairro: 'Pinheiros',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Eletrônicos e celulares',
  },
  {
    id: 'leilao-2',
    titulo: 'PlayStation 5 Disc Edition com 2 Controles e 3 Jogos',
    preco: 3200,
    modalidade: 'leilao',
    aceita_troca: false,
    lance_inicial: 2500,
    lance_atual: 3200,
    incremento_minimo: 50,
    leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    cidade: 'Santos',
    estado: 'SP',
    bairro: 'Gonzaga',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Games',
  },
  {
    id: 'leilao-3',
    titulo: 'Guitarra Fender Stratocaster Player Series México Sunburst',
    preco: 4600,
    modalidade: 'leilao',
    aceita_troca: false,
    lance_inicial: 3800,
    lance_atual: 4450,
    incremento_minimo: 50,
    leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(),
    cidade: 'Curitiba',
    estado: 'PR',
    bairro: 'Centro Cívico',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Música e hobbies',
  },
  {
    id: 'leilao-4',
    titulo: 'Bicicleta Scott Scale 970 Aro 29 Shimano Deore 12V',
    preco: 5800,
    modalidade: 'leilao',
    aceita_troca: true,
    itens_troca: 'Aceito bike speed ou iPhone 14',
    lance_inicial: 4500,
    lance_atual: 5300,
    incremento_minimo: 100,
    leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
    cidade: 'Florianópolis',
    estado: 'SC',
    bairro: 'Lagoa',
    created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Esportes e fitness',
  },
];

const MOCK_PERMUTAS: AnuncioCard[] = [
  {
    id: 'troca-1',
    titulo: 'iPad Air 5 64GB M1 Azul Impecável com Apple Pencil 2',
    preco: 3800,
    modalidade: 'troca',
    aceita_troca: true,
    itens_troca: 'Troco por MacBook Air M1 ou Galaxy Tab S9',
    condicao_troca: 'pau_a_pau',
    cidade: 'Porto Alegre',
    estado: 'RS',
    bairro: 'Moinhos de Vento',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Eletrônicos e celulares',
  },
  {
    id: 'troca-2',
    titulo: 'Nintendo Switch OLED 64GB Branco Completo na Caixa',
    preco: 1950,
    modalidade: 'troca',
    aceita_troca: true,
    itens_troca: 'Aceito Xbox Series S ou celular Samsung linha S',
    condicao_troca: 'aceita_volta',
    cidade: 'São Paulo',
    estado: 'SP',
    bairro: 'Tatuapé',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Games',
  },
  {
    id: 'troca-3',
    titulo: 'Câmera Canon EOS R50 Mirrorless 4K Lente 18-45mm',
    preco: 4200,
    modalidade: 'troca',
    aceita_troca: true,
    itens_troca: 'Troco por lente Sony GM ou drone DJI',
    condicao_troca: 'da_volta',
    cidade: 'Campinas',
    estado: 'SP',
    bairro: 'Taquaral',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Câmeras e drones',
  },
  {
    id: 'troca-4',
    titulo: 'Relógio Smartwatch Garmin Fenix 7 Sapphire Solar Titânio',
    preco: 3900,
    modalidade: 'troca',
    aceita_troca: true,
    itens_troca: 'Troco por Apple Watch Ultra ou bike speed',
    condicao_troca: 'pau_a_pau',
    cidade: 'Joinville',
    estado: 'SC',
    bairro: 'América',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Esportes e fitness',
  },
];

const MOCK_VENDA_DIRETA: AnuncioCard[] = [
  {
    id: 'venda-1',
    titulo: 'Honda Civic 2.0 EXL Automático 2020 Impecável Revisado',
    preco: 98900,
    modalidade: 'venda',
    cidade: 'Campinas',
    estado: 'SP',
    bairro: 'Cambuí',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Autos e peças',
  },
  {
    id: 'venda-2',
    titulo: 'Sofá Retrátil e Reclinável 3 Lugares Suede Bege Premium',
    preco: 1200,
    modalidade: 'venda',
    cidade: 'São Bernardo',
    estado: 'SP',
    bairro: 'Rudge Ramos',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Casa e decoração',
  },
  {
    id: 'venda-3',
    titulo: 'Smart TV Samsung 65" QLED 4K Q60C Pontos Quânticos',
    preco: 3499,
    modalidade: 'venda',
    cidade: 'Ribeirão Preto',
    estado: 'SP',
    bairro: 'Jardim Botânico',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Eletrônicos e celulares',
  },
  {
    id: 'venda-4',
    titulo: 'Cafeteira Espresso Automática DeLonghi Magnifica S Inox',
    preco: 2390,
    modalidade: 'venda',
    cidade: 'Curitiba',
    estado: 'PR',
    bairro: 'Água Verde',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Casa e decoração',
  },
];

function mapDbToCard(item: any): AnuncioCard {
  const fotosList = (item.fotos as { url: string; is_principal: boolean }[]) || [];
  const principal = fotosList.find((f) => f.is_principal)?.url || fotosList[0]?.url || null;
  const cat = item.categoria as { nome: string } | null;

  return {
    id: item.id,
    titulo: item.titulo,
    preco: Number(item.preco),
    cidade: item.cidade,
    estado: item.estado,
    bairro: item.bairro,
    created_at: item.created_at,
    foto_principal_url: principal,
    categoria_nome: cat?.nome,
    modalidade: item.modalidade || 'venda',
    aceita_troca: Boolean(item.aceita_troca),
    itens_troca: item.itens_troca || null,
    condicao_troca: item.condicao_troca || null,
    destacado_vitrine: Boolean(item.destacado_vitrine),
    tipo_destaque: item.tipo_destaque || null,
    lance_inicial: item.lance_inicial != null ? Number(item.lance_inicial) : null,
    lance_atual: item.lance_atual != null ? Number(item.lance_atual) : null,
    incremento_minimo: item.incremento_minimo != null ? Number(item.incremento_minimo) : 10,
    leilao_encerramento: item.leilao_encerramento || null,
  };
}

async function getHomeSectionsData() {
  try {
    // 1. Destaques para o Carrossel Superior (destacado_vitrine = true)
    const { data: destaquesData } = await supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .select(`
        id, titulo, preco, modalidade, aceita_troca, itens_troca, condicao_troca,
        destacado_vitrine, tipo_destaque, lance_inicial, lance_atual, incremento_minimo,
        leilao_encerramento, cidade, estado, bairro, created_at,
        categoria:categorias(nome),
        fotos:fotos_anuncio(url, is_principal)
      `)
      .eq('status', 'ativo')
      .eq('destacado_vitrine', true)
      .order('tipo_destaque', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(16);

    // 2. Leilões em Tempo Real
    const { data: leiloesData } = await supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .select(`
        id, titulo, preco, modalidade, aceita_troca, itens_troca, condicao_troca,
        destacado_vitrine, tipo_destaque, lance_inicial, lance_atual, incremento_minimo,
        leilao_encerramento, cidade, estado, bairro, created_at,
        categoria:categorias(nome),
        fotos:fotos_anuncio(url, is_principal)
      `)
      .eq('status', 'ativo')
      .eq('modalidade', 'leilao')
      .order('created_at', { ascending: false })
      .limit(4);

    // 3. Oportunidades de Troca-Troca / Permutas
    const { data: permutasData } = await supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .select(`
        id, titulo, preco, modalidade, aceita_troca, itens_troca, condicao_troca,
        destacado_vitrine, tipo_destaque, lance_inicial, lance_atual, incremento_minimo,
        leilao_encerramento, cidade, estado, bairro, created_at,
        categoria:categorias(nome),
        fotos:fotos_anuncio(url, is_principal)
      `)
      .eq('status', 'ativo')
      .or('modalidade.eq.troca,aceita_troca.eq.true')
      .order('created_at', { ascending: false })
      .limit(4);

    // 4. Venda Direta / Recentes
    const { data: vendasData } = await supabase
      .from(SUPABASE_TABLES.ANUNCIOS)
      .select(`
        id, titulo, preco, modalidade, aceita_troca, itens_troca, condicao_troca,
        destacado_vitrine, tipo_destaque, lance_inicial, lance_atual, incremento_minimo,
        leilao_encerramento, cidade, estado, bairro, created_at,
        categoria:categorias(nome),
        fotos:fotos_anuncio(url, is_principal)
      `)
      .eq('status', 'ativo')
      .eq('modalidade', 'venda')
      .order('created_at', { ascending: false })
      .limit(4);

    return {
      destaques: destaquesData && destaquesData.length > 0 ? destaquesData.map(mapDbToCard) : MOCK_DESTAQUES,
      leiloes: leiloesData && leiloesData.length > 0 ? leiloesData.map(mapDbToCard) : MOCK_LEILOES,
      permutas: permutasData && permutasData.length > 0 ? permutasData.map(mapDbToCard) : MOCK_PERMUTAS,
      vendaDireta: vendasData && vendasData.length > 0 ? vendasData.map(mapDbToCard) : MOCK_VENDA_DIRETA,
    };
  } catch (err) {
    console.warn('Erro ao carregar dados reais do Supabase, utilizando mock enriquecido:', err);
    return {
      destaques: MOCK_DESTAQUES,
      leiloes: MOCK_LEILOES,
      permutas: MOCK_PERMUTAS,
      vendaDireta: MOCK_VENDA_DIRETA,
    };
  }
}

interface HomePageProps {
  searchParams?: {
    tipo?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const activeTipo = searchParams?.tipo || 'todos';
  const { destaques, leiloes, permutas, vendaDireta } = await getHomeSectionsData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      {/* Banner Promocional TroqJá */}
      <div className="rounded-2xl bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-gray-800 p-6 sm:p-10 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-olx-orange/15 border border-olx-orange/30 px-3 py-1 rounded-full text-xs font-bold text-olx-orange backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TroqJá • Anunciou, trocou, fechou!</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Compre, venda ou troque no <span className="text-olx-orange">TroqJá</span>!
          </h1>
          <p className="text-sm sm:text-base text-gray-300">
            A forma mais rápida, segura e transparente de negociar o que você não usa mais. Anuncie grátis e feche negócio hoje mesmo.
          </p>
          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <Link
              href="/anunciar"
              className="inline-flex items-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white font-extrabold px-6 py-3 rounded-full shadow-md transition transform active:scale-95 text-sm"
            >
              <span>Inserir anúncio grátis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/desejos"
              className="inline-flex items-center gap-2 bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-extrabold px-5 py-3 rounded-full transition text-sm backdrop-blur-xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Lista de Desejos & Radar VIP</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 1. Categorias Populares + Botões de Modalidade na mesma linha */}
      <CategoryGrid activeTipo={activeTipo} />

      {/* 2. Topo: Carrossel Horizontal Suave de Anúncios em Destaque (com botões < e >) */}
      <FeaturedCarousel
        anuncios={destaques}
        titulo="👑 Vitrine de Destaques em Evidência"
        subtitulo="Os anúncios mais procurados com visibilidade máxima na plataforma"
      />

      {/* 3. Logo Abaixo (Vitrine de Leilões): Leilões em Tempo Real (Quem Dá Mais) em 4 Colunas */}
      {(activeTipo === 'todos' || activeTipo === 'leilao') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-orange-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-black shadow-xs">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                    🔨 Leilões em Tempo Real (Quem Dá Mais)
                  </h2>
                  <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Ao Vivo
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Disputas acirradas com cronômetro regressivo e lances em tempo real. Dê o seu lance!
                </p>
              </div>
            </div>

            <Link
              href="/busca?tipo=leilao"
              className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1 group bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition border border-orange-200"
            >
              <span>Ver todos os leilões</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* 4 Colunas Lado a Lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {leiloes.map((ad) => (
              <AdCard key={ad.id} anuncio={ad} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Logo Abaixo (Vitrine de Permutas): Oportunidades de Troca-Troca em 4 Colunas */}
      {(activeTipo === 'todos' || activeTipo === 'troca') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-green-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00C853] text-white flex items-center justify-center font-black shadow-xs">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                    🔄 Oportunidades de Troca-Troca / Aceita Troca
                  </h2>
                  <span className="bg-[#00C853] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Permuta
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Negocie sem dinheiro vivo! Ofertas com valor base e itens que o anunciante aceita receber.
                </p>
              </div>
            </div>

            <Link
              href="/busca?tipo=troca"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 group bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition border border-emerald-200"
            >
              <span>Ver todas as permutas</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* 4 Colunas Lado a Lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {permutas.map((ad) => (
              <AdCard key={ad.id} anuncio={ad} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Logo Abaixo (Vitrine Venda Direta): Demais Anúncios Recentes em 4 Colunas */}
      {(activeTipo === 'todos' || activeTipo === 'venda') && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-purple-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-olx-purple text-white flex items-center justify-center font-black shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                    🏷️ Venda Direta & Recentes
                  </h2>
                  <span className="bg-purple-100 text-olx-purple text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Preço Fixo
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Produtos selecionados para compra direta com negociação rápida.
                </p>
              </div>
            </div>

            <Link
              href="/busca?tipo=venda"
              className="text-xs font-bold text-olx-purple hover:underline flex items-center gap-1 group bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition border border-purple-200"
            >
              <span>Ver todas as vendas</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* 4 Colunas Lado a Lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {vendaDireta.map((ad) => (
              <AdCard key={ad.id} anuncio={ad} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
