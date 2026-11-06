import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Modal } from 'react-native';
import { Home, MessageSquare, PlusCircle, User, Sparkles } from 'lucide-react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { CreateAdScreen } from './src/screens/CreateAdScreen';
import { AdDetailScreen } from './src/screens/AdDetailScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ChatListScreen } from './src/screens/ChatListScreen';
import { ChatRoomScreen } from './src/screens/ChatRoomScreen';
import { MyAdsScreen } from './src/screens/MyAdsScreen';
import { WishlistScreen } from './src/screens/WishlistScreen';

type Tab = 'home' | 'chat' | 'anunciar' | 'favoritos' | 'conta';

function MainNavigator() {
  const { user, unreadCount, unreadWishlistCount } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [viewingMyAds, setViewingMyAds] = useState(false);

  // Controle de modal de autenticação
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<Tab | null>(null);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', nextTab?: Tab) => {
    setAuthModalMode(mode);
    if (nextTab) setPendingActionAfterAuth(nextTab);
    setAuthModalVisible(true);
  };

  const handleAuthSuccess = () => {
    setAuthModalVisible(false);
    if (pendingActionAfterAuth) {
      setCurrentTab(pendingActionAfterAuth);
      setPendingActionAfterAuth(null);
    }
  };

  const handleTabPress = (tab: Tab) => {
    setSelectedAdId(null);
    setSelectedConversaId(null);
    setViewingMyAds(false);

    if (tab === 'anunciar' && !user) {
      handleOpenAuth('login', 'anunciar');
      return;
    }

    setCurrentTab(tab);
  };

  const renderContent = () => {
    if (selectedConversaId) {
      return (
        <ChatRoomScreen
          conversaId={selectedConversaId}
          onBack={() => setSelectedConversaId(null)}
        />
      );
    }

    if (selectedAdId) {
      return (
        <AdDetailScreen
          adId={selectedAdId}
          onBack={() => setSelectedAdId(null)}
          onOpenChat={(conversaId: string) => {
            setSelectedAdId(null);
            setSelectedConversaId(conversaId);
          }}
          onOpenAuth={() => handleOpenAuth('login')}
        />
      );
    }

    if (viewingMyAds) {
      return (
        <MyAdsScreen
          onBack={() => setViewingMyAds(false)}
          onSelectAd={(id) => {
            setSelectedAdId(id);
          }}
          onNavigateToCreate={() => {
            setViewingMyAds(false);
            handleTabPress('anunciar');
          }}
        />
      );
    }

    if (currentTab === 'anunciar') {
      return (
        <CreateAdScreen
          onBack={() => setCurrentTab('home')}
          onSuccess={(anuncioId: string) => {
            setSelectedAdId(anuncioId);
            setCurrentTab('home');
          }}
        />
      );
    }

    if (currentTab === 'chat') {
      return (
        <ChatListScreen
          onSelectConversa={(conversaId: string) => setSelectedConversaId(conversaId)}
          onOpenAuth={() => handleOpenAuth('login')}
        />
      );
    }

    if (currentTab === 'home') {
      return (
        <HomeScreen
          onSelectAd={(id) => setSelectedAdId(id)}
          onNavigateToCreate={() => handleTabPress('anunciar')}
          onNavigateToAuth={() => {
            if (user) {
              setCurrentTab('conta');
            } else {
              handleOpenAuth('login');
            }
          }}
        />
      );
    }

    if (currentTab === 'conta') {
      if (user) {
        return (
          <ProfileScreen
            onNavigateToCreateAd={() => handleTabPress('anunciar')}
            onNavigateToMyAds={() => setViewingMyAds(true)}
          />
        );
      }

      // Se não autenticado e clicou na aba conta
      return authModalMode === 'register' ? (
        <RegisterScreen
          onNavigateToLogin={() => setAuthModalMode('login')}
          onSuccess={() => setCurrentTab('conta')}
        />
      ) : (
        <LoginScreen
          onNavigateToRegister={() => setAuthModalMode('register')}
          onSuccess={() => setCurrentTab('conta')}
        />
      );
    }

    // Aba Lista de Desejos & Radar
    return (
      <WishlistScreen
        onSelectAd={(id) => setSelectedAdId(id)}
        onOpenAuth={() => handleOpenAuth('login')}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.mainContainer}>{renderContent()}</View>

      {/* Modal de Autenticação para ações protegidas */}
      <Modal
        visible={authModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          {authModalMode === 'login' ? (
            <LoginScreen
              onNavigateToRegister={() => setAuthModalMode('register')}
              onSuccess={handleAuthSuccess}
              onClose={() => setAuthModalVisible(false)}
            />
          ) : (
            <RegisterScreen
              onNavigateToLogin={() => setAuthModalMode('login')}
              onSuccess={handleAuthSuccess}
              onClose={() => setAuthModalVisible(false)}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Barra de Abas Inferior TroqJá */}
      {!selectedAdId && !selectedConversaId && !viewingMyAds && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabPress('home')}
          >
            <Home
              size={22}
              color={currentTab === 'home' ? '#6E0AD6' : '#6C757D'}
            />
            <Text
              style={[
                styles.tabLabel,
                currentTab === 'home' && styles.tabLabelActive,
              ]}
            >
              Início
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabPress('chat')}
          >
            <View style={styles.iconWithBadge}>
              <MessageSquare
                size={22}
                color={currentTab === 'chat' ? '#6E0AD6' : '#6C757D'}
              />
              {unreadCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                currentTab === 'chat' && styles.tabLabelActive,
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          {/* Botão Central de Destaque "Anunciar" */}
          <TouchableOpacity
            style={styles.tabItemAnunciar}
            onPress={() => handleTabPress('anunciar')}
          >
            <View style={styles.anunciarCircle}>
              <PlusCircle size={28} color="#FFF" />
            </View>
            <Text style={styles.tabLabelAnunciar}>Anunciar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabPress('favoritos')}
          >
            <View style={styles.iconWithBadge}>
              <Sparkles
                size={22}
                color={currentTab === 'favoritos' ? '#00C853' : '#6C757D'}
              />
              {unreadWishlistCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: '#00C853' }]}>
                  <Text style={styles.tabBadgeText}>
                    {unreadWishlistCount > 99 ? '99+' : unreadWishlistCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                currentTab === 'favoritos' && { color: '#00C853', fontWeight: '800' },
              ]}
            >
              Desejos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabPress('conta')}
          >
            <User
              size={22}
              color={currentTab === 'conta' ? '#6E0AD6' : '#6C757D'}
            />
            <Text
              style={[
                styles.tabLabel,
                currentTab === 'conta' && styles.tabLabelActive,
              ]}
            >
              {user ? 'Minha Conta' : 'Entrar'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  mainContainer: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 6,
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
  },
  tabBar: {
    height: 62,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#6C757D',
    fontWeight: '600',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#6E0AD6',
    fontWeight: '700',
  },
  tabItemAnunciar: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -16,
  },
  anunciarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  tabLabelAnunciar: {
    fontSize: 10,
    color: '#FF6B00',
    fontWeight: '800',
    marginTop: 2,
  },
  iconWithBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF6B00',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
