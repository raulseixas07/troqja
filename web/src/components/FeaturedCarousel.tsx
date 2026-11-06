'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { AnuncioCard } from '@olx-clone/shared';
import { AdCard } from './AdCard';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface FeaturedCarouselProps {
  anuncios: AnuncioCard[];
  titulo?: string;
  subtitulo?: string;
}

export function FeaturedCarousel({
  anuncios,
  titulo = 'Vitrine de Destaques',
  subtitulo = 'Anúncios turbinados com alcance máximo e visibilidade prioritária',
}: FeaturedCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, anuncios]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = containerRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -320 : 320;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (!anuncios || anuncios.length === 0) {
    return null;
  }

  return (
    <section className="relative bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-orange-500/10 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
      {/* Cabeçalho do Carrossel com Botões de Navegação */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center text-amber-950 shadow-2xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                {titulo}
              </h2>
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                VIP
              </span>
            </div>
            {subtitulo && (
              <p className="text-xs text-gray-500 hidden sm:block">
                {subtitulo}
              </p>
            )}
          </div>
        </div>

        {/* Botões Circulares de Navegação (< e >) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Rolar para esquerda"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 shadow-xs flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:border-amber-400 transition transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Rolar para direita"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 shadow-xs flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:border-amber-400 transition transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      </div>

      {/* Faixa Horizontal Compacta com Rolagem Suave */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-4 no-scrollbar pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {anuncios.map((ad) => (
          <div
            key={ad.id}
            className="w-[230px] sm:w-[260px] shrink-0 snap-start"
          >
            <AdCard anuncio={ad} />
          </div>
        ))}
      </div>
    </section>
  );
}
