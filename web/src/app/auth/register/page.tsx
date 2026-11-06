'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage, formatPhoneNumber } from '@olx-clone/shared';
import { User, Mail, Lock, Phone, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { signUp } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTelefone(formatPhoneNumber(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validações
    if (!nome.trim() || !email.trim() || !password) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (nome.trim().split(' ').length < 2) {
      setErrorMessage('Por favor, digite seu nome e sobrenome completos.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem. Verifique e tente novamente.');
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

      setIsSuccess(true);

      // Redireciona após 1.5s
      setTimeout(() => {
        router.push(redirectPath);
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
      {/* Cabeçalho */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-1 group" title="TroqJá - Anunciou, trocou, fechou!">
          <span className="text-4xl font-black tracking-tight text-gray-900">
            Troq<span className="text-olx-orange">Já</span>
          </span>
          <span className="w-3 h-3 rounded-full bg-olx-orange self-baseline mt-5 -ml-0.5" />
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
          Crie sua conta no TroqJá
        </h1>
        <p className="mt-1 text-sm text-gray-500 font-medium italic">
          "Anunciou, trocou, fechou!"
        </p>
      </div>

      {/* Mensagem de Sucesso */}
      {isSuccess && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3 text-green-800 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold leading-relaxed">
            Conta criada com sucesso! Redirecionando você...
          </div>
        </div>
      )}

      {/* Mensagem de Erro Amigável */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Nome Completo */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Nome Completo *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition"
            />
          </div>
        </div>

        {/* Campo E-mail */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            E-mail *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition"
            />
          </div>
        </div>

        {/* Campo Telefone / WhatsApp */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Telefone / WhatsApp
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              value={telefone}
              onChange={handlePhoneChange}
              maxLength={15}
              placeholder="(11) 98765-4321"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Usado para compradores entrarem em contato com você</p>
        </div>

        {/* Campo Senha */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Senha (mínimo 6 caracteres) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Campo Confirmação de Senha */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Confirmar Senha *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition"
            />
          </div>
        </div>

        {/* Botão Cadastrar */}
        <button
          type="submit"
          disabled={isLoading || isSuccess}
          className="w-full flex items-center justify-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white font-bold py-3 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Criando conta e perfil...</span>
            </>
          ) : (
            <span>Cadastrar</span>
          )}
        </button>
      </form>

      {/* Link para Login */}
      <div className="pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-600">
          Já possui uma conta?{' '}
          <Link
            href={redirectPath !== '/' ? `/auth/login?redirect=${encodeURIComponent(redirectPath)}` : '/auth/login'}
            className="font-bold text-olx-purple hover:underline"
          >
            Fazer Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-olx-purple animate-spin" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

