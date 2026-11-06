import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MessageSquare, ShoppingBag } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  SUPABASE_TABLES,
  formatCurrencyBRL,
  formatRelativeDate,
  type ConversaListItem,
  buscarConversasDoUsuario,
} from '@olx-clone/shared';

interface ChatListScreenProps {
  onSelectConversa: (conversaId: string) => void;
  onOpenAuth: () => void;
}

export function ChatListScreen({ onSelectConversa, onOpenAuth }: ChatListScreenProps) {
  const { user, isLoading: authLoading, refreshUnreadCount } = useAuth();
  const [conversas, setConversas] = useState<ConversaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversas = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { conversas: formatadas, error } = await buscarConversasDoUsuario(supabase, user.id);

      if (!error && formatadas) {
        setConversas(formatadas);
      }
    } catch (err) {
      console.warn('Erro ao carregar conversas no mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversas();

    if (!user?.id) return;

    // Escuta novas mensagens e alterações em tempo real via Supabase Realtime
    const channel = supabase
      .channel(`mobile_chat_list_sync_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLES.MENSAGENS },
        () => {
          fetchConversas();
          refreshUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLES.CONVERSAS },
        () => {
          fetchConversas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConversas, refreshUnreadCount]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversas();
  };

  const totalNaoLidas = conversas.reduce((acc, c) => acc + (c.mensagens_nao_lidas || 0), 0);

  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#6E0AD6" />
        <Text style={styles.loadingText}>Carregando mensagens...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <View style={styles.iconCircle}>
          <MessageSquare size={32} color="#6E0AD6" />
        </View>
        <Text style={styles.emptyTitle}>Acesse suas mensagens</Text>
        <Text style={styles.emptySubtitle}>
          Faça login para negociar e receber mensagens de compradores e vendedores em tempo real.
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={onOpenAuth}>
          <Text style={styles.loginButtonText}>Entrar na Conta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Conversas</Text>
        <View style={styles.headerBadgesRow}>
          {totalNaoLidas > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadBadgeText}>
                {totalNaoLidas} {totalNaoLidas === 1 ? 'não lida' : 'não lidas'}
              </Text>
            </View>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{conversas.length}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#6E0AD6" />
        </View>
      ) : conversas.length === 0 ? (
        <View style={[styles.container, styles.center, { padding: 24 }]}>
          <ShoppingBag size={40} color="#ADB5BD" />
          <Text style={styles.emptyTitle}>Nenhuma conversa</Text>
          <Text style={styles.emptySubtitle}>
            Quando você demonstrar interesse em um produto, seu chat aparecerá aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversas}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6E0AD6']} />
          }
          renderItem={({ item }) => {
            const initial = item.outro_usuario.nome.charAt(0).toUpperCase();

            return (
              <TouchableOpacity
                style={styles.chatCard}
                onPress={() => onSelectConversa(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.outro_usuario.nome}
                    </Text>
                    {item.ultima_mensagem && (
                      <Text style={styles.timeText}>
                        {formatRelativeDate(item.ultima_mensagem.created_at)}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.adTitle} numberOfLines={1}>
                    {item.anuncio.titulo} • {formatCurrencyBRL(item.anuncio.preco)}
                  </Text>

                  <View style={styles.rowBetween}>
                    <Text
                      style={[
                        styles.lastMessage,
                        item.mensagens_nao_lidas > 0 && styles.lastMessageUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.ultima_mensagem
                        ? item.ultima_mensagem.conteudo
                        : 'Conversa iniciada. Diga olá!'}
                    </Text>

                    {item.mensagens_nao_lidas > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {item.mensagens_nao_lidas > 99 ? '99+' : item.mensagens_nao_lidas}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B1B1B',
  },
  badge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E0AD6',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B1B1B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  chatCard: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6E0AD6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  chatInfo: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B1B1B',
    flex: 1,
  },
  timeText: {
    fontSize: 10,
    color: '#ADB5BD',
  },
  adTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E0AD6',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 12,
    color: '#6C757D',
    flex: 1,
  },
  lastMessageUnread: {
    color: '#1B1B1B',
    fontWeight: '700',
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalUnreadBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  totalUnreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  unreadBadge: {
    backgroundColor: '#FF6B00',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 6,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
