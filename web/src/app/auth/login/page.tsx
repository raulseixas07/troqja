'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@olx-clone/shared';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
      {/* Cabeçalho */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-1 group" title="TroqJá - Anunciou, trocou, fechou!">
          <span className="text-4xl font-black tracking-tight text-gray-900">
            Troq<span className="text-olx-orange">Já</span>
          </span>
          <span className="w-3 h-3 rounded-full bg-olx-orange self-baseline mt-5 -ml-0.5" />
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
          Acesse sua conta no TroqJá
        </h1>
        <p className="mt-1 text-sm text-gray-500 font-medium italic">
          "Anunciou, trocou, fechou!"
        </p>
      </div>

      {/* Mensagem de Erro Amigável */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Campo E-mail */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            E-mail
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

        {/* Campo Senha */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Senha
            </label>
            <Link
              href="/auth/recuperar-senha"
              className="text-xs font-semibold text-olx-purple hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
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

        {/* Botão Entrar */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white font-bold py-3 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Entrando...</span>
            </>
          ) : (
            <span>Entrar</span>
          )}
        </button>
      </form>

      {/* Separador e Link para Registro */}
      <div className="pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-600">
          Ainda não tem uma conta no TroqJá?{' '}
          <Link
            href={redirectPath !== '/' ? `/auth/register?redirect=${encodeURIComponent(redirectPath)}` : '/auth/register'}
            className="font-bold text-olx-purple hover:underline"
          >
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-olx-purple animate-spin" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

