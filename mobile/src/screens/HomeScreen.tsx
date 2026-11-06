import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Search, MapPin, User as UserIcon, X, Gavel, Repeat, Tag } from 'lucide-react-native';
import { AdCard } from '../components/AdCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { buscarAnuncios } from '@olx-clone/shared';
import type { AnuncioCard } from '@olx-clone/shared';

const SAMPLE_ADS: AnuncioCard[] = [
  {
    id: '1',
    titulo: 'iPhone 13 128GB Meia-Noite - Saúde da Bateria 89%',
    preco: 2850,
    modalidade: 'leilao',
    aceita_troca: true,
    itens_troca: 'Aceito iPhone 12 + volta ou Dell i5',
    lance_inicial: 2000,
    lance_atual: 2850,
    incremento_minimo: 50,
    leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
    cidade: 'São Paulo',
    estado: 'SP',
    bairro: 'Pinheiros',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Eletrônicos',
  },
  {
    id: '2',
    titulo: 'Honda Civic 2.0 EXL Automático 2020 Impecável',
    preco: 98900,
    modalidade: 'venda',
    aceita_troca: true,
    itens_troca: 'Aceito carro de menor valor',
    cidade: 'Campinas',
    estado: 'SP',
    bairro: 'Cambuí',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Autos e peças',
  },
  {
    id: '3',
    titulo: 'PlayStation 5 Disc Edition com 2 Controles',
    preco: 3200,
    modalidade: 'leilao',
    aceita_troca: false,
    lance_inicial: 2500,
    lance_atual: 3200,
    incremento_minimo: 50,
    leilao_encerramento: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    cidade: 'Santos',
    estado: 'SP',
    bairro: 'Gonzaga',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Eletrônicos',
  },
  {
    id: '4',
    titulo: 'Apartamento 2 Quartos 65m² com Varanda Gourmet',
    preco: 420000,
    modalidade: 'venda',
    aceita_troca: false,
    cidade: 'Santos',
    estado: 'SP',
    bairro: 'Gonzaga',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    foto_principal_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80',
    categoria_nome: 'Imóveis',
  },
];

const CATEGORIES = [
  { id: '1', nome: 'Autos', slug: 'autos-e-pecas' },
  { id: '2', nome: 'Imóveis', slug: 'imoveis' },
  { id: '3', nome: 'Celulares', slug: 'eletronicos-e-celulares' },
  { id: '4', nome: 'Para Casa', slug: 'para-a-sua-casa' },
  { id: '5', nome: 'Moda', slug: 'moda-e-beleza' },
  { id: '6', nome: 'Música', slug: 'musica-e-hobbies' },
  { id: '7', nome: 'Esportes', slug: 'esportes-e-lazer' },
];

interface HomeScreenProps {
  onSelectAd: (id: string) => void;
  onNavigateToCreate: () => void;
  onNavigateToAuth?: () => void;
}

export function HomeScreen({ onSelectAd, onNavigateToCreate, onNavigateToAuth }: HomeScreenProps) {
  const { user, profile } = useAuth();
  const [ads, setAds] = useState<AnuncioCard[]>(SAMPLE_ADS);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'todos' | 'venda' | 'leilao' | 'troca'>('todos');

  const fetchAds = useCallback(async () => {
    try {
      const modalidadeFiltro = selectedType === 'venda' ? 'venda' : selectedType === 'leilao' ? 'leilao' : undefined;
      const aceitaTrocaFiltro = selectedType === 'troca' ? true : undefined;

      const { anuncios: data, error } = await buscarAnuncios(supabase, {
        termo: searchTerm.trim() || undefined,
        categoria_slug: selectedCategory || undefined,
        modalidade: modalidadeFiltro,
        aceita_troca: aceitaTrocaFiltro,
        status: 'ativo',
        limite: 15,
      });

      if (!error && data && data.length > 0) {
        setAds(data);
        return;
      }

      // Se não houver dados no banco, filtra os mocks locais
      let filtered = [...SAMPLE_ADS];
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        filtered = filtered.filter((ad) => ad.titulo.toLowerCase().includes(t));
      }
      if (selectedCategory) {
        const catMap: Record<string, string> = {
          'autos-e-pecas': 'Autos e peças',
          'imoveis': 'Imóveis',
          'eletronicos-e-celulares': 'Eletrônicos',
          'para-a-sua-casa': 'Para sua casa',
        };
        const expected = catMap[selectedCategory];
        if (expected) {
          filtered = filtered.filter((ad) => ad.categoria_nome === expected);
        }
      }
      if (selectedType === 'venda') {
        filtered = filtered.filter((ad) => ad.modalidade === 'venda');
      } else if (selectedType === 'leilao') {
        filtered = filtered.filter((ad) => ad.modalidade === 'leilao');
      } else if (selectedType === 'troca') {
        filtered = filtered.filter((ad) => ad.aceita_troca);
      }

      setAds(filtered);
    } catch (err) {
      console.warn('Erro ao carregar anúncios reais no mobile:', err);
    }
  }, [searchTerm, selectedCategory, selectedType]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAds();
    setRefreshing(false);
  };

  const getGreeting = () => {
    if (profile?.nome) {
      return `Olá, ${profile.nome.split(' ')[0]}!`;
    }
    if (user?.email) {
      return `Olá, ${user.email.split('@')[0]}!`;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Troq<Text style={styles.logoTextAccent}>Já</Text></Text>
          <View style={styles.logoDot} />
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.locationButton}>
            <MapPin size={14} color="#FF6B00" />
            <Text style={styles.locationText}>São Paulo e região</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.authBadge}
            onPress={onNavigateToAuth}
          >
            <UserIcon size={16} color="#6E0AD6" />
            <Text style={styles.authBadgeText} numberOfLines={1}>
              {getGreeting() || 'Entrar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9E9E9E" />
          <TextInput
            placeholder="Buscar no TroqJá..."
            placeholderTextColor="#9E9E9E"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={fetchAds}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchBtn}>
              <X size={16} color="#9E9E9E" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6E0AD6']} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Nenhum anúncio encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Tente buscar com outros termos ou remover os filtros aplicados.
            </Text>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => {
                setSearchTerm('');
                setSelectedCategory(null);
              }}
            >
              <Text style={styles.clearFilterButtonText}>Limpar filtros</Text>
            </TouchableOpacity>
          </View>
        )}
        ListHeaderComponent={() => (
          <View>
            {/* Banner Promocional TroqJá */}
            <TouchableOpacity
              style={styles.ctaBanner}
              onPress={onNavigateToCreate}
              activeOpacity={0.9}
            >
              <View style={styles.ctaBannerContent}>
                <Text style={styles.ctaBannerTitle}>Anunciou, trocou, fechou!</Text>
                <Text style={styles.ctaBannerSubtitle}>Publique grátis no TroqJá e negocie em minutos</Text>
              </View>
              <View style={styles.ctaBannerButton}>
                <Text style={styles.ctaBannerButtonText}>Anunciar</Text>
              </View>
            </TouchableOpacity>

            {/* Horizontal Categories */}
            <Text style={styles.sectionTitle}>Categorias</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory(isSelected ? null : cat.slug)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Filtros Rápidos TroqJá (Todos, Venda Direta, Leilões, Aceita Troca) */}
            <View style={styles.quickFiltersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFiltersScroll}>
                <TouchableOpacity
                  style={[styles.quickFilterChip, selectedType === 'todos' && styles.quickFilterChipActiveAll]}
                  onPress={() => setSelectedType('todos')}
                >
                  <Text style={[styles.quickFilterText, selectedType === 'todos' && styles.quickFilterTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickFilterChip, selectedType === 'venda' && styles.quickFilterChipActiveVenda]}
                  onPress={() => setSelectedType('venda')}
                >
                  <Tag size={13} color={selectedType === 'venda' ? '#FFF' : '#6E0AD6'} />
                  <Text style={[styles.quickFilterText, selectedType === 'venda' && styles.quickFilterTextActive]}>
                    Venda Direta
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickFilterChip, selectedType === 'leilao' && styles.quickFilterChipActiveLeilao]}
                  onPress={() => setSelectedType('leilao')}
                >
                  <Gavel size={13} color={selectedType === 'leilao' ? '#FFF' : '#FF6B00'} />
                  <Text style={[styles.quickFilterText, selectedType === 'leilao' && styles.quickFilterTextActive]}>
                    Leilões
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickFilterChip, selectedType === 'troca' && styles.quickFilterChipActiveTroca]}
                  onPress={() => setSelectedType('troca')}
                >
                  <Repeat size={13} color={selectedType === 'troca' ? '#FFF' : '#00C853'} />
                  <Text style={[styles.quickFilterText, selectedType === 'troca' && styles.quickFilterTextActive]}>
                    Aceita Troca
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Filtros ativos resumo */}
            {(searchTerm || selectedCategory || selectedType !== 'todos') && (
              <View style={styles.activeFiltersRow}>
                <Text style={styles.activeFiltersLabel}>Filtrando por:</Text>
                {selectedType !== 'todos' ? (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>
                      {selectedType === 'venda' ? 'Venda' : selectedType === 'leilao' ? 'Leilão' : 'Troca'}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedType('todos')}>
                      <X size={12} color="#6E0AD6" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {searchTerm ? (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>&quot;{searchTerm}&quot;</Text>
                    <TouchableOpacity onPress={() => setSearchTerm('')}>
                      <X size={12} color="#6E0AD6" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {selectedCategory ? (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>
                      {CATEGORIES.find((c) => c.slug === selectedCategory)?.nome}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                      <X size={12} color="#6E0AD6" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  onPress={() => {
                    setSearchTerm('');
                    setSelectedCategory(null);
                    setSelectedType('todos');
                  }}
                >
                  <Text style={styles.clearAllText}>Limpar</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Anúncios em destaque</Text>
              <Text style={styles.seeAllText}>Puxe para atualizar</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <AdCard anuncio={item} onPress={() => onSelectAd(item.id)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  authBadgeText: {
    fontSize: 12,
    color: '#6E0AD6',
    fontWeight: '700',
    maxWidth: 90,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  logoTextAccent: {
    color: '#FF6B00',
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B00',
    marginTop: 18,
    marginLeft: 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  locationText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1B1B1B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  ctaBanner: {
    backgroundColor: '#6E0AD6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaBannerContent: {
    flex: 1,
    marginRight: 10,
  },
  ctaBannerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  ctaBannerSubtitle: {
    color: '#E9D5FF',
    fontSize: 11,
    marginTop: 2,
  },
  ctaBannerButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ctaBannerButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C757D',
  },
  quickFiltersContainer: {
    marginVertical: 4,
  },
  quickFiltersScroll: {
    flexDirection: 'row',
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginRight: 8,
  },
  quickFilterChipActiveAll: {
    backgroundColor: '#212529',
    borderColor: '#212529',
  },
  quickFilterChipActiveVenda: {
    backgroundColor: '#6E0AD6',
    borderColor: '#6E0AD6',
  },
  quickFilterChipActiveLeilao: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  quickFilterChipActiveTroca: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  quickFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
  },
  quickFilterTextActive: {
    color: '#FFF',
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  categoryPillActive: {
    backgroundColor: '#6E0AD6',
    borderColor: '#6E0AD6',
  },
  categoryPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  clearSearchBtn: {
    padding: 4,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 6,
  },
  activeFiltersLabel: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: '600',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeFilterChipText: {
    fontSize: 11,
    color: '#6E0AD6',
    fontWeight: '700',
  },
  clearAllText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B1B1B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 14,
  },
  clearFilterButton: {
    backgroundColor: '#6E0AD6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  clearFilterButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
