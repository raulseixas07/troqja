'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  buscarListaDesejos,
  adicionarDesejo,
  removerDesejo,
  buscarNotificacoesDesejos,
  marcarNotificacaoDesejoComoLida,
  ativarAssinaturaComprador,
  SUPABASE_TABLES,
  formatCurrencyBRL,
  formatRelativeDate,
  type ListaDesejo,
  type NotificacaoDesejoComAnuncio,
  type Categoria,
} from '@olx-clone/shared';
import {
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Gavel,
  ArrowLeftRight,
  ArrowRight,
  Check,
  BellRing,
} from 'lucide-react';

export default function DesejosPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, refreshProfile, refreshWishlistCount } = useAuth();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [desejos, setDesejos] = useState<(ListaDesejo & { categoria?: { id: string; nome: string } | null })[]>([]);
  const [notificacoes, setNotificacoes] = useState<NotificacaoDesejoComAnuncio[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  // Estados do formulário de novo desejo
  const [novoTermo, setNovoTermo] = useState('');
  const [novaCategoriaId, setNovaCategoriaId] = useState('');
  const [novoValorMaximo, setNovoValorMaximo] = useState('');
  const [salvandoDesejo, setSalvandoDesejo] = useState(false);

  // Estados de ativação da assinatura Radar VIP
  const [ativandoComprador, setAtivandoComprador] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar categorias
  useEffect(() => {
    async function loadCategorias() {
      const { data } = await supabase
        .from(SUPABASE_TABLES.CATEGORIAS)
        .select('*')
        .order('ordem', { ascending: true });
      if (data) {
        setCategorias(data as Categoria[]);
      }
    }
    loadCategorias();
  }, []);

  // Carregar desejos e notificações do usuário
  const carregarDadosUsuario = useCallback(async () => {
    if (!user) {
      setCarregandoDados(false);
      return;
    }

    try {
      setCarregandoDados(true);
      const [desejosRes, notifRes] = await Promise.all([
        buscarListaDesejos(supabase, user.id),
        buscarNotificacoesDesejos(supabase, user.id),
      ]);

      if (desejosRes.desejos) setDesejos(desejosRes.desejos);
      if (notifRes.notificacoes) setNotificacoes(notifRes.notificacoes);
    } finally {
      setCarregandoDados(false);
    }
  }, [user]);

  useEffect(() => {
    carregarDadosUsuario();
  }, [carregarDadosUsuario]);

  // Supabase Realtime para notificações e lista de desejos
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`realtime_desejos_page_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_TABLES.NOTIFICACOES_DESEJOS,
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          carregarDadosUsuario();
          refreshWishlistCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_TABLES.LISTA_DESEJOS,
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          carregarDadosUsuario();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, carregarDadosUsuario, refreshWishlistCount]);

  // Submissão do novo termo de interesse
  const handleAdicionarDesejo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/auth/login?redirect=/desejos');
      return;
    }

    if (!novoTermo.trim()) {
      setMensagemStatus({ type: 'error', text: 'Informe o termo ou produto desejado.' });
      return;
    }

    setSalvandoDesejo(true);
    setMensagemStatus(null);

    try {
      const valorNum = novoValorMaximo ? parseFloat(novoValorMaximo.replace(',', '.')) : null;
      const isVip = Boolean(profile?.assinante_comprador_desejos);

      const res = await adicionarDesejo(supabase, {
        usuario_id: user.id,
        termo_desejo: novoTermo.trim(),
        categoria_id: novaCategoriaId || null,
        valor_maximo: valorNum,
        alerta_vip_ativo: isVip,
      });

      if (res.error) {
        setMensagemStatus({ type: 'error', text: res.error.message });
      } else {
        setNovoTermo('');
        setNovaCategoriaId('');
        setNovoValorMaximo('');
        setMensagemStatus({
          type: 'success',
          text: `"${novoTermo.trim()}" adicionado à sua Lista de Desejos! O Radar TroqJá já está monitorando.`,
        });
        await carregarDadosUsuario();
      }
    } finally {
      setSalvandoDesejo(false);
    }
  };

  // Remover termo da lista
  const handleRemoverDesejo = async (desejoId: string) => {
    if (!user) return;
    const res = await removerDesejo(supabase, desejoId, user.id);
    if (!res.error) {
      setDesejos((prev) => prev.filter((d) => d.id !== desejoId));
    }
  };

  // Marcar notificação como lida
  const handleMarcarComoLida = async (notificacaoId: string) => {
    await marcarNotificacaoDesejoComoLida(supabase, notificacaoId);
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === notificacaoId ? { ...n, lida: true } : n))
    );
    refreshWishlistCount();
  };

  // Ativação da Assinatura Comprador Radar VIP (R$ 1,99/mês)
  const handleAtivarAssinaturaComprador = async () => {
    if (!user) {
      router.push('/auth/login?redirect=/desejos');
      return;
    }

    setAtivandoComprador(true);
    setMensagemStatus(null);
    try {
      const res = await ativarAssinaturaComprador(supabase, user.id);
      if (res.error) {
        setMensagemStatus({ type: 'error', text: res.error.message });
      } else {
        await refreshProfile();
        await carregarDadosUsuario();
        refreshWishlistCount();
        setMensagemStatus({
          type: 'success',
          text: 'Plano Radar VIP ativado com sucesso! Todos os matches foram desbloqueados instantaneamente por R$ 1,99/mês.',
        });
      }
    } finally {
      setAtivandoComprador(false);
    }
  };

  const isCompradorVip = Boolean(profile?.assinante_comprador_desejos);

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-500">Carregando Radar TroqJá...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header da Página */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Radar de Oportunidades & Trocas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Lista de Desejos & Match em Tempo Real
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          Cadastre produtos que você procura para comprar ou trocar. O algoritmo do <strong>TroqJá</strong> cruza
          automaticamente seus termos com cada novo anúncio publicado e avisa você na mesma hora.
        </p>
      </div>

      {/* Alerta de Feedback */}
      {mensagemStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm font-semibold ${
            mensagemStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagemStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{mensagemStatus.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagemStatus(null)}
            className="text-xs underline hover:no-underline opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ASSINATURA EXCLUSIVA DO COMPRADOR: RADAR VIP (R$ 1,99/MÊS) */}
      <div className="p-6 sm:p-8 rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-green-50/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#00C853] text-white flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-black text-gray-900">
                    Radar VIP do Comprador
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">
                    R$ 1,99/mês
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  Monitore seus produtos de interesse e receba alertas de novos anúncios compatíveis em tempo real, sem atrasos e com visualização desbloqueada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#00C853] shrink-0" />
                <span>Matches desbloqueados instantaneamente</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#00C853] shrink-0" />
                <span>Selo exclusivo RADAR VIP</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#00C853] shrink-0" />
                <span>Prioridade para fechar negócio</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            {isCompradorVip ? (
              <div className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-xs w-full md:w-auto">
                <CheckCircle2 className="w-4 h-4" />
                <span>Assinatura Radar VIP Ativa</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAtivarAssinaturaComprador}
                disabled={ativandoComprador}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#00C853] hover:bg-green-600 text-white font-black text-sm px-6 py-3.5 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-50"
              >
                {ativandoComprador ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                <span>Assinar Radar VIP por R$ 1,99/mês</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO: CADASTRAR NOVO DESEJO */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-gray-900">Cadastrar Novo Produto de Interesse</h2>
        </div>

        <form onSubmit={handleAdicionarDesejo} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              O que você procura? *
            </label>
            <input
              type="text"
              required
              value={novoTermo}
              onChange={(e) => setNovoTermo(e.target.value)}
              placeholder="Ex: iPhone 14, PlayStation 5, Bicicleta aro 29..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Categoria (Opcional)
            </label>
            <select
              value={novaCategoriaId}
              onChange={(e) => setNovaCategoriaId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none bg-white"
            >
              <option value="">Todas as Categorias</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={salvandoDesejo}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-2.5 px-4 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {salvandoDesejo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Monitorar Item</span>
            </button>
          </div>
        </form>

        {/* LISTA DE TERMOS ATUAIS SALVOS */}
        {desejos.length > 0 && (
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
              Seus itens monitorados ({desejos.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {desejos.map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs font-bold text-gray-800 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{d.termo_desejo}</span>
                  {d.categoria && (
                    <span className="text-[10px] text-gray-500 font-normal">
                      ({d.categoria.nome})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoverDesejo(d.id)}
                    className="text-gray-400 hover:text-red-600 transition ml-1"
                    title="Remover termo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO: ALERTAS & MATCHES EM TEMPO REAL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-olx-orange" />
            <h2 className="text-lg font-bold text-gray-900">
              Matches Encontrados pelo Radar ({notificacoes.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500">Atualizado via Supabase Realtime</span>
        </div>

        {carregandoDados ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-500">Consultando correspondências do radar...</p>
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-gray-900">
              Nenhum anúncio correspondente até o momento
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Assim que um anunciante publicar um produto que combine com os termos cadastrados acima, o alerta aparecerá aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notificacoes.map((notif) => {
              const isBloqueada = notif.bloqueada_monetizacao && !isCompradorVip;
              const ad = notif.anuncio;

              // Card Bloqueado (Convite para assinar Radar VIP por R$ 1,99/mês)
              if (isBloqueada) {
                return (
                  <div
                    key={notif.id}
                    className="p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/80 relative overflow-hidden flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-black uppercase">
                          <span>Match Bloqueado</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-gray-900">
                          Novo anúncio correspondente a &quot;{notif.desejo?.termo_desejo || 'seu desejo'}&quot;!
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Alguém acabou de publicar um produto correspondente na plataforma. Desbloqueie todos os detalhes, fotos e proposta com o Radar VIP.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400">
                        {formatRelativeDate(notif.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={handleAtivarAssinaturaComprador}
                        disabled={ativandoComprador}
                        className="inline-flex items-center gap-1.5 bg-[#00C853] hover:bg-green-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Desbloquear por R$ 1,99/mês</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // Card Desbloqueado com Detalhes Completos (Selo Exclusivo RADAR VIP)
              return (
                <div
                  key={notif.id}
                  className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between space-y-3 transition hover:border-emerald-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Radar VIP</span>
                      </span>
                      {notif.desejo?.termo_desejo && (
                        <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[140px]">
                          Match: {notif.desejo.termo_desejo}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {formatRelativeDate(notif.created_at)}
                    </span>
                  </div>

                  {ad ? (
                    <div className="flex items-center gap-3.5">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative border border-gray-100">
                        {ad.foto_principal_url ? (
                          <Image
                            src={ad.foto_principal_url}
                            alt={ad.titulo}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Sem foto
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-extrabold text-gray-900 truncate">
                          {ad.titulo}
                        </h4>
                        <p className="text-base font-black text-gray-900 mt-0.5">
                          {formatCurrencyBRL(ad.preco)}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          {ad.modalidade === 'leilao' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                              <Gavel className="w-3 h-3" />
                              <span>Leilão</span>
                            </span>
                          )}
                          {(ad.modalidade === 'troca' || ad.aceita_troca) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded">
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>Aceita Troca</span>
                            </span>
                          )}
                          <span className="text-[11px] text-gray-500">
                            {ad.cidade} - {ad.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Anúncio não disponível ou removido.</p>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    {!notif.lida ? (
                      <button
                        type="button"
                        onClick={() => handleMarcarComoLida(notif.id)}
                        className="text-xs text-gray-500 hover:text-gray-800 transition underline"
                      >
                        Marcar como vista
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400">Visualizada</span>
                    )}

                    {ad && (
                      <Link
                        href={`/anuncio/${ad.id}`}
                        onClick={() => handleMarcarComoLida(notif.id)}
                        className="inline-flex items-center gap-1 text-xs font-black text-olx-purple hover:text-purple-800 transition"
                      >
                        <span>Ver Anúncio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
