import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  buscarMeusAnuncios,
  atualizarStatusAnuncio,
  excluirAnuncio,
  destacarAnuncioVitrine,
  formatBRL,
  formatRelativeDate,
  SUPABASE_TABLES,
} from '@olx-clone/shared';
import type { MeuAnuncioItem, StatusAnuncio } from '@olx-clone/shared';
import {
  ArrowLeft,
  Package,
  PlusCircle,
  Eye,
  Trash2,
  Pause,
  Play,
  CheckCircle,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react-native';

type TabStatus = 'todos' | 'ativo' | 'pausado' | 'vendido';

interface MyAdsScreenProps {
  onBack: () => void;
  onSelectAd: (id: string) => void;
  onNavigateToCreate: () => void;
}

export function MyAdsScreen({ onBack, onSelectAd, onNavigateToCreate }: MyAdsScreenProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [anuncios, setAnuncios] = useState<MeuAnuncioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabStatus>('todos');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const carregarAnuncios = useCallback(async () => {
    if (!user) return;
    const { anuncios: lista, error } = await buscarMeusAnuncios(supabase, user.id);
    if (!error) {
      setAnuncios(lista);
    } else {
      Alert.alert('Erro', 'Não foi possível carregar seus anúncios.');
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    carregarAnuncios();

    if (!user?.id) return;

    // Escuta atualizações de visualizações e status em tempo real via Supabase Realtime
    const channel = supabase
      .channel(`mobile_realtime_meus_anuncios_${user.id}`)
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
  }, [carregarAnuncios, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    carregarAnuncios();
  };

  const handleMudarStatus = async (anuncioId: string, novoStatus: StatusAnuncio) => {
    setProcessingId(anuncioId);
    const { success, error } = await atualizarStatusAnuncio(supabase, anuncioId, novoStatus);

    if (success) {
      setAnuncios((prev) =>
        prev.map((ad) => (ad.id === anuncioId ? { ...ad, status: novoStatus } : ad))
      );
    } else {
      Alert.alert('Erro', error?.message || 'Falha ao alterar status.');
    }
    setProcessingId(null);
  };

  const handleExcluir = (anuncio: MeuAnuncioItem) => {
    Alert.alert(
      'Excluir Anúncio',
      `Tem certeza que deseja excluir "${anuncio.titulo}"? Esta ação não pode ser revertida.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(anuncio.id);
            const { success, error } = await excluirAnuncio(supabase, anuncio.id);
            if (success) {
              setAnuncios((prev) => prev.filter((a) => a.id !== anuncio.id));
              Alert.alert('Sucesso', 'Anúncio excluído com sucesso.');
            } else {
              Alert.alert('Erro', error?.message || 'Falha ao excluir anúncio.');
            }
            setProcessingId(null);
          },
        },
      ]
    );
  };

  const handleTurbinarAnuncio = (anuncio: MeuAnuncioItem) => {
    const executarDestaque = async (opcao: 'avulso' | 'pacote_10' | 'credito') => {
      setProcessingId(anuncio.id);
      const { success, error } = await destacarAnuncioVitrine(supabase, anuncio.id, opcao);
      if (success) {
        const tipoAplicado: 'global' | 'categoria' = opcao === 'avulso' ? 'global' : 'categoria';
        setAnuncios((prev) =>
          prev.map((a) =>
            a.id === anuncio.id
              ? { ...a, destacado_vitrine: true, tipo_destaque: tipoAplicado }
              : a
          )
        );
        await refreshProfile();
        Alert.alert(
          tipoAplicado === 'global' ? '👑 Destaque Global Ativado!' : '🔥 Destaque na Categoria Ativado!',
          `O anúncio "${anuncio.titulo}" agora está com ${
            tipoAplicado === 'global'
              ? 'Destaque Global ativo em todas as categorias da plataforma!'
              : 'Destaque ativo na sua categoria correspondente!'
          }`
        );
      } else {
        Alert.alert('Erro', error?.message || 'Falha ao aplicar destaque.');
      }
      setProcessingId(null);
    };

    const botoes: any[] = [
      {
        text: 'Opção A: Global R$ 1,99 (Todas Cats)',
        onPress: () => executarDestaque('avulso'),
      },
      {
        text: 'Opção B: Pacote 10 R$ 4,90 (Categoria)',
        onPress: () => executarDestaque('pacote_10'),
      },
    ];

    if ((profile?.creditos_destaque_vitrine ?? 0) > 0) {
      botoes.unshift({
        text: `Usar 1 Crédito da Categoria (${profile?.creditos_destaque_vitrine} disp.)`,
        onPress: () => executarDestaque('credito'),
      });
    }

    botoes.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(
      'Turbinar Anúncio na Vitrine',
      'Opção A: Destaque Global (R$ 1,99) aparece no carrossel de TODAS as categorias e busca geral.\n\nOpção B: Pacote 10 Destaques (R$ 4,90) usa 1 crédito na categoria do anúncio.',
      botoes
    );
  };

  const contagens = {
    todos: anuncios.length,
    ativo: anuncios.filter((a) => a.status === 'ativo').length,
    pausado: anuncios.filter((a) => a.status === 'pausado').length,
    vendido: anuncios.filter((a) => a.status === 'vendido').length,
  };

  const anunciosFiltrados =
    activeTab === 'todos' ? anuncios : anuncios.filter((a) => a.status === activeTab);

  const renderStatusBadge = (status: StatusAnuncio) => {
    if (status === 'ativo') {
      return (
        <View style={[styles.badge, styles.badgeAtivo]}>
          <View style={[styles.badgeDot, { backgroundColor: '#16A34A' }]} />
          <Text style={[styles.badgeText, { color: '#166534' }]}>Ativo</Text>
        </View>
      );
    }
    if (status === 'pausado') {
      return (
        <View style={[styles.badge, styles.badgePausado]}>
          <View style={[styles.badgeDot, { backgroundColor: '#D97706' }]} />
          <Text style={[styles.badgeText, { color: '#92400E' }]}>Pausado</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeVendido]}>
        <View style={[styles.badgeDot, { backgroundColor: '#6B7280' }]} />
        <Text style={[styles.badgeText, { color: '#374151' }]}>Vendido</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#1B1B1B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Anúncios</Text>
        <TouchableOpacity style={styles.createButton} onPress={onNavigateToCreate}>
          <PlusCircle size={22} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'todos' && styles.tabItemActive]}
          onPress={() => setActiveTab('todos')}
        >
          <Text style={[styles.tabText, activeTab === 'todos' && styles.tabTextActive]}>
            Todos ({contagens.todos})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ativo' && styles.tabItemActive]}
          onPress={() => setActiveTab('ativo')}
        >
          <Text style={[styles.tabText, activeTab === 'ativo' && styles.tabTextActive]}>
            Ativos ({contagens.ativo})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pausado' && styles.tabItemActive]}
          onPress={() => setActiveTab('pausado')}
        >
          <Text style={[styles.tabText, activeTab === 'pausado' && styles.tabTextActive]}>
            Pausados ({contagens.pausado})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'vendido' && styles.tabItemActive]}
          onPress={() => setActiveTab('vendido')}
        >
          <Text style={[styles.tabText, activeTab === 'vendido' && styles.tabTextActive]}>
            Vendidos ({contagens.vendido})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6E0AD6" />
          <Text style={styles.loadingText}>Carregando anúncios...</Text>
        </View>
      ) : (
        <FlatList
          data={anunciosFiltrados}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6E0AD6']} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Package size={36} color="#6E0AD6" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'todos'
                  ? 'Você ainda não possui anúncios'
                  : `Nenhum anúncio ${activeTab}`}
              </Text>
              <Text style={styles.emptySubtitle}>
                Desapegue do que não usa mais e alcance milhares de compradores!
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={onNavigateToCreate}>
                <PlusCircle size={16} color="#FFF" />
                <Text style={styles.emptyButtonText}>Criar anúncio agora</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => {
            const isProcessing = processingId === item.id;

            return (
              <View style={styles.adCard}>
                <TouchableOpacity
                  style={styles.adMainContent}
                  onPress={() => onSelectAd(item.id)}
                  activeOpacity={0.8}
                >
                  {/* Foto de Capa */}
                  <View style={styles.imageContainer}>
                    {item.foto_principal_url ? (
                      <Image source={{ uri: item.foto_principal_url }} style={styles.image} />
                    ) : (
                      <View style={styles.noImage}>
                        <Package size={24} color="#9E9E9E" />
                        <Text style={styles.noImageText}>Sem foto</Text>
                      </View>
                    )}
                  </View>

                  {/* Informações */}
                  <View style={styles.infoContainer}>
                    <View style={styles.rowBetween}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {renderStatusBadge(item.status)}
                        {item.destacado_vitrine && (
                          <View
                            style={[
                              styles.destaqueActiveBadge,
                              item.tipo_destaque === 'global' && { backgroundColor: '#FFD700' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.destaqueActiveBadgeText,
                                item.tipo_destaque === 'global' && { color: '#3E2723' },
                              ]}
                            >
                              {item.tipo_destaque === 'global' ? '👑 GLOBAL' : '🔥 CATEGORIA'}
                            </Text>
                          </View>
                        )}
                      </View>
                      {item.categoria_nome && (
                        <Text style={styles.categoryTag} numberOfLines={1}>
                          {item.categoria_nome}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.adTitle} numberOfLines={2}>
                      {item.titulo}
                    </Text>

                    <Text style={styles.adPrice}>{formatBRL(item.preco)}</Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <MapPin size={12} color="#9E9E9E" />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {item.cidade} - {item.estado}
                        </Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Eye size={12} color="#9E9E9E" />
                        <Text style={styles.metaText}>{item.visualizacoes}</Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Calendar size={12} color="#9E9E9E" />
                        <Text style={styles.metaText}>{formatRelativeDate(item.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Barra de Ações Rápidas */}
                <View style={styles.actionsBar}>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#6E0AD6" style={{ marginVertical: 6 }} />
                  ) : (
                    <>
                      {/* Botões de Status */}
                      <View style={styles.statusButtonsGroup}>
                        {item.status === 'ativo' && (
                          <>
                            {!item.destacado_vitrine && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnTurbinar]}
                                onPress={() => handleTurbinarAnuncio(item)}
                              >
                                <Sparkles size={13} color="#3E2723" />
                                <Text style={styles.btnTurbinarText}>Turbinar</Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.btnPausar]}
                              onPress={() => handleMudarStatus(item.id, 'pausado')}
                            >
                              <Pause size={13} color="#92400E" />
                              <Text style={styles.btnPausarText}>Pausar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.btnVendido]}
                              onPress={() => handleMudarStatus(item.id, 'vendido')}
                            >
                              <CheckCircle size={13} color="#374151" />
                              <Text style={styles.btnVendidoText}>Vendido</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {item.status === 'pausado' && (
                          <>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.btnAtivar]}
                              onPress={() => handleMudarStatus(item.id, 'ativo')}
                            >
                              <Play size={13} color="#166534" />
                              <Text style={styles.btnAtivarText}>Ativar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.btnVendido]}
                              onPress={() => handleMudarStatus(item.id, 'vendido')}
                            >
                              <CheckCircle size={13} color="#374151" />
                              <Text style={styles.btnVendidoText}>Vendido</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {item.status === 'vendido' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.btnReativar]}
                            onPress={() => handleMudarStatus(item.id, 'ativo')}
                          >
                            <Play size={13} color="#6E0AD6" />
                            <Text style={styles.btnReativarText}>Reativar</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Botão Excluir */}
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleExcluir(item)}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B1B1B',
  },
  createButton: {
    padding: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    gap: 6,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
  },
  tabItemActive: {
    backgroundColor: '#6E0AD6',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#495057',
  },
  tabTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6C757D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B1B1B',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  adCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 12,
    overflow: 'hidden',
  },
  adMainContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#F1F3F5',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 9,
    color: '#9E9E9E',
    marginTop: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeAtivo: {
    backgroundColor: '#DCFCE7',
  },
  badgePausado: {
    backgroundColor: '#FEF3C7',
  },
  badgeVendido: {
    backgroundColor: '#F3F4F6',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  categoryTag: {
    fontSize: 10,
    color: '#6C757D',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B1B1B',
    marginTop: 4,
  },
  adPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1B1B1B',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 10,
    color: '#6C757D',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  statusButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnPausar: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  btnTurbinar: {
    backgroundColor: '#FFD54F',
    borderColor: '#FFC107',
  },
  btnTurbinarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3E2723',
  },
  destaqueActiveBadge: {
    backgroundColor: '#FFB300',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  destaqueActiveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3E2723',
  },
  btnPausarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  btnAtivar: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  btnAtivarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  btnVendido: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  btnVendidoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  btnReativar: {
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
  },
  btnReativarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6E0AD6',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
  },
});
