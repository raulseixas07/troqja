import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getAuthErrorMessage, formatPhoneNumber } from '@olx-clone/shared';
import { User, Mail, Lock, Phone, Eye, EyeOff, X, AlertCircle } from 'lucide-react-native';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onSuccess: () => void;
  onClose?: () => void;
}

export function RegisterScreen({
  onNavigateToLogin,
  onSuccess,
  onClose,
}: RegisterScreenProps) {
  const { signUp } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhoneChange = (text: string) => {
    setTelefone(formatPhoneNumber(text));
  };

  const handleRegister = async () => {
    setErrorMessage(null);

    if (!nome.trim() || !email.trim() || !password) {
      setErrorMessage('Por favor, preencha os campos obrigatórios (*).');
      return;
    }

    if (nome.trim().split(' ').length < 2) {
      setErrorMessage('Digite seu nome e sobrenome completos.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp({
        nome: nome.trim(),
        email: email.trim(),
        password,
        telefone: telefone.trim() || undefined,
      });

      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        return;
      }

      Alert.alert(
        'Conta criada!',
        'Seu cadastro foi realizado com sucesso e seu perfil já está ativo.',
        [{ text: 'Continuar', onPress: onSuccess }]
      );
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Bar */}
        <View style={styles.topBar}>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={22} color="#1B1B1B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>

        {/* Logo e Título */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>Troq<Text style={styles.logoTextAccent}>Já</Text></Text>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.title}>Crie sua conta no TroqJá</Text>
          <Text style={styles.subtitle}>"Anunciou, trocou, fechou!"</Text>
        </View>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Formulário */}
        <View style={styles.form}>
          <Text style={styles.label}>Nome Completo *</Text>
          <View style={styles.inputContainer}>
            <User size={18} color="#9E9E9E" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ex: Carlos Eduardo Silva"
              placeholderTextColor="#ADB5BD"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>E-mail *</Text>
          <View style={styles.inputContainer}>
            <Mail size={18} color="#9E9E9E" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="seuemail@exemplo.com"
              placeholderTextColor="#ADB5BD"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>Telefone / WhatsApp</Text>
          <View style={styles.inputContainer}>
            <Phone size={18} color="#9E9E9E" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="(11) 98765-4321"
              placeholderTextColor="#ADB5BD"
              value={telefone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <Text style={styles.label}>Senha (mínimo 6 caracteres) *</Text>
          <View style={styles.inputContainer}>
            <Lock size={18} color="#9E9E9E" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#ADB5BD"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              {showPassword ? <EyeOff size={18} color="#6C757D" /> : <Eye size={18} color="#6C757D" />}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar Senha *</Text>
          <View style={styles.inputContainer}>
            <Lock size={18} color="#9E9E9E" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#ADB5BD"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Cadastrar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Rodapé / Já tem conta */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem uma conta no TroqJá? </Text>
          <TouchableOpacity onPress={onNavigateToLogin}>
            <Text style={styles.loginLink}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  topBar: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  closeButton: {
    padding: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
  },
  logoTextAccent: {
    color: '#FF6B00',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
    marginTop: 24,
    marginLeft: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B1B1B',
  },
  subtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1B1B1B',
  },
  eyeButton: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: '#FF6B00',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#6C757D',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6E0AD6',
  },
});
