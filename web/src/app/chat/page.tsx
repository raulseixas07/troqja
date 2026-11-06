'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { supabase } from '@/lib/supabase';
import {
  SUPABASE_TABLES,
  formatCurrencyBRL,
  formatRelativeDate,
  type ConversaListItem,
  buscarConversasDoUsuario,
  marcarMensagensComoLidas,
  obterReputacaoUsuario,
  type ReputacaoUsuario,
} from '@olx-clone/shared';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  ShoppingBag,
  Loader2,
  Clock,
  Sparkles,
  Star,
  ArrowLeftRight,
  Camera,
  X,
  CheckCircle2,
  Handshake,
  Download,
} from 'lucide-react';
import { convertImageToWebP, type ProcessedWebPImage } from '@/utils/imageWebP';
import {
  fecharNegocioAnuncio,
  verificarAvaliacaoExistente,
  criarAvaliacao,
} from '@olx-clone/shared';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeConversaParam = searchParams.get('id');

  const { user, isLoading: authLoading, refreshUnreadCount } = useAuth();

  const [conversas, setConversas] = useState<ConversaListItem[]>([]);
  const [loadingConversas, setLoadingConversas] = useState(true);
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(activeConversaParam);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [reputacaoOutro, setReputacaoOutro] = useState<ReputacaoUsuario | null>(null);

  // Estados de Envio de Fotos (WebP) & Lightbox
  const [selectedPhoto, setSelectedPhoto] = useState<ProcessedWebPImage | null>(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Fechamento de Negócio
  const [modalFecharNegocioAberta, setModalFecharNegocioAberta] = useState(false);
  const [tipoFechamento, setTipoFechamento] = useState<'venda' | 'troca' | 'leilao'>('venda');
  const [fechandoNegocio, setFechandoNegocio] = useState(false);

  // Estados de Avaliação Mútua (1 a 5 estrelas)
  const [modalAvaliacaoAberta, setModalAvaliacaoAberta] = useState(false);
  const [minhaAvaliacaoFeita, setMinhaAvaliacaoFeita] = useState(false);
  const [minhaAvaliacaoNota, setMinhaAvaliacaoNota] = useState<number | null>(null);
  const [notaAvaliacao, setNotaAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [avaliacaoSuccess, setAvaliacaoSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversaAtiva = conversas.find((c) => c.id === selectedConversaId);

  // Hook de mensagens em tempo real para a conversa selecionada
  const { messages, loading: messagesLoading, sendMessage } = useRealtimeMessages(
    selectedConversaId,
    user?.id
  );

  // Sincroniza query param com conversa selecionada
  useEffect(() => {
    if (activeConversaParam) {
      setSelectedConversaId(activeConversaParam);
    }
  }, [activeConversaParam]);

  // Carrega lista de conversas do usuário logado
  const loadConversas = useCallback(async () => {
    if (!user) return;
    setLoadingConversas(true);

    try {
      const { conversas: formatadas, error } = await buscarConversasDoUsuario(supabase, user.id);

      if (!error && formatadas) {
        setConversas(formatadas);

        // Se nenhuma conversa selecionada mas há conversas na lista e estamos em desktop, seleciona a primeira
        if (
          !selectedConversaId &&
          formatadas.length > 0 &&
          typeof window !== 'undefined' &&
          window.innerWidth >= 768
        ) {
          setSelectedConversaId(formatadas[0]!.id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoadingConversas(false);
    }
  }, [user, selectedConversaId]);

  useEffect(() => {
    loadConversas();

    if (!user?.id) return;

    // Escuta novas mensagens e alterações em tempo real via Supabase Realtime
    const channel = supabase
      .channel(`chat_lista_realtime_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLES.MENSAGENS },
        () => {
          loadConversas();
          refreshUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLES.CONVERSAS },
        () => {
          loadConversas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadConversas, refreshUnreadCount]);

  // Carrega reputação do outro usuário quando conversa ativa muda
  useEffect(() => {
    if (!conversaAtiva?.outro_usuario?.id) {
      setReputacaoOutro(null);
      return;
    }
    obterReputacaoUsuario(supabase, conversaAtiva.outro_usuario.id).then(({ reputacao: rep }) => {
      setReputacaoOutro(rep);
    });
  }, [conversaAtiva?.outro_usuario?.id]);

  // Verifica se o usuário logado já avaliou este anúncio quando status for vendido
  useEffect(() => {
    if (!conversaAtiva?.anuncio?.id || !user?.id) {
      setMinhaAvaliacaoFeita(false);
      setMinhaAvaliacaoNota(null);
      return;
    }

    if (conversaAtiva.anuncio.status === 'vendido') {
      verificarAvaliacaoExistente(supabase, conversaAtiva.anuncio.id, user.id).then(({ avaliado, avaliacao }) => {
        setMinhaAvaliacaoFeita(avaliado);
        if (avaliacao?.nota) {
          setMinhaAvaliacaoNota(Number(avaliacao.nota));
        }
      });
    } else {
      setMinhaAvaliacaoFeita(false);
      setMinhaAvaliacaoNota(null);
    }
  }, [conversaAtiva?.anuncio?.id, conversaAtiva?.anuncio?.status, user?.id]);

  // Marca mensagens da conversa ativa como lidas
  useEffect(() => {
    if (!selectedConversaId || !user?.id) return;

    marcarMensagensComoLidas(supabase, selectedConversaId, user.id).then(({ afetadas }) => {
      if (afetadas > 0) {
        setConversas((prev) =>
          prev.map((c) => (c.id === selectedConversaId ? { ...c, mensagens_nao_lidas: 0 } : c))
        );
        refreshUnreadCount();
      }
    });
  }, [selectedConversaId, user?.id, refreshUnreadCount]);

  // Marca novas mensagens que chegam na conversa aberta como lidas
  useEffect(() => {
    if (!selectedConversaId || !user?.id || messages.length === 0) return;

    const hasUnread = messages.some((m) => m.sender_id !== user.id && !m.lida);
    if (hasUnread) {
      marcarMensagensComoLidas(supabase, selectedConversaId, user.id).then(() => {
        setConversas((prev) =>
          prev.map((c) => (c.id === selectedConversaId ? { ...c, mensagens_nao_lidas: 0 } : c))
        );
        refreshUnreadCount();
      });
    }
  }, [messages, selectedConversaId, user?.id, refreshUnreadCount]);

  // Rola automaticamente para o fim da conversa
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversa = (id: string) => {
    setSelectedConversaId(id);
    router.replace(`/chat?id=${id}`);
    if (user?.id) {
      marcarMensagensComoLidas(supabase, id, user.id).then(() => {
        setConversas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, mensagens_nao_lidas: 0 } : c))
        );
        refreshUnreadCount();
      });
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setConvertingPhoto(true);
      const processed = await convertImageToWebP(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
      });
      setSelectedPhoto(processed);
    } catch (err) {
      console.error('Erro ao converter imagem para WebP:', err);
      alert('Não foi possível processar a imagem selecionada.');
    } finally {
      setConvertingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputMessage.trim();
    if ((!textToSend && !selectedPhoto) || sending) return;

    setSending(true);
    setInputMessage('');
    const photoToSend = selectedPhoto;
    setSelectedPhoto(null);

    try {
      let imageUrl: string | null = null;

      if (photoToSend && selectedConversaId) {
        const path = `chat/${selectedConversaId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
        const { error: uploadErr } = await supabase.storage
          .from('anuncios')
          .upload(path, photoToSend.blob, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadErr) {
          throw new Error('Falha no upload da foto: ' + uploadErr.message);
        }

        const { data: pubData } = supabase.storage.from('anuncios').getPublicUrl(path);
        imageUrl = pubData.publicUrl;
      }

      await sendMessage(textToSend || null, imageUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar mensagem.';
      console.error('Erro ao enviar mensagem:', err);
      alert(msg);
      if (photoToSend) {
        setSelectedPhoto(photoToSend);
      }
    } finally {
      setSending(false);
    }
  };

  const handleConfirmarFecharNegocio = async () => {
    if (!conversaAtiva || !user) return;
    setFechandoNegocio(true);
    try {
      const { success, error } = await fecharNegocioAnuncio(
        supabase,
        conversaAtiva.anuncio.id,
        conversaAtiva.comprador_id,
        tipoFechamento
      );

      if (!success) {
        alert(error?.message || 'Erro ao fechar negócio.');
        return;
      }

      // Atualiza localmente
      setConversas((prev) =>
        prev.map((c) =>
          c.id === conversaAtiva.id
            ? {
                ...c,
                anuncio: {
                  ...c.anuncio,
                  status: 'vendido',
                  comprador_id: conversaAtiva.comprador_id,
                },
              }
            : c
        )
      );
      setModalFecharNegocioAberta(false);
      // Abre automaticamente modal de avaliação
      setModalAvaliacaoAberta(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar fechamento.';
      alert(msg);
    } finally {
      setFechandoNegocio(false);
    }
  };

  const handleEnviarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversaAtiva || !user) return;
    setEnviandoAvaliacao(true);

    try {
      const outroUsuarioId = conversaAtiva.outro_usuario.id;
      const { success, error } = await criarAvaliacao(supabase, {
        anuncio_id: conversaAtiva.anuncio.id,
        avaliador_id: user.id,
        avaliado_id: outroUsuarioId,
        nota: notaAvaliacao,
        comentario: comentarioAvaliacao.trim() || undefined,
        tipo_negocio: tipoFechamento,
      });

      if (!success) {
        alert(error?.message || 'Falha ao registrar avaliação.');
        return;
      }

      setMinhaAvaliacaoFeita(true);
      setMinhaAvaliacaoNota(notaAvaliacao);
      setAvaliacaoSuccess(true);
      setTimeout(() => {
        setModalAvaliacaoAberta(false);
        setAvaliacaoSuccess(false);
      }, 1500);

      // Atualiza reputação exibida do outro usuário
      const { reputacao: novaRep } = await obterReputacaoUsuario(supabase, outroUsuarioId);
      if (novaRep) setReputacaoOutro(novaRep);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar avaliação.';
      alert(msg);
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const totalNaoLidas = conversas.reduce((acc, c) => acc + (c.mensagens_nao_lidas || 0), 0);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-olx-purple animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Carregando suas mensagens...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-purple-100 text-olx-purple rounded-full flex items-center justify-center mx-auto">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Acesse suas mensagens</h1>
        <p className="text-sm text-gray-500">
          Faça login na sua conta para conversar em tempo real com compradores e vendedores.
        </p>
        <Link
          href="/auth/login?redirect=/chat"
          className="inline-block bg-olx-orange hover:bg-olx-orange-hover text-white text-sm font-bold px-6 py-2.5 rounded-full shadow transition"
        >
          Entrar na Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-170px)] min-h-[500px] flex">
        {/* Painel Esquerdo: Lista de Conversas (Esconde no mobile se uma conversa estiver aberta) */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-white ${
            selectedConversaId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-olx-purple" />
              <span>Minhas Conversas</span>
            </h1>
            <div className="flex items-center gap-1.5">
              {totalNaoLidas > 0 && (
                <span className="text-[11px] bg-olx-orange text-white font-bold px-2 py-0.5 rounded-full shadow-2xs">
                  {totalNaoLidas} {totalNaoLidas === 1 ? 'não lida' : 'não lidas'}
                </span>
              )}
              <span className="text-xs bg-purple-50 text-olx-purple font-bold px-2 py-0.5 rounded-full">
                {conversas.length}
              </span>
            </div>
          </div>

          {/* Lista com scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingConversas ? (
              <div className="p-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-olx-purple mx-auto" />
                <p className="text-xs text-gray-400">Carregando conversas...</p>
              </div>
            ) : conversas.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-700">Nenhuma conversa iniciada</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Quando você demonstrar interesse em um anúncio ou alguém te chamar, o chat aparecerá aqui.
                </p>
                <Link
                  href="/"
                  className="inline-block text-xs font-bold text-olx-purple hover:underline"
                >
                  Explorar anúncios
                </Link>
              </div>
            ) : (
              conversas.map((item) => {
                const isSelected = item.id === selectedConversaId;
                const initial = item.outro_usuario.nome.charAt(0).toUpperCase();

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectConversa(item.id)}
                    className={`w-full text-left p-3.5 flex gap-3 transition hover:bg-gray-50 ${
                      isSelected ? 'bg-purple-50/70 border-l-4 border-olx-purple' : ''
                    }`}
                  >
                    {/* Avatar do Outro Usuário */}
                    <div className="w-11 h-11 rounded-full bg-purple-100 text-olx-purple flex items-center justify-center font-bold text-sm shrink-0 border border-purple-200">
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            item.mensagens_nao_lidas > 0
                              ? 'font-black text-gray-950'
                              : 'font-semibold text-gray-800'
                          }`}
                        >
                          {item.outro_usuario.nome}
                        </span>
                        {item.ultima_mensagem && (
                          <span
                            className={`text-[10px] shrink-0 ${
                              item.mensagens_nao_lidas > 0
                                ? 'text-olx-orange font-bold'
                                : 'text-gray-400'
                            }`}
                          >
                            {formatRelativeDate(item.ultima_mensagem.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Título do Anúncio */}
                      <p className="text-[11px] font-semibold text-olx-purple truncate mb-0.5">
                        {item.anuncio.titulo}
                      </p>

                      {/* Prévia da última mensagem + Badge de mensagens não lidas */}
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div
                          className={`text-xs truncate ${
                            item.mensagens_nao_lidas > 0
                              ? 'text-gray-900 font-bold'
                              : 'text-gray-500 font-normal'
                          }`}
                        >
                          {item.ultima_mensagem ? (
                            item.ultima_mensagem.conteudo ? (
                              <span>{item.ultima_mensagem.conteudo}</span>
                            ) : item.ultima_mensagem.imagem_url ? (
                              <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                                <Camera className="w-3 h-3 text-purple-600" />
                                <span>Foto</span>
                              </span>
                            ) : (
                              'Conversa iniciada. Diga olá!'
                            )
                          ) : (
                            'Conversa iniciada. Diga olá!'
                          )}
                        </div>
                        {item.mensagens_nao_lidas > 0 && (
                          <span
                            className="bg-olx-orange text-white text-[10px] font-black min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                            title={`${item.mensagens_nao_lidas} mensagens não lidas`}
                          >
                            {item.mensagens_nao_lidas > 99 ? '99+' : item.mensagens_nao_lidas}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Sala de Chat Ativa */}
        <div
          className={`flex-1 flex flex-col bg-[#F9FAFB] ${
            !selectedConversaId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {conversaAtiva ? (
            <>
              {/* Top Header da Conversa */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Botão Voltar para mobile */}
                  <button
                    type="button"
                    onClick={() => setSelectedConversaId(null)}
                    className="md:hidden p-1.5 text-gray-600 hover:text-olx-purple transition rounded-full hover:bg-gray-100"
                    title="Voltar para a lista"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-olx-purple text-white font-black text-sm flex items-center justify-center shrink-0">
                    {conversaAtiva.outro_usuario.nome.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {conversaAtiva.outro_usuario.nome}
                      </p>
                      {/* Feedback Stars do Usuário */}
                      <div className="inline-flex items-center gap-1 text-[11px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{reputacaoOutro ? reputacaoOutro.media_estrelas.toFixed(1) : '5.0'}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          ({reputacaoOutro?.total_avaliacoes || 0})
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/anuncio/${conversaAtiva.anuncio.id}`}
                      className="text-xs text-gray-500 hover:text-olx-purple truncate flex items-center gap-1 font-medium"
                    >
                      <span>{conversaAtiva.anuncio.titulo}</span>
                      <span className="font-bold text-gray-900">
                        • {formatCurrencyBRL(conversaAtiva.anuncio.preco)}
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Ações Estratégicas no Topo: Fechar Negócio e Avaliação */}
                <div className="flex items-center gap-2 flex-wrap">
                  {conversaAtiva.anuncio.status === 'vendido' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Negócio Fechado</span>
                      </span>

                      {!minhaAvaliacaoFeita ? (
                        <button
                          type="button"
                          onClick={() => setModalAvaliacaoAberta(true)}
                          className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg shadow-2xs transition"
                        >
                          <Star className="w-3.5 h-3.5 fill-white text-white" />
                          <span>Avaliar Negociação</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Avaliado ({minhaAvaliacaoNota ?? 5}★)</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    user.id === conversaAtiva.anuncio.user_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setTipoFechamento(
                            conversaAtiva.anuncio.modalidade === 'troca' || searchParams.get('troca') === '1'
                              ? 'troca'
                              : conversaAtiva.anuncio.modalidade === 'leilao'
                              ? 'leilao'
                              : 'venda'
                          );
                          setModalFecharNegocioAberta(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 py-1.5 rounded-lg shadow-2xs transition hover:scale-102"
                        title="Marcar produto como vendido para este usuário e habilitar avaliação mútua"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Fechar Negócio com este Usuário</span>
                      </button>
                    )
                  )}

                  {/* Link direto para o anúncio */}
                  <Link
                    href={`/anuncio/${conversaAtiva.anuncio.id}`}
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-olx-orange hover:underline shrink-0 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Ver Anúncio</span>
                  </Link>
                </div>
              </div>

              {/* Banner de Negócio Fechado & Avaliação Pendente */}
              {conversaAtiva.anuncio.status === 'vendido' && !minhaAvaliacaoFeita && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <Handshake className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      🤝 Negócio concluído! Avalie sua experiência com <strong>{conversaAtiva.outro_usuario.nome}</strong> para fortalecer a reputação na comunidade.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalAvaliacaoAberta(true)}
                    className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-md text-xs shadow-2xs transition shrink-0"
                  >
                    <Star className="w-3 h-3 fill-white text-white" />
                    <span>Avaliar Agora</span>
                  </button>
                </div>
              )}

              {/* Banner de Proposta de Troca se veio com parâmetro troca=1 */}
              {searchParams.get('troca') === '1' && (
                <div className="px-4 py-2 bg-green-50 border-b border-green-200 flex items-center gap-2 text-xs text-green-900 font-semibold shadow-2xs">
                  <ArrowLeftRight className="w-4 h-4 text-[#00C853] shrink-0" />
                  <span>Negociação de Permuta / Troca: Proponha seu produto com fotos, detalhes e local de encontro.</span>
                </div>
              )}

              {/* Área das Mensagens (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Banner de negociação segura */}
                <div className="text-center my-2">
                  <span className="inline-flex items-center gap-1 bg-white border border-gray-200 px-3 py-1 rounded-full text-[11px] text-gray-500 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-olx-orange" />
                    Chat em tempo real protegido • TroqJá
                  </span>
                </div>

                {messagesLoading && messages.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-olx-purple mx-auto" />
                    <p className="text-xs text-gray-400">Carregando mensagens...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center space-y-2 my-auto">
                    <p className="text-sm font-medium text-gray-600">Nenhuma mensagem trocada ainda.</p>
                    <p className="text-xs text-gray-400">
                      Tire dúvidas sobre o produto, envie fotos, combine local de retirada ou faça sua oferta.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMinha = msg.sender_id === user.id;
                    const hora = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMinha ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md p-2.5 sm:p-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
                            isMinha
                              ? 'bg-olx-purple text-white rounded-br-xs'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
                          }`}
                        >
                          {/* Foto enviada com compressão WebP */}
                          {msg.imagem_url && (
                            <div className="relative group mb-1.5 overflow-hidden rounded-xl bg-black/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.imagem_url}
                                alt="Foto enviada no chat"
                                className="max-h-64 sm:max-h-80 w-auto max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                                onClick={() => setLightboxImage(msg.imagem_url!)}
                              />
                              <div
                                onClick={() => setLightboxImage(msg.imagem_url!)}
                                className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
                              >
                                <span className="bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-semibold shadow">
                                  🔍 Ampliar Foto
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Texto da mensagem */}
                          {msg.conteudo && (
                            <p className="whitespace-pre-wrap break-words px-1">{msg.conteudo}</p>
                          )}

                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              isMinha ? 'text-purple-200' : 'text-gray-400'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{hora}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Prévia da Foto Selecionada (WebP) antes do envio */}
              {selectedPhoto && (
                <div className="px-4 py-2.5 bg-purple-50 border-t border-purple-200 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedPhoto.previewUrl}
                      alt="Prévia da foto comprimida"
                      className="w-14 h-14 rounded-lg object-cover border border-purple-300 shadow-2xs shrink-0"
                    />
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-gray-900 truncate">Foto pronta para envio (WebP)</p>
                      <p className="text-[11px] text-purple-700 font-semibold">
                        {(selectedPhoto.convertedSize / 1024).toFixed(0)} KB • Economia de {selectedPhoto.reductionPercentage}% de dados
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(null)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-white transition"
                    title="Remover foto"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Barra de Digitação e Upload */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                {/* Input escondido para upload de foto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {/* Botão de Anexar Foto / Câmera */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={convertingPhoto || sending}
                  className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:text-olx-purple hover:bg-purple-50 transition flex items-center justify-center shrink-0 disabled:opacity-50"
                  title="Enviar foto ou imagem (comprimida automaticamente em WebP)"
                >
                  {convertingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin text-olx-purple" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>

                {/* Campo de Texto */}
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    selectedPhoto
                      ? 'Adicione uma legenda opcional... (ou pressione Enviar)'
                      : 'Digite sua mensagem aqui... (Pressione Enter para enviar)'
                  }
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition"
                />

                {/* Botão Enviar */}
                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && !selectedPhoto) || sending}
                  className="bg-olx-orange hover:bg-olx-orange-hover text-white px-5 py-3 rounded-xl font-bold transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Estado Vazio Quando Nenhuma Conversa Está Selecionada */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-olx-purple flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Selecione uma conversa</h2>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                Escolha uma conversa na lista lateral para visualizar as mensagens e negociar em tempo real com compradores ou vendedores.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Lightbox de Imagem em Tela Cheia */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a
              href={lightboxImage}
              target="_blank"
              rel="noopener noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
              title="Abrir em nova aba / Baixar"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Foto em alta definição"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* MODAL 2: Fechamento de Negócio (Vendedor -> Comprador) */}
      {modalFecharNegocioAberta && conversaAtiva && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Fechar Negócio</h3>
                  <p className="text-xs text-gray-500">Conclua a transação com segurança</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalFecharNegocioAberta(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Você está prestes a registrar o fechamento do anúncio{' '}
                <strong className="text-gray-900">{conversaAtiva.anuncio.titulo}</strong> com o parceiro{' '}
                <strong className="text-gray-900">{conversaAtiva.outro_usuario.nome}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Modalidade do Negócio Fechado:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoFechamento('venda')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                      tipoFechamento === 'venda'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    🏷️ Venda
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFechamento('troca')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                      tipoFechamento === 'troca'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    🔄 Troca
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFechamento('leilao')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                      tipoFechamento === 'leilao'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    🔨 Leilão
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                ℹ️ Ao confirmar, o anúncio será marcado como <strong>Vendido</strong>, o chat registrará a confirmação de fechamento e ambos poderão avaliar a negociação de 1 a 5 estrelas!
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalFecharNegocioAberta(false)}
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
                    <span>Confirmar Fechamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Avaliação Mútua por Estrelas (1 a 5) */}
      {modalAvaliacaoAberta && conversaAtiva && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Avaliar Negociação</h3>
                  <p className="text-xs text-gray-500">{conversaAtiva.outro_usuario.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAvaliacaoAberta(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {avaliacaoSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-gray-900">Avaliação Enviada!</h4>
                <p className="text-xs text-gray-500">
                  Obrigado por ajudar a manter o TroqJá um ambiente seguro e de alta confiança.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEnviarAvaliacao} className="space-y-4">
                {/* Seletor Interativo de 1 a 5 Estrelas */}
                <div className="text-center py-2 bg-purple-50/50 rounded-xl border border-purple-100">
                  <p className="text-xs font-bold text-gray-700 mb-2">Quantas estrelas merece a negociação?</p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((estrela) => (
                      <button
                        key={estrela}
                        type="button"
                        onClick={() => setNotaAvaliacao(estrela)}
                        className="p-1 text-amber-400 hover:scale-125 transition-transform"
                        title={`${estrela} de 5 estrelas`}
                      >
                        <Star
                          className={`w-8 h-8 ${
                            estrela <= notaAvaliacao
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] font-black text-amber-700 mt-1.5">
                    {notaAvaliacao === 5 && '⭐ 5.0 - Excelente! Recomendo fortemente'}
                    {notaAvaliacao === 4 && '⭐ 4.0 - Muito bom, negociação tranquila'}
                    {notaAvaliacao === 3 && '⭐ 3.0 - Bom, dentro do esperado'}
                    {notaAvaliacao === 2 && '⭐ 2.0 - Regular, teve contratempos'}
                    {notaAvaliacao === 1 && '⭐ 1.0 - Ruim, não recomendo'}
                  </p>
                </div>

                {/* Tags Rápidas de Feedback */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                    Elogios rápidos (clique para adicionar ao comentário):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Negociação rápida',
                      'Produto excelente',
                      'Comunicação 10/10',
                      'Pontual',
                      'Recomendo 100%',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setComentarioAvaliacao((prev) =>
                            prev ? `${prev}, ${tag.toLowerCase()}` : tag
                          );
                        }}
                        className="text-[11px] font-medium bg-gray-100 hover:bg-purple-100 hover:text-olx-purple text-gray-700 px-2.5 py-1 rounded-full transition border border-gray-200"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comentário Livre */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Comentário (opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={comentarioAvaliacao}
                    onChange={(e) => setComentarioAvaliacao(e.target.value)}
                    placeholder="Conte como foi negociar com este usuário..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none resize-none transition"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAvaliacaoAberta(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoAvaliacao}
                    className="flex-1 py-2.5 rounded-xl bg-olx-purple hover:bg-purple-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    {enviandoAvaliacao ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Star className="w-4 h-4 fill-white text-white" />
                        <span>Enviar Avaliação</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-olx-purple animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Carregando painel de mensagens...</p>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
