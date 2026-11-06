import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
} from '@olx-clone/shared';
import {
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  Gavel,
  Repeat,
  Bell,
} from 'lucide-react-native';

interface WishlistScreenProps {
  onSelectAd: (adId: string) => void;
  onOpenAuth: () => void;
}

export function WishlistScreen({ onSelectAd, onOpenAuth }: WishlistScreenProps) {
  const { user, profile, refreshProfile, refreshWishlistCount } = useAuth();

  const [desejos, setDesejos] = useState<(ListaDesejo & { categoria?: { id: string; nome: string } | null })[]>([]);
  const [notificacoes, setNotificacoes] = useState<NotificacaoDesejoComAnuncio[]>([]);
  const [loading, setLoading] = useState(true);

  const [novoTermo, setNovoTermo] = useState('');
  const [salvandoDesejo, setSalvandoDesejo] = useState(false);
  const [ativandoVip, setAtivandoVip] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [desejosRes, notifRes] = await Promise.all([
        buscarListaDesejos(supabase, user.id),
        buscarNotificacoesDesejos(supabase, user.id),
      ]);

      if (desejosRes.desejos) setDesejos(desejosRes.desejos);
      if (notifRes.notificacoes) setNotificacoes(notifRes.notificacoes);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Supabase Realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`mobile_wishlist_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_TABLES.NOTIFICACOES_DESEJOS,
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          carregarDados();
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
          carregarDados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, carregarDados, refreshWishlistCount]);

  const handleAdicionar = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!novoTermo.trim()) {
      Alert.alert('Campo vazio', 'Informe o produto que deseja monitorar.');
      return;
    }

    setSalvandoDesejo(true);
    try {
      const isVip = Boolean(profile?.assinante_comprador_desejos);
      const res = await adicionarDesejo(supabase, {
        usuario_id: user.id,
        termo_desejo: novoTermo.trim(),
        alerta_vip_ativo: isVip,
      });

      if (res.error) {
        Alert.alert('Erro', res.error.message);
      } else {
        setNovoTermo('');
        Alert.alert('Sucesso!', `Item "${novoTermo.trim()}" adicionado à Lista de Desejos!`);
        await carregarDados();
      }
    } finally {
      setSalvandoDesejo(false);
    }
  };

  const handleRemover = async (id: string) => {
    if (!user) return;
    const res = await removerDesejo(supabase, id, user.id);
    if (!res.error) {
      setDesejos((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleAtivarComprador = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setAtivandoVip(true);
    try {
      const res = await ativarAssinaturaComprador(supabase, user.id);
      if (res.error) {
        Alert.alert('Erro', res.error.message);
      } else {
        await refreshProfile();
        await carregarDados();
        refreshWishlistCount();
        Alert.alert('Parabéns!', 'Radar VIP ativado por R$ 1,99/mês. Todos os matches foram desbloqueados!');
      }
    } finally {
      setAtivandoVip(false);
    }
  };

  const handleVerAnuncio = async (adId: string, notifId: string) => {
    await marcarNotificacaoDesejoComoLida(supabase, notifId);
    refreshWishlistCount();
    onSelectAd(adId);
  };

  const isCompradorVip = Boolean(profile?.assinante_comprador_desejos);

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authIconCircle}>
          <Sparkles size={36} color="#00C853" />
        </View>
        <Text style={styles.authTitle}>Lista de Desejos & Radar</Text>
        <Text style={styles.authSubtitle}>
          Faça login para cadastrar produtos que deseja trocar ou comprar e receba alertas automáticos em tempo real.
        </Text>
        <TouchableOpacity style={styles.authButton} onPress={onOpenAuth}>
          <Text style={styles.authButtonText}>Entrar ou Cadastrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.tagPill}>
          <Sparkles size={12} color="#00C853" />
          <Text style={styles.tagPillText}>Radar TroqJá</Text>
        </View>
        <Text style={styles.title}>Lista de Desejos & Matches</Text>
        <Text style={styles.subtitle}>
          Monitore produtos de seu interesse e feche trocas ou compras assim que novos itens forem publicados.
        </Text>
      </View>

      {/* ASSINATURA EXCLUSIVA: RADAR VIP DO COMPRADOR (R$ 1,99/MÊS) */}
      <View style={styles.vipPromoCard}>
        <View style={styles.vipPromoHeader}>
          <View style={styles.subIconCircleVip}>
            <Sparkles size={20} color="#FFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.vipPromoTitle}>Radar VIP do Comprador</Text>
              <View style={styles.vipPromoBadge}>
                <Text style={styles.vipPromoBadgeText}>R$ 1,99/mês</Text>
              </View>
            </View>
            <Text style={styles.vipPromoDesc}>
              Receba alertas em tempo real e desbloqueie fotos, propostas e contatos em todos os matches.
            </Text>
          </View>
        </View>

        {isCompradorVip ? (
          <View style={styles.subBadgeActiveFull}>
            <Check size={14} color="#FFF" />
            <Text style={styles.subBadgeActiveText}>Assinatura Radar VIP Ativa</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.subButtonVipFull}
            onPress={handleAtivarComprador}
            disabled={ativandoVip}
          >
            {ativandoVip ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Unlock size={14} color="#FFF" />
                <Text style={styles.subButtonText}>Assinar Radar VIP por R$ 1,99/mês</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* FORMULÁRIO DE NOVO DESEJO */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Cadastrar Novo Item de Interesse</Text>
        <View style={styles.formRow}>
          <TextInput
            style={styles.formInput}
            placeholder="Ex: iPhone 14, PS5, Bicicleta aro 29..."
            value={novoTermo}
            onChangeText={setNovoTermo}
          />
          <TouchableOpacity
            style={styles.formButton}
            onPress={handleAdicionar}
            disabled={salvandoDesejo}
          >
            {salvandoDesejo ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Plus size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Termos Monitorados */}
        {desejos.length > 0 && (
          <View style={styles.termsContainer}>
            <Text style={styles.termsLabel}>Itens que você monitora ({desejos.length}):</Text>
            <View style={styles.termsChipsRow}>
              {desejos.map((d) => (
                <View key={d.id} style={styles.termChip}>
                  <Text style={styles.termChipText}>{d.termo_desejo}</Text>
                  <TouchableOpacity onPress={() => handleRemover(d.id)}>
                    <Trash2 size={12} color="#DC3545" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* LISTA DE MATCHES EM TEMPO REAL */}
      <View style={styles.matchesSection}>
        <View style={styles.matchesHeader}>
          <Bell size={16} color="#FF6B00" />
          <Text style={styles.matchesTitle}>Matches Encontrados ({notificacoes.length})</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00C853" style={{ marginVertical: 20 }} />
        ) : notificacoes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Sparkles size={32} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>Nenhum match recente</Text>
            <Text style={styles.emptySubtitle}>
              Assim que um usuário anunciar um item correspondente à sua lista, ele aparecerá aqui!
            </Text>
          </View>
        ) : (
          notificacoes.map((notif) => {
            const isBloqueada = notif.bloqueada_monetizacao && !isCompradorVip;
            const ad = notif.anuncio;

            if (isBloqueada) {
              return (
                <View key={notif.id} style={styles.lockedMatchCard}>
                  <View style={styles.lockedHeader}>
                    <Lock size={16} color="#6C757D" />
                    <Text style={styles.lockedBadge}>Match Bloqueado</Text>
                    <Text style={styles.notifTime}>{formatRelativeDate(notif.created_at)}</Text>
                  </View>
                  <Text style={styles.lockedTitle}>
                    Novo anúncio correspondente a &quot;{notif.desejo?.termo_desejo || 'seu desejo'}&quot;!
                  </Text>
                  <Text style={styles.lockedDesc}>
                    Alguém acabou de publicar este item. Desbloqueie todas as fotos e detalhes por R$ 1,99/mês.
                  </Text>
                  <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={handleAtivarComprador}
                    disabled={ativandoVip}
                  >
                    <Unlock size={14} color="#FFF" />
                    <Text style={styles.unlockButtonText}>Desbloquear por R$ 1,99/mês</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <View
                key={notif.id}
                style={styles.unlockedMatchCard}
              >
                <View style={styles.matchTopRow}>
                  <View style={styles.vipBadge}>
                    <Sparkles size={10} color="#00C853" />
                    <Text style={styles.vipBadgeText}>Radar VIP</Text>
                  </View>
                  <Text style={styles.notifTime}>{formatRelativeDate(notif.created_at)}</Text>
                </View>

                {ad ? (
                  <View style={styles.adRow}>
                    <View style={styles.adThumbnail}>
                      {ad.foto_principal_url ? (
                        <Image
                          source={{ uri: ad.foto_principal_url }}
                          style={styles.adImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 9, color: '#ADB5BD' }}>Sem foto</Text>
                      )}
                    </View>

                    <View style={styles.adInfo}>
                      <Text style={styles.adTitle} numberOfLines={1}>
                        {ad.titulo}
                      </Text>
                      <Text style={styles.adPrice}>{formatCurrencyBRL(ad.preco)}</Text>

                      <View style={styles.adBadgesRow}>
                        {ad.modalidade === 'leilao' && (
                          <View style={styles.adBadgeLeilao}>
                            <Gavel size={9} color="#FF6B00" />
                            <Text style={styles.adBadgeLeilaoText}>Leilão</Text>
                          </View>
                        )}
                        {(ad.modalidade === 'troca' || ad.aceita_troca) && (
                          <View style={styles.adBadgeTroca}>
                            <Repeat size={9} color="#00C853" />
                            <Text style={styles.adBadgeTrocaText}>Troca</Text>
                          </View>
                        )}
                        <Text style={styles.adLocation}>
                          {ad.cidade} - {ad.estado}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: '#6C757D' }}>Anúncio indisponível.</Text>
                )}

                {ad && (
                  <TouchableOpacity
                    style={styles.viewAdButton}
                    onPress={() => handleVerAnuncio(ad.id, notif.id)}
                  >
                    <Text style={styles.viewAdButtonText}>Ver Anúncio</Text>
                    <ChevronRight size={14} color="#6E0AD6" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1B5E20',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#212529',
  },
  subtitle: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
    lineHeight: 16,
  },
  subCardsContainer: {
    gap: 10,
    marginBottom: 14,
  },
  vipPromoCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    borderRadius: 14,
    padding: 14,
  },
  vipPromoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vipPromoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
  },
  vipPromoBadge: {
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vipPromoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1B5E20',
  },
  vipPromoDesc: {
    fontSize: 11,
    color: '#2E7D32',
    marginTop: 2,
    lineHeight: 15,
  },
  subButtonVipFull: {
    backgroundColor: '#00C853',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBadgeActiveFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00C853',
    paddingVertical: 8,
    borderRadius: 10,
  },
  subCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 14,
    padding: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subIconCircleVip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212529',
  },
  subCardPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1B5E20',
  },
  subCardDesc: {
    fontSize: 11,
    color: '#495057',
    marginTop: 6,
    marginBottom: 10,
    lineHeight: 15,
  },
  subButtonVip: {
    backgroundColor: '#00C853',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  subButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  subBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#00C853',
    paddingVertical: 6,
    borderRadius: 8,
  },
  subBadgeActiveText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212529',
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#212529',
  },
  formButton: {
    backgroundColor: '#00C853',
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  termsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C757D',
    marginBottom: 6,
  },
  termsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  termChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  termChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#343A40',
  },
  matchesSection: {
    marginTop: 4,
  },
  matchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  matchesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212529',
  },
  emptyBox: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#495057',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  lockedMatchCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CED4DA',
    padding: 12,
    marginBottom: 10,
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  lockedBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#495057',
    textTransform: 'uppercase',
  },
  notifTime: {
    fontSize: 10,
    color: '#ADB5BD',
    marginLeft: 'auto',
  },
  lockedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212529',
  },
  lockedDesc: {
    fontSize: 11,
    color: '#6C757D',
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 15,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00C853',
    paddingVertical: 8,
    borderRadius: 8,
  },
  unlockButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  unlockedMatchCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 12,
    marginBottom: 10,
  },
  matchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6E0AD6',
    textTransform: 'uppercase',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vipBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1B5E20',
    textTransform: 'uppercase',
  },
  adRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  adThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E9ECEF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212529',
  },
  adPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#212529',
    marginTop: 2,
  },
  adBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  adBadgeLeilao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adBadgeLeilaoText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#E65100',
  },
  adBadgeTroca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adBadgeTrocaText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1B5E20',
  },
  adLocation: {
    fontSize: 10,
    color: '#6C757D',
  },
  viewAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  viewAdButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6E0AD6',
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8F9FA',
  },
  authIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#212529',
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 280,
  },
  authButton: {
    backgroundColor: '#00C853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  authButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
