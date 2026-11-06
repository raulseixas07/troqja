'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { buscarAnuncios, buscarDestaquesVitrine, SUPABASE_TABLES, formatBRL } from '@olx-clone/shared';
import type { AnuncioCard, Categoria } from '@olx-clone/shared';
import { AdCard } from '@/components/AdCard';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import {
  Search,
  SlidersHorizontal,
  X,
  Filter,
  Loader2,
  ArrowUpDown,
  Tag,
  Building2,
  DollarSign,
  ChevronRight,
  PackageSearch,
  Gavel,
  ArrowLeftRight,
} from 'lucide-react';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function BuscaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parâmetros da URL
  const queryParam = searchParams.get('q') || '';
  const categoriaParam = searchParams.get('categoria') || '';
  const estadoParam = searchParams.get('estado') || '';
  const cidadeParam = searchParams.get('cidade') || '';
  const precoMinParam = searchParams.get('preco_min') || '';
  const precoMaxParam = searchParams.get('preco_max') || '';
  const tipoParam = (searchParams.get('tipo') as 'todos' | 'venda' | 'leilao' | 'troca') || 'todos';
  const ordemParam = (searchParams.get('ordem') as 'recentes' | 'menor_preco' | 'maior_preco') || 'recentes';

  // Estados locais do formulário de filtros
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string>(categoriaParam);
  const [selectedEstado, setSelectedEstado] = useState<string>(estadoParam);
  const [cidadeInput, setCidadeInput] = useState<string>(cidadeParam);
  const [precoMin, setPrecoMin] = useState<string>(precoMinParam);
  const [precoMax, setPrecoMax] = useState<string>(precoMaxParam);
  const [tipo, setTipo] = useState<'todos' | 'venda' | 'leilao' | 'troca'>(tipoParam);
  const [ordem, setOrdem] = useState<'recentes' | 'menor_preco' | 'maior_preco'>(ordemParam);

  // Controle de interface mobile
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Resultados
  const [anuncios, setAnuncios] = useState<AnuncioCard[]>([]);
  const [totalResultados, setTotalResultados] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [destaques, setDestaques] = useState<AnuncioCard[]>([]);

  // Carrega Destaques da Vitrine (Opção A Global + Opção B Categoria correspondente)
  useEffect(() => {
    async function carregarDestaquesVitrine() {
      const { destaques: vitrineDestaques } = await buscarDestaquesVitrine(supabase, {
        categoria_slug: categoriaParam || undefined,
        limite: 16,
      });
      setDestaques(vitrineDestaques);
    }
    carregarDestaquesVitrine();
  }, [categoriaParam]);

  // Sincroniza estados caso a URL mude externamente (ex: voltar/avançar no navegador)
  useEffect(() => {
    setSearchTerm(queryParam);
    setSelectedCategoria(categoriaParam);
    setSelectedEstado(estadoParam);
    setCidadeInput(cidadeParam);
    setPrecoMin(precoMinParam);
    setPrecoMax(precoMaxParam);
    setTipo(tipoParam);
    setOrdem(ordemParam);
  }, [queryParam, categoriaParam, estadoParam, cidadeParam, precoMinParam, precoMaxParam, tipoParam, ordemParam]);

  // Carrega categorias do banco de dados
  useEffect(() => {
    async function carregarCategorias() {
      const { data } = await supabase
        .from(SUPABASE_TABLES.CATEGORIAS)
        .select('*')
        .order('ordem', { ascending: true });
      if (data && data.length > 0) {
        setCategorias(data);
      }
    }
    carregarCategorias();
  }, []);

  // Executa busca com base nos filtros da URL
  const executarBusca = useCallback(async () => {
    setLoading(true);

    const minNum = precoMinParam ? Number(precoMinParam) : undefined;
    const maxNum = precoMaxParam ? Number(precoMaxParam) : undefined;

    const modalidadeFiltro = tipoParam === 'venda' ? 'venda' : tipoParam === 'leilao' ? 'leilao' : tipoParam === 'troca' ? 'troca' : undefined;
    const aceitaTrocaFiltro = tipoParam === 'troca' ? true : undefined;

    const { anuncios: resultados, total } = await buscarAnuncios(supabase, {
      termo: queryParam || undefined,
      categoria_slug: categoriaParam || undefined,
      estado: estadoParam || undefined,
      cidade: cidadeParam || undefined,
      preco_min: minNum,
      preco_max: maxNum,
      modalidade: modalidadeFiltro,
      aceita_troca: aceitaTrocaFiltro,
      ordenacao: ordemParam,
      status: 'ativo',
    });

    setAnuncios(resultados);
    setTotalResultados(total);
    setLoading(false);
  }, [queryParam, categoriaParam, estadoParam, cidadeParam, precoMinParam, precoMaxParam, tipoParam, ordemParam]);

  useEffect(() => {
    executarBusca();
  }, [executarBusca]);

  // Atualiza parâmetros na URL
  const aplicarFiltros = (novosFiltros?: Partial<{
    q: string;
    categoria: string;
    estado: string;
    cidade: string;
    preco_min: string;
    preco_max: string;
    tipo: 'todos' | 'venda' | 'leilao' | 'troca';
    ordem: string;
  }>) => {
    const params = new URLSearchParams();

    const q = novosFiltros?.q !== undefined ? novosFiltros.q : searchTerm;
    const cat = novosFiltros?.categoria !== undefined ? novosFiltros.categoria : selectedCategoria;
    const est = novosFiltros?.estado !== undefined ? novosFiltros.estado : selectedEstado;
    const cid = novosFiltros?.cidade !== undefined ? novosFiltros.cidade : cidadeInput;
    const pMin = novosFiltros?.preco_min !== undefined ? novosFiltros.preco_min : precoMin;
    const pMax = novosFiltros?.preco_max !== undefined ? novosFiltros.preco_max : precoMax;
    const tip = novosFiltros?.tipo !== undefined ? novosFiltros.tipo : tipo;
    const ord = novosFiltros?.ordem !== undefined ? novosFiltros.ordem : ordem;

    if (q.trim()) params.set('q', q.trim());
    if (cat.trim()) params.set('categoria', cat.trim());
    if (est.trim()) params.set('estado', est.trim().toUpperCase());
    if (cid.trim()) params.set('cidade', cid.trim());
    if (pMin.trim() && !isNaN(Number(pMin))) params.set('preco_min', pMin.trim());
    if (pMax.trim() && !isNaN(Number(pMax))) params.set('preco_max', pMax.trim());
    if (tip && tip !== 'todos') params.set('tipo', tip);
    if (ord && ord !== 'recentes') params.set('ordem', ord);

    const queryString = params.toString();
    router.push(queryString ? `/busca?${queryString}` : '/busca');
    setMobileFiltersOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    aplicarFiltros({ q: searchTerm });
  };

  const limparTodosFiltros = () => {
    setSearchTerm('');
    setSelectedCategoria('');
    setSelectedEstado('');
    setCidadeInput('');
    setPrecoMin('');
    setPrecoMax('');
    setTipo('todos');
    setOrdem('recentes');
    router.push('/busca');
    setMobileFiltersOpen(false);
  };

  // Categoria ativa (nome amigável)
  const categoriaAtiva = categorias.find(
    (c) => c.slug === selectedCategoria || c.id === selectedCategoria
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Barra de Busca e Atalhos no Topo da Página */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="O que você está procurando? Ex: iPhone, Sofá, Corolla..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-olx-purple focus:ring-1 focus:ring-olx-purple outline-none transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  aplicarFiltros({ q: '' });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-olx-purple hover:bg-olx-purple-hover text-white text-sm font-bold px-6 py-3 rounded-xl transition shadow-xs shrink-0 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>

        {/* Filtros Rápidos (Todos, Venda Direta, Leilões, Aceita Troca) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          <button
            type="button"
            onClick={() => aplicarFiltros({ tipo: 'todos' })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              tipo === 'todos'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => aplicarFiltros({ tipo: 'venda' })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              tipo === 'venda'
                ? 'bg-olx-purple text-white shadow-xs'
                : 'bg-purple-50 text-olx-purple hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Venda Direta
          </button>
          <button
            type="button"
            onClick={() => aplicarFiltros({ tipo: 'leilao' })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              tipo === 'leilao'
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            Leilões
          </button>
          <button
            type="button"
            onClick={() => aplicarFiltros({ tipo: 'troca' })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              tipo === 'troca'
                ? 'bg-[#00C853] text-white shadow-xs'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Aceita Troca
          </button>
        </div>

        {/* Resumo da Busca & Botão de Filtros no Mobile */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-bold text-gray-900">{totalResultados}</span>
            <span>
              {totalResultados === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
              {queryParam ? ` para "${queryParam}"` : ''}
              {categoriaAtiva ? ` em ${categoriaAtiva.nome}` : ''}
              {estadoParam ? ` (${estadoParam})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Filtros Mobile */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-olx-purple" />
              <span>Filtros</span>
            </button>

            {/* Ordenação */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden sm:inline font-semibold">Ordenar por:</span>
              <select
                value={ordem}
                onChange={(e) => {
                  const val = e.target.value as 'recentes' | 'menor_preco' | 'maior_preco';
                  setOrdem(val);
                  aplicarFiltros({ ordem: val });
                }}
                className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-olx-purple"
              >
                <option value="recentes">Mais recentes</option>
                <option value="menor_preco">Menor preço</option>
                <option value="maior_preco">Maior preço</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chips de Filtros Ativos */}
        {(queryParam || categoriaParam || estadoParam || cidadeParam || precoMinParam || precoMaxParam || (tipoParam && tipoParam !== 'todos')) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
              Filtros ativos:
            </span>

            {tipoParam && tipoParam !== 'todos' && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-olx-purple border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span>
                  Tipo: {tipoParam === 'venda' ? 'Venda Direta' : tipoParam === 'leilao' ? 'Leilões' : 'Aceita Troca'}
                </span>
                <button
                  type="button"
                  onClick={() => aplicarFiltros({ tipo: 'todos' })}
                  className="hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {queryParam && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-olx-purple border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span>Termo: &ldquo;{queryParam}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => aplicarFiltros({ q: '' })}
                  className="hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {categoriaAtiva && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-olx-purple border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span>Categoria: {categoriaAtiva.nome}</span>
                <button
                  type="button"
                  onClick={() => aplicarFiltros({ categoria: '' })}
                  className="hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {estadoParam && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-olx-purple border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span>Estado: {estadoParam}</span>
                <button
                  type="button"
                  onClick={() => aplicarFiltros({ estado: '' })}
                  className="hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {cidadeParam && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-olx-purple border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span>Cidade: {cidadeParam}</span>
                <button
                  type="button"
                  onClick={() => aplicarFiltros({ cidade: '' })}
                  className="hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(precoMinParam || precoMaxParam) && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-olx-purple border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span>
                  Preço: {precoMinParam ? formatBRL(Number(precoMinParam)) : 'R$ 0'} até{' '}
                  {precoMaxParam ? formatBRL(Number(precoMaxParam)) : 'Sem limite'}
                </span>
                <button
                  type="button"
                  onClick={() => aplicarFiltros({ preco_min: '', preco_max: '' })}
                  className="hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={limparTodosFiltros}
              className="text-xs font-bold text-red-600 hover:text-red-700 underline ml-2"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* Layout Principal: Painel Lateral de Filtros + Grid de Anúncios */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Painel Lateral Desktop */}
        <aside className="hidden lg:block bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-6 sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-olx-purple" />
              <span>Filtros</span>
            </h2>
            <button
              type="button"
              onClick={limparTodosFiltros}
              className="text-xs font-semibold text-gray-500 hover:text-olx-purple"
            >
              Limpar
            </button>
          </div>

          {/* Categorias */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span>Categorias</span>
            </h3>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => aplicarFiltros({ categoria: '' })}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                  !selectedCategoria
                    ? 'bg-purple-50 text-olx-purple font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Todas as categorias</span>
                {!selectedCategoria && <ChevronRight className="w-3 h-3 text-olx-purple" />}
              </button>
              {categorias.map((cat) => {
                const isSelected = selectedCategoria === cat.slug || selectedCategoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => aplicarFiltros({ categoria: cat.slug })}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-50 text-olx-purple font-bold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{cat.nome}</span>
                    {isSelected && <ChevronRight className="w-3 h-3 text-olx-purple" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Localização (Estado e Cidade) */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Localização</span>
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Estado (UF)
              </label>
              <select
                value={selectedEstado}
                onChange={(e) => {
                  setSelectedEstado(e.target.value);
                  aplicarFiltros({ estado: e.target.value });
                }}
                className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-olx-purple"
              >
                <option value="">Todo o Brasil</option>
                {ESTADOS_BRASIL.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Cidade
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={cidadeInput}
                  onChange={(e) => setCidadeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      aplicarFiltros({ cidade: cidadeInput });
                    }
                  }}
                  placeholder="Ex: São Paulo"
                  className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-olx-purple"
                />
                <button
                  type="button"
                  onClick={() => aplicarFiltros({ cidade: cidadeInput })}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>

          {/* Faixa de Preço */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
              <span>Faixa de Preço (R$)</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  value={precoMin}
                  onChange={(e) => setPrecoMin(e.target.value)}
                  placeholder="Mínimo"
                  className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-olx-purple"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={precoMax}
                  onChange={(e) => setPrecoMax(e.target.value)}
                  placeholder="Máximo"
                  className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-olx-purple"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => aplicarFiltros({ preco_min: precoMin, preco_max: precoMax })}
              className="w-full bg-purple-50 hover:bg-purple-100 text-olx-purple border border-purple-200 text-xs font-bold py-2 rounded-lg transition"
            >
              Aplicar Preço
            </button>
          </div>
        </aside>

        {/* Modal de Filtros Mobile */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs lg:hidden flex justify-end animate-fadeIn">
            <div className="w-full max-w-xs bg-white h-full p-5 overflow-y-auto space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-olx-purple" />
                  <span>Filtros de Busca</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Categorias Mobile */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase">Categoria</h3>
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-olx-purple"
                >
                  <option value="">Todas as categorias</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Localização Mobile */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase">Localização</h3>
                <select
                  value={selectedEstado}
                  onChange={(e) => setSelectedEstado(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-olx-purple"
                >
                  <option value="">Todo o Brasil</option>
                  {ESTADOS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={cidadeInput}
                  onChange={(e) => setCidadeInput(e.target.value)}
                  placeholder="Cidade"
                  className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-olx-purple"
                />
              </div>

              {/* Preço Mobile */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase">Preço (R$)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={precoMin}
                    onChange={(e) => setPrecoMin(e.target.value)}
                    placeholder="Mínimo"
                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-olx-purple"
                  />
                  <input
                    type="number"
                    value={precoMax}
                    onChange={(e) => setPrecoMax(e.target.value)}
                    placeholder="Máximo"
                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-olx-purple"
                  />
                </div>
              </div>

              {/* Botões de Ação Mobile */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button
                  type="button"
                  onClick={() => aplicarFiltros()}
                  className="w-full bg-olx-purple hover:bg-olx-purple-hover text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition"
                >
                  Aplicar Filtros
                </button>
                <button
                  type="button"
                  onClick={limparTodosFiltros}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition"
                >
                  Limpar Todos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grade de Resultados */}
        <main className="lg:col-span-3 space-y-6">
          {/* Carrossel Horizontal Suave de Destaques (Opção A Global + Opção B Categoria correspondente) */}
          {!loading && destaques.length > 0 && (
            <FeaturedCarousel
              anuncios={destaques}
              titulo={
                categoriaAtiva
                  ? `Destaques em ${categoriaAtiva.nome}`
                  : 'Vitrine de Destaques em Evidência'
              }
              subtitulo={
                categoriaAtiva
                  ? `Anúncios com Destaque Global e destaques exclusivos de ${categoriaAtiva.nome}`
                  : 'Anúncios turbinados com alcance máximo e prioridade'
              }
            />
          )}

          {loading ? (
            <div className="min-h-[40vh] bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-olx-purple animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Buscando anúncios...</p>
            </div>
          ) : anuncios.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-purple-50 text-olx-purple rounded-full flex items-center justify-center mx-auto">
                <PackageSearch className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-gray-900">Nenhum anúncio encontrado</h3>
                <p className="text-xs text-gray-500">
                  Não encontramos nenhum resultado com os filtros selecionados. Tente buscar por termos mais genéricos ou limpar os filtros.
                </p>
              </div>
              <button
                type="button"
                onClick={limparTodosFiltros}
                className="inline-flex items-center gap-2 bg-olx-purple hover:bg-olx-purple-hover text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xs transition"
              >
                <span>Limpar filtros e ver todos</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {anuncios.map((ad) => (
                <AdCard key={ad.id} anuncio={ad} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function BuscaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-olx-purple animate-spin" />
          <p className="text-sm text-gray-500">Carregando anúncios...</p>
        </div>
      }
    >
      <BuscaContent />
    </Suspense>
  );
}
