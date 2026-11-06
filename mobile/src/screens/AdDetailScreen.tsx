import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  MapPin,
  ShieldCheck,
  Heart,
  Share2,
  Tag,
  Eye,
  Gavel,
  Repeat,
  Clock,
  Star,
} from 'lucide-react-native';
import {
  formatCurrencyBRL,
  formatRelativeDate,
  formatCountdown,
  SUPABASE_TABLES,
  formatPhoneNumber,
  obterOuCriarConversa,
  incrementarVisualizacoesAnuncio,
  registrarLance,
  buscarLances,
  obterReputacaoUsuario,
  type LanceComUsuario,
  type ReputacaoUsuario,
  type ModalidadeAnuncio,
} from '@olx-clone/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FotoItem {
  id: string;
  url: string;
  is_principal?: boolean;
}

interface AdDetailScreenProps {
  adId: string;
  onBack: () => void;
  onOpenChat: (conversaId: string) => void;
  onOpenAuth: () => void;
}

interface LoadedAd {
  id: string;
  user_id: string;
  titulo: string;
  preco: number;
  descricao: string;
  cidade: string;
  estado: string;
  bairro?: string | null;
  created_at: string;
  visualizacoes: number;
  modalidade: ModalidadeAnuncio;
  aceita_troca: boolean;
  itens_troca?: string | null;
  lance_inicial?: number | null;
  lance_atual?: number | null;
  incremento_minimo: number;
  leilao_encerramento?: string | null;
  destacado_vitrine?: boolean;
  tipo_destaque?: 'global' | 'categoria' | null;
  fotos: FotoItem[];
  categoria?: { nome: string } | null;
  anunciante?: {
    id: string;
    nome: string;
    telefone?: string | null;
  } | null;
}

const sessionViewedAds = new Set<string>();

export function AdDetailScreen({ adId, onBack, onOpenChat, onOpenAuth }: AdDetailScreenProps) {
  const { user } = useAuth();
  const [ad, setAd] = useState<LoadedAd | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  // Estados de Leilão
  const [lances, setLances] = useState<LanceComUsuario[]>([]);
  const [novoLanceTexto, setNovoLanceTexto] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [countdown, setCountdown] = useState<{
    totalMs: number;
    isEncerrado: boolean;
    formatted: string;
  }>({ totalMs: 0, isEncerrado: false, formatted: '' });

  // Reputação do Anunciante
  const [reputacao, setReputacao] = useState<ReputacaoUsuario | null>(null);

  // Intervalo do cronômetro do Leilão
  useEffect(() => {
    if (!ad?.leilao_encerramento || ad.modalidade !== 'leilao') return;

    const tick = () => {
      setCountdown(formatCountdown(ad.leilao_encerramento));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [ad?.leilao_encerramento, ad?.modalidade]);

  // Supabase Realtime para Lances no Mobile
  useEffect(() => {
    if (!adId) return;

    const channel = supabase
      .channel(`mobile_ad_leilao_${adId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: SUPABASE_TABLES.LANCES,
          filter: `anuncio_id=eq.${adId}`,
        },
        async (payload) => {
          const novoValor = Number(payload.new.valor);
          setAd((prev) => (prev ? { ...prev, lance_atual: novoValor } : prev));
          const { lances: novosLances } = await buscarLances(supabase, adId);
          if (novosLances.length > 0) {
            setLances(novosLances);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adId]);

  useEffect(() => {
    if (adId && !sessionViewedAds.has(adId)) {
      sessionViewedAds.add(adId);
      incrementarVisualizacoesAnuncio(supabase, adId).then(({ visualizacoes: total }) => {
        if (typeof total === 'number') {
          setAd((prev) => (prev ? { ...prev, visualizacoes: total } : prev));
        }
      });
    }

    async function fetchAd() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(SUPABASE_TABLES.ANUNCIOS)
          .select(`
            *,
            categoria:categorias(nome),
            anunciante:profiles(id, nome, telefone),
            fotos:fotos_anuncio(*)
          `)
          .eq('id', adId)
          .maybeSingle();

        if (!error && data) {
          const fotosOrdenadas = ((data.fotos as FotoItem[]) || []).sort((a, b) => {
            if (a.is_principal) return -1;
            if (b.is_principal) return 1;
            return 0;
          });

          const loaded: LoadedAd = {
            id: data.id,
            user_id: data.user_id,
            titulo: data.titulo,
            preco: Number(data.preco),
            descricao: data.descricao,
            cidade: data.cidade,
            estado: data.estado,
            bairro: data.bairro,
            created_at: data.created_at,
            visualizacoes: Number(data.visualizacoes || 0),
            modalidade: (data as any).modalidade || 'venda',
            aceita_troca: Boolean((data as any).aceita_troca),
            itens_troca: (data as any).itens_troca || null,
            lance_inicial: (data as any).lance_inicial != null ? Number((data as any).lance_inicial) : null,
            lance_atual: (data as any).lance_atual != null ? Number((data as any).lance_atual) : null,
            incremento_minimo: (data as any).incremento_minimo != null ? Number((data as any).incremento_minimo) : 10,
            leilao_encerramento: (data as any).leilao_encerramento || null,
            destacado_vitrine: Boolean((data as any).destacado_vitrine),
            tipo_destaque: (data as any).tipo_destaque || null,
            fotos: fotosOrdenadas,
            categoria: data.categoria as { nome: string } | null,
            anunciante: data.anunciante as { id: string; nome: string; telefone?: string | null } | null,
          };

          setAd(loaded);

          if (data.user_id) {
            obterReputacaoUsuario(supabase, data.user_id).then(({ reputacao: rep }) => {
              if (rep) setReputacao(rep);
            });
          }

          if (loaded.modalidade === 'leilao') {
            buscarLances(supabase, loaded.id).then(({ lances: lList }) => {
              setLances(lList);
            });
          }
        } else {
          // Fallback mock
          setAd({
            id: adId,
            user_id: 'mock_seller_id',
            titulo: 'iPhone 13 128GB Meia-Noite - Saúde da Bateria 89%',
            preco: 2850,
            modalidade: 'leilao',
            aceita_troca: true,
            itens_troca: 'Aceito iPhone 12 + volta ou Dell i5 / MacBook Air M1.',
            lance_inicial: 2200,
            lance_atual: 2850,
            incremento_minimo: 50,
            leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
            descricao:
              'Aparelho em excelente estado de conservação, sem marcas de uso ou arranhões. Acompanha caixa original, cabo e nota fiscal. Aceito retirada em mãos em locais públicos.',
            cidade: 'São Paulo',
            estado: 'SP',
            bairro: 'Pinheiros',
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            visualizacoes: 42,
            categoria: { nome: 'Eletrônicos e celulares' },
            fotos: [
              { id: '1', url: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=800&q=80', is_principal: true },
              { id: '2', url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80', is_principal: false },
            ],
            anunciante: {
              id: 'mock_seller_id',
              nome: 'Carlos Eduardo',
              telefone: '11987654321',
            },
          });

          setReputacao({
            user_id: 'mock_seller_id',
            media_estrelas: 4.9,
            total_avaliacoes: 12,
          });

          setLances([
            {
              id: 'm1',
              anuncio_id: adId,
              usuario_id: 'u1',
              valor: 2850,
              created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
              usuario: { id: 'u1', nome: 'Mariana S.', avatar_url: null },
            },
            {
              id: 'm2',
              anuncio_id: adId,
              usuario_id: 'u2',
              valor: 2750,
              created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
              usuario: { id: 'u2', nome: 'Felipe A.', avatar_url: null },
            },
          ]);
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAd();
  }, [adId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#6E0AD6" />
        <Text style={styles.loadingText}>Carregando anúncio...</Text>
      </View>
    );
  }

  if (!ad) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyTitle}>Anúncio não encontrado</Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={onBack}>
          <Text style={styles.backHomeText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDono = user?.id === ad.user_id;
  const isLeilao = ad.modalidade === 'leilao';
  const aceitaTroca = Boolean(ad.aceita_troca);
  const currentPhoto = ad.fotos[activePhotoIndex]?.url || ad.fotos[0]?.url;

  const lanceAtualValor = ad.lance_atual || ad.lance_inicial || ad.preco;
  const incremento = ad.incremento_minimo || 10;
  const proximoMinimo = lanceAtualValor + incremento;

  const handleShowPhone = () => {
    if (ad.anunciante?.telefone) {
      Alert.alert('Telefone do Anunciante', formatPhoneNumber(ad.anunciante.telefone));
    } else {
      Alert.alert('Aviso', 'O anunciante prefere ser contatado pelo chat.');
    }
  };

  const handleStartChat = async () => {
    if (!ad) return;

    if (!user) {
      Alert.alert(
        'Login necessário',
        'Você precisa estar conectado à sua conta para conversar no chat.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: onOpenAuth },
        ]
      );
      return;
    }

    if (user.id === ad.user_id) {
      Alert.alert('Aviso', 'Você é o anunciante deste produto.');
      return;
    }

    setStartingChat(true);

    try {
      const { conversaId, error } = await obterOuCriarConversa(
        supabase,
        ad.id,
        ad.user_id,
        user.id
      );

      if (error) {
        Alert.alert('Erro', error.message);
        return;
      }

      if (conversaId) {
        onOpenChat(conversaId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao abrir chat';
      Alert.alert('Erro', msg);
    } finally {
      setStartingChat(false);
    }
  };

  const handleDarLance = async (valorFixo?: number) => {
    if (!ad) return;

    if (!user) {
      Alert.alert('Login necessário', 'Você precisa fazer login para dar lances no leilão.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fazer Login', onPress: onOpenAuth },
      ]);
      return;
    }

    if (user.id === ad.user_id) {
      Alert.alert('Aviso', 'Você é o proprietário do leilão e não pode dar lances.');
      return;
    }

    if (countdown.isEncerrado) {
      Alert.alert('Leilão Encerrado', 'O período de lances deste produto já terminou.');
      return;
    }

    const valor = valorFixo !== undefined ? valorFixo : parseFloat(novoLanceTexto.replace(',', '.'));

    if (isNaN(valor) || valor <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor de lance numérico válido.');
      return;
    }

    if (valor < proximoMinimo) {
      Alert.alert(
        'Lance insuficiente',
        `O lance mínimo atual é de ${formatCurrencyBRL(proximoMinimo)}.`
      );
      return;
    }

    setSubmittingBid(true);

    try {
      const { error } = await registrarLance(supabase, ad.id, valor);

      if (error) {
        Alert.alert('Falha ao registrar lance', error.message);
      } else {
        Alert.alert('Sucesso!', `Seu lance de ${formatCurrencyBRL(valor)} foi registrado com sucesso!`);
        setNovoLanceTexto('');
        setAd((prev) => (prev ? { ...prev, lance_atual: valor } : prev));
        const { lances: novosLances } = await buscarLances(supabase, ad.id);
        setLances(novosLances);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao registrar lance.');
    } finally {
      setSubmittingBid(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header com Botão Voltar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} style={styles.iconCircle}>
            <ArrowLeft size={20} color="#1B1B1B" />
          </TouchableOpacity>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconCircle}>
              <Share2 size={18} color="#1B1B1B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle}>
              <Heart size={18} color="#1B1B1B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Imagem WebP Ativa com Badges */}
        <View style={styles.imageWrapper}>
          {currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, styles.center]}>
              <Text style={{ color: '#ADB5BD' }}>Sem foto disponível</Text>
            </View>
          )}

          {/* Badges Flutuantes */}
          <View style={styles.floatingBadgesRow}>
            {ad.destacado_vitrine && (
              <View
                style={[
                  styles.floatingDestaqueBadge,
                  ad.tipo_destaque === 'global' && { backgroundColor: '#FFD700' },
                ]}
              >
                <Text
                  style={[
                    styles.floatingDestaqueBadgeText,
                    ad.tipo_destaque === 'global' && { color: '#3E2723' },
                  ]}
                >
                  {ad.tipo_destaque === 'global' ? '👑 DESTAQUE GLOBAL' : '🔥 DESTAQUE'}
                </Text>
              </View>
            )}
            {isLeilao && (
              <View style={styles.floatingAuctionBadge}>
                <Gavel size={12} color="#FFF" />
                <Text style={styles.floatingBadgeText}>Leilão Ativo</Text>
              </View>
            )}
            {aceitaTroca && (
              <View style={styles.floatingTradeBadge}>
                <Repeat size={12} color="#FFF" />
                <Text style={styles.floatingBadgeText}>Aceita Troca</Text>
              </View>
            )}
          </View>
        </View>

        {/* Miniaturas */}
        {ad.fotos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
            {ad.fotos.map((foto, idx) => (
              <TouchableOpacity
                key={foto.id || idx}
                onPress={() => setActivePhotoIndex(idx)}
                style={[
                  styles.thumbCard,
                  activePhotoIndex === idx && styles.thumbCardActive,
                ]}
              >
                <Image source={{ uri: foto.url }} style={styles.thumbImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.content}>
          {ad.categoria && (
            <View style={styles.categoryBadge}>
              <Tag size={12} color="#6E0AD6" />
              <Text style={styles.categoryBadgeText}>{ad.categoria.nome}</Text>
            </View>
          )}

          {/* BLOCO MODO LEILÃO EM TEMPO REAL ESTILO EBAY */}
          {isLeilao ? (
            <View style={styles.auctionBox}>
              <View style={styles.auctionTimerHeader}>
                <View style={styles.timerTitleRow}>
                  <Clock size={16} color="#FF6B00" />
                  <Text style={styles.timerTitle}>TEMPO RESTANTE</Text>
                </View>
                <View
                  style={[
                    styles.timerPill,
                    countdown.isEncerrado && { backgroundColor: '#FEE2E2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.timerPillText,
                      countdown.isEncerrado && { color: '#DC2626' },
                    ]}
                  >
                    {countdown.formatted || 'Calculando...'}
                  </Text>
                </View>
              </View>

              <View style={styles.bidInfoContainer}>
                <Text style={styles.bidInfoLabel}>MAIOR LANCE ATUAL (QUEM DÁ MAIS)</Text>
                <Text style={styles.bidPriceText}>{formatCurrencyBRL(lanceAtualValor)}</Text>
                <Text style={styles.bidMetaText}>
                  {lances.length} {lances.length === 1 ? 'lance dado' : 'lances dados'} • Mínimo: +R$ {incremento}
                </Text>
              </View>

              {/* Botões Rápidos e Ação de Lance */}
              {!isDono && !countdown.isEncerrado && (
                <View style={styles.biddingActionsBox}>
                  <Text style={styles.quickBidsTitle}>Dar lance rápido:</Text>
                  <View style={styles.quickButtonsRow}>
                    {[10, 50, 100].map((inc) => (
                      <TouchableOpacity
                        key={inc}
                        style={styles.quickBidButton}
                        onPress={() => handleDarLance(lanceAtualValor + inc)}
                        disabled={submittingBid}
                      >
                        <Text style={styles.quickBidButtonText}>+R$ {inc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.customBidRow}>
                    <TextInput
                      style={styles.customBidInput}
                      placeholder={`Mínimo: ${proximoMinimo}`}
                      value={novoLanceTexto}
                      onChangeText={setNovoLanceTexto}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.submitBidButton}
                      onPress={() => handleDarLance()}
                      disabled={submittingBid}
                    >
                      {submittingBid ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Gavel size={15} color="#FFF" />
                          <Text style={styles.submitBidButtonText}>Dar Lance</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Lista dos últimos lances */}
              {lances.length > 0 && (
                <View style={styles.recentBidsList}>
                  <Text style={styles.recentBidsTitle}>Últimos lances em tempo real:</Text>
                  {lances.slice(0, 4).map((l, idx) => (
                    <View key={l.id || idx} style={styles.recentBidRow}>
                      <Text style={styles.recentBidUser} numberOfLines={1}>
                        {idx === 0 ? '🏆 ' : ''}{l.usuario?.nome || 'Comprador'}
                      </Text>
                      <Text style={styles.recentBidValue}>{formatCurrencyBRL(l.valor)}</Text>
                      <Text style={styles.recentBidTime}>{formatRelativeDate(l.created_at)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.price}>{formatCurrencyBRL(ad.preco)}</Text>
            </View>
          )}

          <Text style={styles.title}>{ad.titulo}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.date}>Publicado {formatRelativeDate(ad.created_at)}</Text>
            <View style={styles.viewsBadge}>
              <Eye size={12} color="#6E0AD6" />
              <Text style={styles.viewsText}>
                {ad.visualizacoes} {ad.visualizacoes === 1 ? 'visita' : 'visitas'}
              </Text>
            </View>
          </View>

          {/* CARD DESTACADO: ACEITA TROCA / PERMUTA */}
          {aceitaTroca && (
            <View style={styles.tradeCardHighlight}>
              <View style={styles.tradeCardTopRow}>
                <View style={styles.tradeCardIcon}>
                  <Repeat size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.tradeCardTitle}>Aceita Troca / Permuta!</Text>
                  <Text style={styles.tradeCardSubtitle}>
                    O anunciante aceita negociar este item por outros produtos.
                  </Text>
                </View>
              </View>

              <View style={styles.tradeCardItemsBox}>
                <Text style={styles.tradeCardItemsLabel}>O QUE O VENDEDOR ACEITA NA TROCA:</Text>
                <Text style={styles.tradeCardItemsText}>
                  {ad.itens_troca || 'Aceita avaliar propostas de produtos equivalentes.'}
                </Text>
              </View>

              {!isDono && (
                <TouchableOpacity style={styles.tradeCardButton} onPress={handleStartChat}>
                  <Repeat size={16} color="#FFF" />
                  <Text style={styles.tradeCardButtonText}>Propor Troca no Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Descrição */}
          <Text style={styles.sectionHeader}>Descrição</Text>
          <Text style={styles.description}>{ad.descricao}</Text>

          <View style={styles.divider} />

          {/* Localização */}
          <Text style={styles.sectionHeader}>Localização</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color="#FF6B00" />
            <Text style={styles.locationText}>
              {ad.bairro ? `${ad.bairro}, ` : ''}{ad.cidade} - {ad.estado}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Vendedor com FEEDBACK STARS Estilo eBay */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>
                {ad.anunciante?.nome ? ad.anunciante.nome.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{ad.anunciante?.nome || 'Anunciante TroqJá'}</Text>

              {/* Reputação por Estrelas */}
              <View style={styles.reputationRow}>
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.reputationStarsText}>
                  {reputacao ? reputacao.media_estrelas.toFixed(1) : '5.0'}
                </Text>
                <Text style={styles.reputationCountText}>
                  ({reputacao?.total_avaliacoes || 0} {reputacao?.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'})
                </Text>
              </View>

              <Text style={styles.sellerInfo}>Perfil Verificado no TroqJá</Text>
            </View>
          </View>

          {/* Dica de Segurança */}
          <View style={styles.safetyBox}>
            <ShieldCheck size={18} color="#6E0AD6" />
            <Text style={styles.safetyText}>
              Negociação protegida pelo TroqJá. Sempre verifique o produto pessoalmente antes de concluir o negócio.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Barra Fixa Inferior de Contato */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.phoneButton} onPress={handleShowPhone}>
          <Phone size={18} color="#6E0AD6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatButton, startingChat && { opacity: 0.7 }]}
          onPress={handleStartChat}
          disabled={startingChat}
        >
          {startingChat ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <MessageCircle size={18} color="#FFF" />
              <Text style={styles.chatButtonText}>Chat com o anunciante</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6C757D',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 12,
  },
  backHomeButton: {
    backgroundColor: '#6E0AD6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backHomeText: {
    color: '#FFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  topBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#E9ECEF',
  },
  floatingBadgesRow: {
    position: 'absolute',
    top: 56,
    left: 12,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  floatingDestaqueBadge: {
    backgroundColor: '#FFB300',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  floatingDestaqueBadgeText: {
    color: '#3E2723',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  floatingAuctionBadge: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  floatingTradeBadge: {
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  floatingBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  thumbScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  thumbCard: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
  },
  thumbCardActive: {
    borderColor: '#FF6B00',
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6E0AD6',
  },
  price: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1B1B1B',
  },
  auctionBox: {
    backgroundColor: '#FFF7EE',
    borderWidth: 1.5,
    borderColor: '#FFD180',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  auctionTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  timerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E65100',
  },
  timerPill: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerPillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bidInfoContainer: {
    marginVertical: 10,
  },
  bidInfoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C757D',
    letterSpacing: 0.5,
  },
  bidPriceText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF6B00',
    marginTop: 2,
  },
  bidMetaText: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  biddingActionsBox: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  quickBidsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 6,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickBidButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBidButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E65100',
  },
  customBidRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customBidInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  submitBidButton: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  submitBidButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  recentBidsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  recentBidsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C757D',
    marginBottom: 6,
  },
  recentBidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  recentBidUser: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  recentBidValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B00',
    marginRight: 8,
  },
  recentBidTime: {
    fontSize: 10,
    color: '#ADB5BD',
  },
  tradeCardHighlight: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  tradeCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
  },
  tradeCardSubtitle: {
    fontSize: 11,
    color: '#2E7D32',
    marginTop: 1,
  },
  tradeCardItemsBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  tradeCardItemsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  tradeCardItemsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
  },
  tradeCardButton: {
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tradeCardButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginTop: 4,
    lineHeight: 22,
  },
  date: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  viewsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#495057',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F5',
    marginVertical: 14,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#495057',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6E0AD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  reputationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reputationStarsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B1B1B',
  },
  reputationCountText: {
    fontSize: 11,
    color: '#6C757D',
  },
  sellerInfo: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  safetyBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  safetyText: {
    flex: 1,
    fontSize: 11,
    color: '#5B21B6',
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  phoneButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6E0AD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
