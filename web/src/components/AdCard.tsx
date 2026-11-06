import React from 'react';
import Link from 'next/link';
import {
  formatCurrencyBRL,
  formatRelativeDate,
  formatCountdown,
  type AnuncioCard,
} from '@olx-clone/shared';
import { MapPin, ImageOff, Gavel, ArrowLeftRight, Clock } from 'lucide-react';

interface AdCardProps {
  anuncio: AnuncioCard;
}

export function AdCard({ anuncio }: AdCardProps) {
  const isLeilao = anuncio.modalidade === 'leilao';
  const isTrocaModalidade = anuncio.modalidade === 'troca';
  const aceitaTroca = Boolean(anuncio.aceita_troca) || isTrocaModalidade;
  const countdown = isLeilao ? formatCountdown(anuncio.leilao_encerramento) : null;
  const precoExibicao = isLeilao
    ? anuncio.lance_atual || anuncio.lance_inicial || anuncio.preco
    : anuncio.preco;

  return (
    <Link
      href={`/anuncio/${anuncio.id}`}
      className={`group flex flex-col bg-white rounded-xl overflow-hidden transition-all duration-200 relative ${
        anuncio.destacado_vitrine
          ? anuncio.tipo_destaque === 'global'
            ? 'border-2 border-amber-400 shadow-md ring-2 ring-amber-300/50 hover:shadow-xl hover:border-amber-500'
            : 'border-2 border-orange-400 shadow-md ring-2 ring-orange-200/50 hover:shadow-xl hover:border-orange-500'
          : 'border border-gray-200 shadow-2xs hover:shadow-lg'
      }`}
    >
      {/* Imagem do Anúncio (WebP) - Proporção Quadrada Padronizada Obrigatória */}
      <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
        {anuncio.foto_principal_url ? (
          <img
            src={anuncio.foto_principal_url}
            alt={anuncio.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <ImageOff className="w-8 h-8 mb-1" />
            <span className="text-xs">Sem foto</span>
          </div>
        )}

        {/* Badges Flutuantes no Topo da Foto */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1.5 pointer-events-none">
          {anuncio.destacado_vitrine && (
            anuncio.tipo_destaque === 'global' ? (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 text-[10px] sm:text-[11px] font-black px-2 sm:px-2.5 py-0.5 rounded-md shadow-md ring-1 ring-yellow-200 uppercase tracking-wider">
                <span>👑 DESTAQUE GLOBAL</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white text-[10px] sm:text-[11px] font-black px-2 sm:px-2.5 py-0.5 rounded-md shadow-md ring-1 ring-orange-300 uppercase tracking-wider">
                <span>🔥 DESTAQUE</span>
              </span>
            )
          )}

          {isLeilao && (
            <span
              className="inline-flex items-center gap-1 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs animate-pulse"
              style={{ backgroundColor: '#FF6B00' }}
            >
              <Gavel className="w-3 h-3" />
              <span>Leilão Ativo</span>
            </span>
          )}

          {isTrocaModalidade ? (
            <span
              className="inline-flex items-center gap-1 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs"
              style={{ backgroundColor: '#00C853' }}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Troca-Troca</span>
            </span>
          ) : aceitaTroca && (
            <span
              className="inline-flex items-center gap-1 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs"
              style={{ backgroundColor: '#00C853' }}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Aceita Troca</span>
            </span>
          )}
        </div>

        {anuncio.categoria_nome && (
          <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
            {anuncio.categoria_nome}
          </span>
        )}

        {isLeilao && countdown && (
          <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-orange-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>{countdown.formatted}</span>
          </span>
        )}
      </div>

      {/* Conteúdo do Card */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-olx-purple transition mb-1">
            {anuncio.titulo}
          </h3>

          <div>
            {isLeilao ? (
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-orange-600 block">
                  Lance Atual
                </span>
                <p className="text-lg font-extrabold text-orange-600">
                  {formatCurrencyBRL(precoExibicao)}
                </p>
              </div>
            ) : isTrocaModalidade ? (
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">
                  Base de Troca
                </span>
                <p className="text-lg font-extrabold text-gray-900">
                  {formatCurrencyBRL(precoExibicao)}
                </p>
              </div>
            ) : (
              <p className="text-lg font-extrabold text-gray-900">
                {formatCurrencyBRL(precoExibicao)}
              </p>
            )}
          </div>

          {aceitaTroca && anuncio.itens_troca && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-100">
              <span className="font-extrabold shrink-0">Troca:</span>
              <span className="truncate">{anuncio.itens_troca}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-2">
          <div className="flex items-center gap-1 truncate max-w-[65%]">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{anuncio.cidade}, {anuncio.estado}</span>
          </div>
          <span className="shrink-0">{formatRelativeDate(anuncio.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
