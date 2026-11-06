'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  buscarMeusAnuncios,
  atualizarStatusAnuncio,
  excluirAnuncio,
  destacarAnuncioVitrine,
  fecharNegocioAnuncio,
  buscarInteressadosConversaAnuncio,
  type InteressadoNegocio,
  formatBRL,
  formatRelativeDate,
  SUPABASE_TABLES,
} from '@olx-clone/shared';
import type { MeuAnuncioItem, StatusAnuncio } from '@olx-clone/shared';
import {
  Package,
  PlusCircle,
  Eye,
  Calendar,
  MapPin,
  Trash2,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Sparkles,
  Check,
  Handshake,
  X,
  User,
} from 'lucide-react';

type TabStatus = 'todos' | 'ativo' | 'pausado' | 'vendido';

export default function MeusAnunciosPage() {
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const [anuncios, setAnuncios] = useState<MeuAnuncioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>('todos');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal de confirmação de exclusão
  const [adToDelete, setAdToDelete] = useState<MeuAnuncioItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal de Destaque de Vitrine (Pay-per-Highlight)
  const [adToHighlight, setAdToHighlight] = useState<MeuAnuncioItem | null>(null);
  const [opcaoHighlight, setOpcaoHighlight] = useState<'avulso' | 'pacote_10' | 'credito'>('avulso');
  const [isHighlighting, setIsHighlighting] = useState(false);

  // Modal de Fechamento de Negócio (Venda/Troca/Leilão)
  const [adToCloseDeal, setAdToCloseDeal] = useState<MeuAnuncioItem | null>(null);
  const [interessados, setInteressados] = useState<InteressadoNegocio[]>([]);
  const [loadingInteressados, setLoadingInteressados] = useState(false);
  const [compradorSelecionadoId, setCompradorSelecionadoId] = useState<string | null>(null);
  const [tipoFechamentoModal, setTipoFechamentoModal] = useState<'venda' | 'troca' | 'leilao'>('venda');
  const [fechandoNegocio, setFechandoNegocio] = useState(false);

  // Mensagem de feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const carregarAnuncios = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { anuncios: lista, error } = await buscarMeusAnuncios(supabase, user.id);
    if (!error) {
      setAnuncios(lista);
    } else {
      setFeedback({ type: 'error', message: 'Erro ao carregar seus anúncios.' });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      carregarAnuncios();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, carregarAnuncios]);

  // Escuta atualizações de visualizações e status em tempo real via Supabase Realtime
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`realtime_meus_anuncios_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: SUPABASE_TABLES.ANUNCIOS,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.id) {
            setAnuncios((prev) =>
              prev.map((ad) =>
                ad.id === updated.id
                  ? {
                      ...ad,
                      visualizacoes: Number(updated.visualizacoes ?? ad.visualizacoes),
                      status: updated.status ?? ad.status,
                    }
                  : ad
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Abrir modal de fechamento de negócio com interessados do chat
  const abrirModalFecharNegocio = async (ad: MeuAnuncioItem) => {
    setAdToCloseDeal(ad);
    setTipoFechamentoModal((ad.modalidade as 'venda' | 'troca' | 'leilao') || 'venda');
    setLoadingInteressados(true);
    setCompradorSelecionadoId(null);

    try {
      const { interessados: lista } = await buscarInteressadosConversaAnuncio(supabase, ad.id);
      setInteressados(lista);
      if (lista.length > 0) {
        setCompradorSelecionadoId(lista[0]!.id);
      }
    } catch (err) {
      console.error('Erro ao buscar interessados do anúncio:', err);
      setInteressados([]);
    } finally {
      setLoadingInteressados(false);
    }
  };

  const handleConfirmarFecharNegocio = async () => {
    if (!adToCloseDeal) return;
    setFechandoNegocio(true);
    setFeedback(null);

    const { success, error } = await fecharNegocioAnuncio(
      supabase,
      adToCloseDeal.id,
      compradorSelecionadoId,
      tipoFechamentoModal
    );

    if (success) {
      setAnuncios((prev) =>
        prev.map((ad) =>
          ad.id === adToCloseDeal.id
            ? { ...ad, status: 'vendido', comprador_id: compradorSelecionadoId }
            : ad
        )
      );
      setFeedback({
        type: 'success',
        message: `Anúncio "${adToCloseDeal.titulo}" fechado com sucesso como VENDIDO!`,
      });
      setAdToCloseDeal(null);
    } else {
      setFeedback({
        type: 'error',
        message: error?.message || 'Falha ao registrar o fechamento do negócio.',
      });
    }
    setFechandoNegocio(false);
  };

  // Atualizar status do anúncio
  const handleMudarStatus = async (anuncioId: string, novoStatus: StatusAnuncio) => {
    if (novoStatus === 'vendido') {
      const ad = anuncios.find((a) => a.id === anuncioId);
      if (ad) {
        abrirModalFecharNegocio(ad);
        return;
      }
    }

    setProcessingId(anuncioId);
    setFeedback(null);
    const { success, error } = await atualizarStatusAnuncio(supabase, anuncioId, novoStatus);

    if (success) {
      setAnuncios((prev) =>
        prev.map((ad) => (ad.id === anuncioId ? { ...ad, status: novoStatus } : ad))
      );
      const labels: Record<StatusAnuncio, string> = {
        ativo: 'ativado',
        pausado: 'pausado',
        vendido: 'marcado como vendido',
        excluido: 'excluído',
      };
      setFeedback({
        type: 'success',
        message: `Anúncio ${labels[novoStatus]} com sucesso!`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: error?.message || 'Falha ao alterar o status do anúncio.',
      });
    }
    setProcessingId(null);
  };

  // Confirmar e excluir anúncio
  const handleConfirmarExclusao = async () => {
    if (!adToDelete) return;
    setIsDeleting(true);
    setFeedback(null);

    const { success, error } = await excluirAnuncio(supabase, adToDelete.id);

    if (success) {
      setAnuncios((prev) => prev.filter((ad) => ad.id !== adToDelete.id));
      setFeedback({
        type: 'success',
        message: `Anúncio "${adToDelete.titulo}" excluído com sucesso!`,
      });
      setAdToDelete(null);
    } else {
      setFeedback({
        type: 'error',
        message: error?.message || 'Falha ao excluir o anúncio.',
      });
    }
    setIsDeleting(false);
  };

  // Confirmar e aplicar Destaque de Vitrine (Pay-per-Highlight)
  const handleConfirmarDestaque = async () => {
    if (!adToHighlight) return;
    setIsHighlighting(true);
    setFeedback(null);

    const { success, error } = await destacarAnuncioVitrine(
      supabase,
      adToHighlight.id,
      opcaoHighlight
    );

    if (success) {
      const tipoAplicado: 'global' | 'categoria' = opcaoHighlight === 'avulso' ? 'global' : 'categoria';
      setAnuncios((prev) =>
        prev.map((ad) =>
          ad.id === adToHighlight.id
            ? { ...ad, destacado_vitrine: true, tipo_destaque: tipoAplicado }
            : ad
        )
      );
      await refreshProfile();
      setFeedback({
        type: 'success',
        message:
          tipoAplicado === 'global'
            ? '👑 Anúncio turbinado com Destaque Global! Visível no carrossel de todas as categorias e na busca.'
            : '🔥 Anúncio turbinado com Destaque na Categoria! Visível no carrossel da categoria correspondente.',
      });
      setAdToHighlight(null);
    } else {
      setFeedback({
        type: 'error',
        message: error?.message || 'Falha ao aplicar destaque no anúncio.',
      });
    }
    setIsHighlighting(false);
  };

  // Contagens por aba
  const contagens = {
    todos: anuncios.length,
    ativo: anuncios.filter((a) => a.status === 'ativo').length,
    pausado: anuncios.filter((a) => a.status === 'pausado').length,
    vendido: anuncios.filter((a) => a.status === 'vendido').length,
  };

  // Anúncios filtrados pela aba selecionada
  const anunciosFiltrados =
    activeTab === 'todos' ? anuncios : anuncios.filter((a) => a.status === activeTab);

  if (authLoading || (loading && !anuncios.length && user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-olx-purple animate-spin" />
        <p className="text-sm text-gray-500">Carregando seus anúncios...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-purple-100 text-olx-purple rounded-full flex items-center justify-center mx-auto">
          <Package className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Acesse seus anúncios</h1>
        <p className="text-sm text-gray-500">
          Faça login na sua conta para gerenciar, editar status e acompanhar as visitas dos seus classificados.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/auth/login?redirect=/conta/meus-anuncios"
            className="bg-olx-orange hover:bg-olx-orange-hover text-white text-sm font-bold px-6 py-2.5 rounded-full shadow transition"
          >
            Entrar
          </Link>
          <Link
            href="/auth/register?redirect=/conta/meus-anuncios"
            className="border border-olx-purple text-olx-purple hover:bg-purple-50 text-sm font-bold px-6 py-2.5 rounded-full transition"
          >
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <Link
            href="/conta"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-olx-purple transition mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Meu Perfil</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Meus Anúncios</h1>
          <p className="text-sm text-gray-500">
            Gerencie o status, visualize visitas ou exclua anúncios da sua conta
          </p>
        </div>

        <Link
          href="/anunciar"
          className="inline-flex items-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-sm hover:shadow transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Inserir novo anúncio</span>
        </Link>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Abas de Filtro por Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'todos'
              ? 'bg-olx-purple text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos ({contagens.todos})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ativo')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ativo'
              ? 'bg-green-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Ativos ({contagens.ativo})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pausado')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pausado'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Pausados ({contagens.pausado})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vendido')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'vendido'
              ? 'bg-gray-700 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          Vendidos ({contagens.vendido})
        </button>
      </div>

      {/* Lista de Anúncios */}
      {anunciosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-purple-50 text-olx-purple rounded-full flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">
              {activeTab === 'todos'
                ? 'Você ainda não publicou nenhum anúncio'
                : `Nenhum anúncio com status "${activeTab}"`}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Desapegue do que você não usa mais e anuncie grátis para milhões de compradores.
            </p>
          </div>
          <Link
            href="/anunciar"
            className="inline-flex items-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Criar meu primeiro anúncio</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {anunciosFiltrados.map((anuncio) => {
            const isProcessing = processingId === anuncio.id;

            return (
              <div
                key={anuncio.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs hover:shadow-sm transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Imagem + Informações Principais */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-gray-100 overflow-hidden shrink-0 relative border border-gray-100">
                    {anuncio.foto_principal_url ? (
                      <Image
                        src={anuncio.foto_principal_url}
                        alt={anuncio.titulo}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 96px, 112px"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="w-7 h-7" />
                        <span className="text-[10px] mt-1">Sem foto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Badge */}
                      {anuncio.status === 'ativo' && (
                        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Ativo
                        </span>
                      )}
                      {anuncio.status === 'pausado' && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pausado
                        </span>
                      )}
                      {anuncio.status === 'vendido' && (
                        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                          Vendido
                        </span>
                      )}

                      {anuncio.categoria_nome && (
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {anuncio.categoria_nome}
                        </span>
                      )}

                      {anuncio.destacado_vitrine && (
                        anuncio.tipo_destaque === 'global' ? (
                          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                            👑 DESTAQUE GLOBAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                            🔥 DESTAQUE NA CATEGORIA
                          </span>
                        )
                      )}
                    </div>

                    <Link
                      href={`/anuncio/${anuncio.id}`}
                      className="block text-base font-bold text-gray-900 hover:text-olx-purple transition truncate"
                    >
                      {anuncio.titulo}
                    </Link>

                    <p className="text-lg font-black text-gray-900">
                      {formatBRL(anuncio.preco)}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {anuncio.cidade} - {anuncio.estado}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        {anuncio.visualizacoes} {anuncio.visualizacoes === 1 ? 'visita' : 'visitas'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatRelativeDate(anuncio.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações e Controles */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="flex items-center gap-1.5">
                    {/* Botão Turbinar na Vitrine */}
                    {!anuncio.destacado_vitrine && anuncio.status === 'ativo' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdToHighlight(anuncio);
                          if ((profile?.creditos_destaque_vitrine ?? 0) > 0) {
                            setOpcaoHighlight('credito');
                          } else {
                            setOpcaoHighlight('avulso');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-amber-950 transition shadow-2xs hover:scale-102"
                        title="Turbinar anúncio com Destaque de Vitrine"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-950" />
                        <span>Turbinar</span>
                      </button>
                    )}

                    {/* Botão Ver Anúncio */}
                    <Link
                      href={`/anuncio/${anuncio.id}`}
                      target="_blank"
                      className="p-2 text-gray-500 hover:text-olx-purple hover:bg-purple-50 rounded-lg transition"
                      title="Ver anúncio publicado"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    {/* Botão Excluir */}
                    <button
                      type="button"
                      onClick={() => setAdToDelete(anuncio)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      title="Excluir anúncio permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Seletor Rápido de Status */}
                  <div className="relative">
                    {isProcessing ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-semibold text-gray-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Atualizando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {anuncio.status === 'ativo' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMudarStatus(anuncio.id, 'pausado')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>Pausar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMudarStatus(anuncio.id, 'vendido')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Vendido</span>
                            </button>
                          </>
                        )}

                        {anuncio.status === 'pausado' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMudarStatus(anuncio.id, 'ativo')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 transition border border-green-200"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Ativar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMudarStatus(anuncio.id, 'vendido')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Vendido</span>
                            </button>
                          </>
                        )}

                        {anuncio.status === 'vendido' && (
                          <button
                            type="button"
                            onClick={() => handleMudarStatus(anuncio.id, 'ativo')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-olx-purple hover:bg-purple-100 transition border border-purple-200"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Reativar Anúncio</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {adToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900">Excluir Anúncio?</h3>
              <p className="text-xs text-gray-600">
                Tem certeza de que deseja excluir o anúncio{' '}
                <span className="font-bold text-gray-900">&quot;{adToDelete.titulo}&quot;</span>?
                Todas as fotos e o histórico deste anúncio serão removidos permanentemente.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Destaque de Vitrine (Pay-per-Highlight) */}
      {adToHighlight && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border-2 border-amber-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 text-amber-950 flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Turbinar na Vitrine com Destaque
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1">
                  &quot;{adToHighlight.titulo}&quot;
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Anúncios destacados ganham o selo <span className="font-bold text-amber-900">&quot;👑 DESTAQUE GLOBAL&quot;</span> ou <span className="font-bold text-orange-600">&quot;🔥 DESTAQUE&quot;</span> e são exibidos com prioridade no carrossel de destaques.
            </p>

            {/* Opções de Turbinagem */}
            <div className="space-y-2.5">
              {/* Opção A: Destaque Global */}
              <div
                onClick={() => setOpcaoHighlight('avulso')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start justify-between ${
                  opcaoHighlight === 'avulso'
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-gray-900">
                      Opção A: Destaque Global em Todas as Categorias
                    </span>
                    <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                      👑 Máximo Alcance
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                    Seu anúncio aparece no carrossel de destaque do topo na Home, na Busca Geral e dentro de <strong>TODAS as categorias</strong> da plataforma, mesmo que o visitante esteja navegando em outra categoria!
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                  <span className="text-base font-black text-amber-950">R$ 1,99</span>
                  <input
                    type="radio"
                    name="modalOpcaoDestaque"
                    checked={opcaoHighlight === 'avulso'}
                    onChange={() => setOpcaoHighlight('avulso')}
                    className="text-amber-500 focus:ring-amber-400 mt-1"
                  />
                </div>
              </div>

              {/* Opção B: Pacote 10 Destaques na Categoria */}
              <div
                onClick={() => setOpcaoHighlight('pacote_10')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start justify-between relative overflow-hidden ${
                  opcaoHighlight === 'pacote_10'
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  -75%
                </span>
                <div className="pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-gray-900">
                      Opção B: Pacote 10 Destaques na Categoria
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                    Usa 1 crédito para destacar este anúncio exclusivamente dentro da sua categoria correspondente (mais 9 créditos salvos no perfil).
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                  <div className="text-right">
                    <span className="text-base font-black text-amber-950 block">R$ 4,90</span>
                    <span className="text-[9px] text-emerald-700 font-bold block">(R$ 0,49/cada)</span>
                  </div>
                  <input
                    type="radio"
                    name="modalOpcaoDestaque"
                    checked={opcaoHighlight === 'pacote_10'}
                    onChange={() => setOpcaoHighlight('pacote_10')}
                    className="text-amber-500 focus:ring-amber-400 mt-1"
                  />
                </div>
              </div>

              {/* Opção Créditos */}
              {(profile?.creditos_destaque_vitrine ?? 0) > 0 && (
                <div
                  onClick={() => setOpcaoHighlight('credito')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    opcaoHighlight === 'credito'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-emerald-200 bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-emerald-950">
                        Usar 1 dos seus {profile?.creditos_destaque_vitrine} créditos
                      </span>
                      <p className="text-[10px] text-emerald-700">Sem cobrança adicional no cartão/PIX</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="modalOpcaoDestaque"
                    checked={opcaoHighlight === 'credito'}
                    onChange={() => setOpcaoHighlight('credito')}
                    className="text-emerald-600 focus:ring-emerald-400"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdToHighlight(null)}
                disabled={isHighlighting}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarDestaque}
                disabled={isHighlighting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-amber-950 text-xs font-black transition flex items-center justify-center gap-2 shadow-md"
              >
                {isHighlighting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-950" />
                    <span>Turbinando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Confirmar Destaque</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fechamento de Negócio com Seleção de Comprador / Permutante */}
      {adToCloseDeal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Fechar Negócio & Marcar Vendido</h3>
                  <p className="text-xs text-gray-500">Selecione o comprador para habilitar avaliações</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdToCloseDeal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Você está finalizando o anúncio <strong className="text-gray-900">{adToCloseDeal.titulo}</strong>. Quem realizou a compra/troca com você?
              </p>

              {/* Lista de Interessados que conversaram pelo Chat */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Comprador / Parceiro de Troca:
                </label>
                {loadingInteressados ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-olx-purple mx-auto" />
                    <p className="text-xs text-gray-400 mt-1">Buscando pessoas do chat...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {interessados.map((item) => {
                      const isSelected = compradorSelecionadoId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setCompradorSelecionadoId(item.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-300'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-olx-purple font-bold text-xs flex items-center justify-center shrink-0">
                              {item.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {item.nome}
                            </span>
                          </div>
                          <input
                            type="radio"
                            name="compradorSelecionado"
                            checked={isSelected}
                            onChange={() => setCompradorSelecionadoId(item.id)}
                            className="text-emerald-600 focus:ring-emerald-400"
                          />
                        </div>
                      );
                    })}

                    {/* Opção Comprador Externo / Outro */}
                    <div
                      onClick={() => setCompradorSelecionadoId(null)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        compradorSelecionadoId === null
                          ? 'border-gray-400 bg-gray-50 ring-1 ring-gray-300'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Vendi por fora / Outro comprador</p>
                          <p className="text-[10px] text-gray-500">Sem vínculo de avaliação no TroqJá</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="compradorSelecionado"
                        checked={compradorSelecionadoId === null}
                        onChange={() => setCompradorSelecionadoId(null)}
                        className="text-gray-600 focus:ring-gray-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Seletor de Modalidade de Fechamento */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Modalidade do Fechamento:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoFechamentoModal('venda')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                      tipoFechamentoModal === 'venda'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    🏷️ Venda
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFechamentoModal('troca')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                      tipoFechamentoModal === 'troca'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    🔄 Troca
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFechamentoModal('leilao')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                      tipoFechamentoModal === 'leilao'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    🔨 Leilão
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                🤝 Ao confirmar, o anúncio será marcado como <strong>Vendido</strong> e sairá das buscas ativas. Se vincular um usuário do TroqJá, ambos poderão trocar avaliações de 1 a 5 estrelas!
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdToCloseDeal(null)}
                disabled={fechandoNegocio}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFecharNegocio}
                disabled={fechandoNegocio}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                {fechandoNegocio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Handshake className="w-4 h-4" />
                    <span>Confirmar Venda</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
