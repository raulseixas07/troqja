import React from 'react';
import Link from 'next/link';
import {
  Car,
  Home,
  Smartphone,
  Armchair,
  Shirt,
  Music,
  Bike,
  Briefcase,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  nome: string;
  slug: string;
  icon: LucideIcon;
}

const CATEGORIES: CategoryItem[] = [
  { id: '1', nome: 'Autos e peças', slug: 'autos-e-pecas', icon: Car },
  { id: '2', nome: 'Imóveis', slug: 'imoveis', icon: Home },
  { id: '3', nome: 'Eletrônicos', slug: 'eletronicos-e-celulares', icon: Smartphone },
  { id: '4', nome: 'Para sua casa', slug: 'para-a-sua-casa', icon: Armchair },
  { id: '5', nome: 'Moda e beleza', slug: 'moda-e-beleza', icon: Shirt },
  { id: '6', nome: 'Música e hobbies', slug: 'musica-e-hobbies', icon: Music },
  { id: '7', nome: 'Esportes e lazer', slug: 'esportes-e-lazer', icon: Bike },
  { id: '8', nome: 'Vagas de emprego', slug: 'vagas-de-emprego', icon: Briefcase },
  { id: '9', nome: 'Serviços', slug: 'servicos-e-outros', icon: Wrench },
];

interface CategoryGridProps {
  activeTipo?: string;
}

export function CategoryGrid({ activeTipo = 'todos' }: CategoryGridProps) {
  return (
    <section className="py-2">
      {/* Cabeçalho Flexível Alinhado nas Extremidades */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* Lado Esquerdo: Título */}
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Categorias Populares</h2>

        {/* Lado Direito: Grupo de Botões Estilo Pílula (Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {/* 1. Todos */}
          <Link
            href="/?tipo=todos"
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition shrink-0 ${
              activeTipo === 'todos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'border border-gray-200 bg-gray-50/80 text-gray-700 hover:bg-gray-100 font-medium'
            }`}
          >
            Todos
          </Link>

          {/* 2. 🏷️ Venda Direta */}
          <Link
            href="/?tipo=venda"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition shrink-0 flex items-center gap-1.5 ${
              activeTipo === 'venda'
                ? 'bg-purple-700 text-white font-semibold shadow-xs'
                : 'border border-purple-200 bg-purple-50/60 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <span>🏷️ Venda Direta</span>
          </Link>

          {/* 3. 🔨 Leilões */}
          <Link
            href="/?tipo=leilao"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition shrink-0 flex items-center gap-1.5 ${
              activeTipo === 'leilao'
                ? 'bg-[#FF6B00] text-white font-semibold shadow-xs'
                : 'border border-orange-200 bg-orange-50/60 text-orange-700 hover:bg-orange-100'
            }`}
          >
            <span>🔨 Leilões</span>
          </Link>

          {/* 4. 🔄 Aceita Troca */}
          <Link
            href="/?tipo=troca"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition shrink-0 flex items-center gap-1.5 ${
              activeTipo === 'troca'
                ? 'bg-[#00C853] text-white font-semibold shadow-xs'
                : 'border border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <span>🔄 Aceita Troca</span>
          </Link>

          {/* 5. Ver todos → */}
          <Link
            href="/busca"
            className="text-purple-600 hover:text-purple-800 font-semibold text-sm ml-1 transition shrink-0 inline-flex items-center gap-0.5"
          >
            <span>Ver todos</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Grid de Ícones de Categorias Logo Abaixo */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="flex flex-col items-center p-3 rounded-xl bg-white border border-gray-100 shadow-2xs hover:shadow-md hover:border-olx-purple/30 transition text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-olx-purple transition mb-2">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-olx-purple line-clamp-2">
                {cat.nome}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
