'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Handshake,
  Radio,
  ShieldCheck,
  Home,
  Wrench,
  Armchair,
  Briefcase,
  Baby,
  Music,
  Users,
  Camera,
  Car,
  Smartphone,
  Bike,
  Shirt,
  PawPrint,
  Factory,
  Store,
  Gamepad2,
  ChevronDown,
  ChevronUp,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
} from 'lucide-react';

const TERMOS_MAIS_PROCURADOS = [
  'Apple Watch',
  'Ar Condicionado',
  'Bicicleta',
  'Câmera de Segurança',
  'Computador',
  'iPhone 11',
  'iPhone 12',
  'iPhone 13',
  'iPhone 14 Pro',
  'iPhone 15',
  'JBL',
  'MacBook',
  'Moto',
  'Nintendo Switch',
  'Notebook Dell',
  'PlayStation 5',
  'Samsung S23',
  'Smart TV',
  'Tablet 8 Polegadas',
  'Xbox Series X',
];

const LETRAS_ALFABETO = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

const CATEGORIAS_CIRCULOS = [
  { nome: 'Imóveis', slug: 'imoveis', icon: Home, cor: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100' },
  { nome: 'Autopeças', slug: 'autos-e-pecas', icon: Wrench, cor: 'text-amber-600 bg-amber-50 group-hover:bg-amber-100' },
  { nome: 'Casa e Decoração', slug: 'para-a-sua-casa', icon: Armchair, cor: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' },
  { nome: 'Serviços', slug: 'servicos-e-outros', icon: Briefcase, cor: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100' },
  { nome: 'Artigos Infantis', query: 'infantil', icon: Baby, cor: 'text-pink-600 bg-pink-50 group-hover:bg-pink-100' },
  { nome: 'Música e Hobbies', slug: 'musica-e-hobbies', icon: Music, cor: 'text-purple-600 bg-purple-50 group-hover:bg-purple-100' },
  { nome: 'Vagas de Emprego', slug: 'vagas-de-emprego', icon: Users, cor: 'text-cyan-600 bg-cyan-50 group-hover:bg-cyan-100' },
  { nome: 'Câmeras e Drones', query: 'cameras drones', icon: Camera, cor: 'text-red-600 bg-red-50 group-hover:bg-red-100' },
  { nome: 'Autos', slug: 'autos-e-pecas', icon: Car, cor: 'text-orange-600 bg-orange-50 group-hover:bg-orange-100' },
  { nome: 'Celulares e Tel.', slug: 'eletronicos-e-celulares', icon: Smartphone, cor: 'text-violet-600 bg-violet-50 group-hover:bg-violet-100' },
  { nome: 'Esportes e Fitness', slug: 'esportes-e-lazer', icon: Bike, cor: 'text-green-600 bg-green-50 group-hover:bg-green-100' },
  { nome: 'Moda e Beleza', slug: 'moda-e-beleza', icon: Shirt, cor: 'text-rose-600 bg-rose-50 group-hover:bg-rose-100' },
  { nome: 'Animais de Estimação', query: 'animais pet', icon: PawPrint, cor: 'text-yellow-600 bg-yellow-50 group-hover:bg-yellow-100' },
  { nome: 'Agro e Indústria', query: 'agro industria', icon: Factory, cor: 'text-lime-700 bg-lime-50 group-hover:bg-lime-100' },
  { nome: 'Comércio', query: 'comercio', icon: Store, cor: 'text-teal-600 bg-teal-50 group-hover:bg-teal-100' },
  { nome: 'Games', query: 'games consoles', icon: Gamepad2, cor: 'text-purple-600 bg-purple-50 group-hover:bg-purple-100' },
];

export function Footer() {
  const [activeTab, setActiveTab] = useState<'categorias' | 'pesquisas' | 'links'>('categorias');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <footer className="mt-16 bg-white border-t border-gray-200">
      {/* 1. SEÇÃO ESTILO MERCADO LIVRE: 3 COLUNAS COM ÍCONES GRANDES E DIVISÓRIAS VERTICAIS */}
      <div className="border-b border-gray-200 bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {/* Coluna 1: Escolha como negociar */}
            <div className="flex items-start gap-4 p-4 sm:p-6 text-left">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0 shadow-2xs">
                <Handshake className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-gray-900">
                  Escolha como negociar
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Negocie do seu jeito: <strong>Venda Direta</strong> por preço fixo, <strong>Leilão em Tempo Real</strong> (Quem Dá Mais) com lances ao vivo, ou <strong>Troca-Troca / Permuta</strong> sem gastar dinheiro.
                </p>
                <Link
                  href="/busca"
                  className="text-xs font-bold text-[#FF6B00] hover:underline inline-block pt-1"
                >
                  Explorar modalidades de negociação →
                </Link>
              </div>
            </div>

            {/* Coluna 2: Radar VIP na sua Lista de Desejos */}
            <div className="flex items-start gap-4 p-4 sm:p-6 text-left">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Radio className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-gray-900">
                    Radar VIP na Lista de Desejos
                  </h3>
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                    R$ 1,99/mês
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Cadastre o que você procura e nosso radar inteligente avisa no segundo exato em que um anúncio correspondente for publicado na sua região.
                </p>
                <Link
                  href="/desejos"
                  className="text-xs font-bold text-emerald-700 hover:underline inline-block pt-1"
                >
                  Ativar meu Radar VIP agora →
                </Link>
              </div>
            </div>

            {/* Coluna 3: Segurança, do início ao fim */}
            <div className="flex items-start gap-4 p-4 sm:p-6 text-left">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-olx-purple flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-gray-900">
                  Segurança, do início ao fim
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Perfis verificados, avaliações por estrelas com reputação transparente e bate-papo criptografado em tempo real com fotos WebP protegidas.
                </p>
                <span className="text-xs font-bold text-olx-purple inline-block pt-1">
                  Transparência e confiança total
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO ESTILO OLX: GRADE DE CATEGORIAS ILUSTRADAS EM CÍRCULOS (2 LINHAS DE 8 CÍRCULOS = 16) */}
      <div className="border-b border-gray-200 py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
              Navegue pelas Categorias Mais Populares
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Encontre o que você precisa em poucos cliques
            </p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
            {CATEGORIAS_CIRCULOS.map((item, idx) => {
              const Icon = item.icon;
              const href = item.slug ? `/categoria/${item.slug}` : `/busca?q=${encodeURIComponent(item.query || item.nome)}`;
              return (
                <Link
                  key={idx}
                  href={href}
                  className="group flex flex-col items-center text-center p-2 rounded-xl transition hover:bg-gray-50"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs mb-2 ${item.cor}`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-700 group-hover:text-olx-purple transition line-clamp-2">
                    {item.nome}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SEÇÃO ESTILO MERCADO LIVRE: TERMOS MAIS PROCURADOS & PESQUISE POR LETRA INICIAL */}
      <div className="border-b border-gray-200 py-8 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Termos mais procurados */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
              Termos mais procurados:
            </h4>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-gray-600">
              {TERMOS_MAIS_PROCURADOS.map((termo, index) => (
                <React.Fragment key={termo}>
                  <Link
                    href={`/busca?q=${encodeURIComponent(termo)}`}
                    className="hover:text-olx-purple hover:underline transition font-medium"
                  >
                    {termo}
                  </Link>
                  {index < TERMOS_MAIS_PROCURADOS.length - 1 && (
                    <span className="text-gray-300 select-none">-</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Pesquise produto por letra inicial */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
              Pesquise produto por letra inicial:
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              {LETRAS_ALFABETO.map((letra) => (
                <Link
                  key={letra}
                  href={`/busca?q=${letra}`}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-gray-200 hover:border-olx-purple hover:bg-purple-50 text-gray-700 hover:text-olx-purple font-black flex items-center justify-center transition shadow-2xs"
                >
                  {letra}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO ESTILO OLX: SISTEMA DE 3 ABAS CLICÁVEIS COM GRADE DE 5 COLUNAS E BOTÃO RETRÁTIL */}
      <div className="py-8 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cabeçalho das 3 Abas */}
          <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-8 border-b border-gray-200 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('categorias')}
              className={`text-sm font-black pb-1.5 transition border-b-2 ${
                activeTab === 'categorias'
                  ? 'border-olx-purple text-olx-purple'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Categorias Principais
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pesquisas')}
              className={`text-sm font-black pb-1.5 transition border-b-2 ${
                activeTab === 'pesquisas'
                  ? 'border-olx-purple text-olx-purple'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Pesquisas Populares
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`text-sm font-black pb-1.5 transition border-b-2 ${
                activeTab === 'links'
                  ? 'border-olx-purple text-olx-purple'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Links Úteis & Ajuda
            </button>
          </div>

          {/* Conteúdo Retrátil das Abas em 5 Colunas */}
          {isExpanded && (
            <div className="py-6 animate-fadeIn">
              {activeTab === 'categorias' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-xs text-gray-600">
                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Veículos</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?categoria=autos-e-pecas" className="hover:text-olx-purple hover:underline">Carros Usados</Link></li>
                      <li><Link href="/busca?q=motos" className="hover:text-olx-purple hover:underline">Motos</Link></li>
                      <li><Link href="/busca?q=caminhoes" className="hover:text-olx-purple hover:underline">Caminhões</Link></li>
                      <li><Link href="/busca?q=pecas" className="hover:text-olx-purple hover:underline">Peças e Acessórios</Link></li>
                      <li><Link href="/busca?q=pneus" className="hover:text-olx-purple hover:underline">Pneus e Rodas</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Imóveis</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?categoria=imoveis" className="hover:text-olx-purple hover:underline">Apartamentos</Link></li>
                      <li><Link href="/busca?categoria=imoveis" className="hover:text-olx-purple hover:underline">Casas à Venda</Link></li>
                      <li><Link href="/busca?q=aluguel" className="hover:text-olx-purple hover:underline">Aluguel de Temporada</Link></li>
                      <li><Link href="/busca?q=terrenos" className="hover:text-olx-purple hover:underline">Terrenos e Lotes</Link></li>
                      <li><Link href="/busca?q=comercial" className="hover:text-olx-purple hover:underline">Salas Comerciais</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Eletrônicos</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?categoria=eletronicos-e-celulares" className="hover:text-olx-purple hover:underline">Smartphones</Link></li>
                      <li><Link href="/busca?q=notebook" className="hover:text-olx-purple hover:underline">Notebooks</Link></li>
                      <li><Link href="/busca?q=tv" className="hover:text-olx-purple hover:underline">Smart TVs</Link></li>
                      <li><Link href="/busca?q=tablets" className="hover:text-olx-purple hover:underline">Tablets</Link></li>
                      <li><Link href="/busca?q=smartwatch" className="hover:text-olx-purple hover:underline">Smartwatches</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Casa & Móveis</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?categoria=para-a-sua-casa" className="hover:text-olx-purple hover:underline">Sofás e Poltronas</Link></li>
                      <li><Link href="/busca?categoria=para-a-sua-casa" className="hover:text-olx-purple hover:underline">Eletrodomésticos</Link></li>
                      <li><Link href="/busca?q=geladeira" className="hover:text-olx-purple hover:underline">Geladeiras</Link></li>
                      <li><Link href="/busca?q=cama" className="hover:text-olx-purple hover:underline">Camas e Colchões</Link></li>
                      <li><Link href="/busca?q=armarios" className="hover:text-olx-purple hover:underline">Armários e Guarda-Roupas</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Lazer & Games</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?q=playstation" className="hover:text-olx-purple hover:underline">PlayStation 5</Link></li>
                      <li><Link href="/busca?q=xbox" className="hover:text-olx-purple hover:underline">Xbox Series X</Link></li>
                      <li><Link href="/busca?q=nintendo" className="hover:text-olx-purple hover:underline">Nintendo Switch</Link></li>
                      <li><Link href="/busca?categoria=esportes-e-lazer" className="hover:text-olx-purple hover:underline">Bicicletas e Acessórios</Link></li>
                      <li><Link href="/busca?categoria=musica-e-hobbies" className="hover:text-olx-purple hover:underline">Instrumentos Musicais</Link></li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'pesquisas' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-xs text-gray-600">
                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Mais Buscados Tech</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?q=iPhone+15" className="hover:text-olx-purple hover:underline">iPhone 15 Pro</Link></li>
                      <li><Link href="/busca?q=MacBook+Air" className="hover:text-olx-purple hover:underline">MacBook Air M2</Link></li>
                      <li><Link href="/busca?q=Samsung+S24" className="hover:text-olx-purple hover:underline">Samsung Galaxy S24</Link></li>
                      <li><Link href="/busca?q=iPad+Air" className="hover:text-olx-purple hover:underline">iPad Air 5</Link></li>
                      <li><Link href="/busca?q=AirPods" className="hover:text-olx-purple hover:underline">AirPods Pro</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Carros Mais Desejados</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?q=Civic" className="hover:text-olx-purple hover:underline">Honda Civic</Link></li>
                      <li><Link href="/busca?q=Corolla" className="hover:text-olx-purple hover:underline">Toyota Corolla</Link></li>
                      <li><Link href="/busca?q=Onix" className="hover:text-olx-purple hover:underline">Chevrolet Onix</Link></li>
                      <li><Link href="/busca?q=HB20" className="hover:text-olx-purple hover:underline">Hyundai HB20</Link></li>
                      <li><Link href="/busca?q=Renegade" className="hover:text-olx-purple hover:underline">Jeep Renegade</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Consoles & Jogos</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?q=PS5" className="hover:text-olx-purple hover:underline">PS5 Slim</Link></li>
                      <li><Link href="/busca?q=Nintendo+Switch+OLED" className="hover:text-olx-purple hover:underline">Switch OLED</Link></li>
                      <li><Link href="/busca?q=Xbox+Series+S" className="hover:text-olx-purple hover:underline">Xbox Series S</Link></li>
                      <li><Link href="/busca?q=PC+Gamer" className="hover:text-olx-purple hover:underline">PC Gamer Completo</Link></li>
                      <li><Link href="/busca?q=Steam+Deck" className="hover:text-olx-purple hover:underline">Steam Deck</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Permutas Populares</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?tipo=troca&q=iphone" className="hover:text-olx-purple hover:underline">Troca de iPhone</Link></li>
                      <li><Link href="/busca?tipo=troca&q=moto" className="hover:text-olx-purple hover:underline">Moto na Troca</Link></li>
                      <li><Link href="/busca?tipo=troca&q=notebook" className="hover:text-olx-purple hover:underline">Troca por Notebook</Link></li>
                      <li><Link href="/busca?tipo=troca&q=carro" className="hover:text-olx-purple hover:underline">Aceita Carro</Link></li>
                      <li><Link href="/busca?tipo=troca&q=ps5" className="hover:text-olx-purple hover:underline">Troco PS5</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Leilões Quentes</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/busca?tipo=leilao" className="hover:text-olx-purple hover:underline">Leilões de Eletrônicos</Link></li>
                      <li><Link href="/busca?tipo=leilao" className="hover:text-olx-purple hover:underline">Leilões de Veículos</Link></li>
                      <li><Link href="/busca?tipo=leilao" className="hover:text-olx-purple hover:underline">Leilões de Games</Link></li>
                      <li><Link href="/busca?tipo=leilao" className="hover:text-olx-purple hover:underline">Lances a partir de R$ 10</Link></li>
                      <li><Link href="/busca?tipo=leilao" className="hover:text-olx-purple hover:underline">Terminando Hoje</Link></li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'links' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-xs text-gray-600">
                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Sobre Nós</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/" className="hover:text-olx-purple hover:underline">Quem Somos</Link></li>
                      <li><Link href="/anunciar" className="hover:text-olx-purple hover:underline">Como Anunciar</Link></li>
                      <li><Link href="/desejos" className="hover:text-olx-purple hover:underline">Lista de Desejos</Link></li>
                      <li><Link href="/busca" className="hover:text-olx-purple hover:underline">Mapa do Site</Link></li>
                      <li><span className="text-gray-400">Trabalhe Conosco</span></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Segurança</h5>
                    <ul className="space-y-1.5">
                      <li><span className="hover:text-olx-purple cursor-pointer">Dicas de Segurança</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Como Evitar Golpes</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Compre com Tranquilidade</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Denunciar Anúncio</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Proteção de Dados (LGPD)</span></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Para Anunciantes</h5>
                    <ul className="space-y-1.5">
                      <li><Link href="/anunciar" className="hover:text-olx-purple hover:underline">Inserir Anúncio Grátis</Link></li>
                      <li><Link href="/conta/meus-anuncios" className="hover:text-olx-purple hover:underline">Meus Anúncios</Link></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Planos de Destaque</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Regras de Publicação</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Central do Vendedor</span></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Termos Legais</h5>
                    <ul className="space-y-1.5">
                      <li><span className="hover:text-olx-purple cursor-pointer">Termos de Uso</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Políticas de Privacidade</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Políticas de Cookies</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Regras da Comunidade</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Código de Defesa do Consumidor</span></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Atendimento</h5>
                    <ul className="space-y-1.5">
                      <li><span className="hover:text-olx-purple cursor-pointer">Central de Ajuda</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Fale Conosco</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Perguntas Frequentes</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Ouvidoria</span></li>
                      <li><span className="hover:text-olx-purple cursor-pointer">Status do Sistema</span></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão Retrátil Centralizado "Mais informações ^ / v" */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-olx-purple bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-full transition"
            >
              <span>{isExpanded ? 'Menos informações' : 'Mais informações'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. RODAPÉ INSTITUCIONAL TROQJÁ: LINKS HORIZONTAIS, REDES SOCIAIS E COPYRIGHT */}
      <div className="bg-gray-900 text-gray-300 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-gray-800">
            {/* Logo TroqJá e Slogan */}
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl font-black tracking-tight">
                Troq<span className="text-olx-orange">Já</span>
              </span>
              <span className="text-gray-600 font-light text-xl">|</span>
              <span className="italic font-medium text-gray-300 text-sm">
                &ldquo;Anunciou, trocou, fechou!&rdquo;
              </span>
            </div>

            {/* Links Horizontais Institucionais */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center text-xs text-gray-400">
              <Link href="/" className="hover:text-white transition">Sobre nós</Link>
              <Link href="/anunciar" className="hover:text-white transition">Como funciona</Link>
              <Link href="/desejos" className="hover:text-white transition">Radar VIP</Link>
              <span className="hover:text-white transition cursor-pointer">Termos de uso</span>
              <span className="hover:text-white transition cursor-pointer">Privacidade</span>
              <span className="hover:text-white transition cursor-pointer">Segurança</span>
            </div>

            {/* Redes Sociais */}
            <div className="flex items-center gap-3 text-gray-400">
              <span className="w-8 h-8 rounded-full bg-gray-800 hover:bg-olx-purple hover:text-white flex items-center justify-center transition cursor-pointer">
                <Instagram className="w-4 h-4" />
              </span>
              <span className="w-8 h-8 rounded-full bg-gray-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition cursor-pointer">
                <Facebook className="w-4 h-4" />
              </span>
              <span className="w-8 h-8 rounded-full bg-gray-800 hover:bg-sky-500 hover:text-white flex items-center justify-center transition cursor-pointer">
                <Twitter className="w-4 h-4" />
              </span>
              <span className="w-8 h-8 rounded-full bg-gray-800 hover:bg-red-600 hover:text-white flex items-center justify-center transition cursor-pointer">
                <Youtube className="w-4 h-4" />
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2 text-center sm:text-left">
            <p>
              © 2026 TroqJá - &ldquo;Anunciou, trocou, fechou!&rdquo;. Todos os direitos reservados.
            </p>
            <p className="text-[11px] text-gray-600">
              Plataforma de Classificados, Leilões em Tempo Real e Permutas Inteligentes.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
