import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SUPABASE_TABLES, formatPhoneNumber } from '@olx-clone/shared';
import { Mail, Phone, MapPin, LogOut, Package, Check, Layers } from 'lucide-react-native';

interface ProfileScreenProps {
  onNavigateToCreateAd: () => void;
  onNavigateToMyAds: () => void;
}

export function ProfileScreen({ onNavigateToCreateAd, onNavigateToMyAds }: ProfileScreenProps) {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '');
      setTelefone(profile.telefone ? formatPhoneNumber(profile.telefone) : '');
      setCidade(profile.cidade || '');
      setEstado(profile.estado || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar em branco.');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from(SUPABASE_TABLES.PROFILES)
        .update({
          nome: nome.trim(),
          telefone: telefone.replace(/\D/g, '') || null,
          cidade: cidade.trim() || null,
          estado: estado.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert('Sucesso', 'Seus dados foram atualizados com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados.';
      Alert.alert('Erro', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza de que deseja encerrar sua sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const initial = profile?.nome?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Cabeçalho do Perfil */}
      <View style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{profile?.nome || 'Usuário TroqJá'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Ação: Gerenciar Meus Anúncios */}
      <TouchableOpacity style={styles.myAdsActionCard} onPress={onNavigateToMyAds} activeOpacity={0.85}>
        <View style={styles.adActionContent}>
          <View style={styles.myAdsIconCircle}>
            <Layers size={20} color="#6E0AD6" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.myAdsTitle}>Meus Anúncios</Text>
            <Text style={styles.myAdsSubtitle}>Gerencie seus anúncios, status e visualizações</Text>
          </View>
        </View>
        <Text style={styles.myAdsArrow}>➔</Text>
      </TouchableOpacity>

      {/* Ação Rápida: Anunciar */}
      <TouchableOpacity style={styles.adActionCard} onPress={onNavigateToCreateAd} activeOpacity={0.85}>
        <View style={styles.adActionContent}>
          <Package size={22} color="#FFF" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.adActionTitle}>Desapegue agora</Text>
            <Text style={styles.adActionSubtitle}>Criar um novo anúncio com fotos WebP</Text>
          </View>
        </View>
        <Text style={styles.adActionArrow}>➔</Text>
      </TouchableOpacity>

      {/* Formulário de Edição */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Dados Cadastrais</Text>

        <Text style={styles.label}>Nome Completo</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
        />

        <Text style={styles.label}>Telefone / WhatsApp</Text>
        <View style={styles.inputWithIcon}>
          <Phone size={16} color="#9E9E9E" />
          <TextInput
            style={styles.inputInner}
            value={telefone}
            onChangeText={(t) => setTelefone(formatPhoneNumber(t))}
            placeholder="(11) 98765-4321"
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 2 }}>
            <Text style={styles.label}>Cidade</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={16} color="#9E9E9E" />
              <TextInput
                style={styles.inputInner}
                value={cidade}
                onChangeText={setCidade}
                placeholder="São Paulo"
              />
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.label}>UF</Text>
            <TextInput
              style={styles.input}
              value={estado}
              maxLength={2}
              autoCapitalize="characters"
              onChangeText={(t) => setEstado(t.toUpperCase())}
              placeholder="SP"
            />
          </View>
        </View>

        {/* Botão Salvar Alterações */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.saveButtonRow}>
              <Check size={16} color="#FFF" />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Informações da Conta */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Segurança</Text>
        <View style={styles.infoRow}>
          <Mail size={16} color="#6C757D" />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
      </View>

      {/* Botão Sair */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={18} color="#DC2626" />
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6E0AD6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#6E0AD6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B1B1B',
  },
  userEmail: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  myAdsActionCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#6E0AD6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  myAdsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myAdsTitle: {
    color: '#1B1B1B',
    fontSize: 14,
    fontWeight: '800',
  },
  myAdsSubtitle: {
    color: '#6C757D',
    fontSize: 11,
    marginTop: 2,
  },
  myAdsArrow: {
    color: '#6E0AD6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adActionCard: {
    backgroundColor: '#FF6B00',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  adActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adActionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  adActionSubtitle: {
    color: '#FFF3E0',
    fontSize: 11,
    marginTop: 2,
  },
  adActionArrow: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#1B1B1B',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  inputInner: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1B1B1B',
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#6E0AD6',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#495057',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
