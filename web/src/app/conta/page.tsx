'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SUPABASE_TABLES, formatPhoneNumber } from '@olx-clone/shared';
import {
  User,
  Mail,
  Phone,
  MapPin,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Layers,
  Wallet,
  ShoppingBag,
  BarChart3,
} from 'lucide-react';
import { checarSeContaECNPJ } from '@/lib/checkout';

export default function ContaPage() {
  const router = useRouter();
  const { user, profile, isLoading, signOut, refreshProfile } = useAuth();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCnpj, setIsCnpj] = useState(false);

  useEffect(() => {
    const atualizar = () => {
      setIsCnpj(checarSeContaECNPJ(user, profile));
    };
    atualizar();
    window.addEventListener('troqja_tipo_conta_updated', atualizar);
    window.addEventListener('storage', atualizar);
    return () => {
      window.removeEventListener('troqja_tipo_conta_updated', atualizar);
      window.removeEventListener('storage', atualizar);
    };
  }, [user, profile]);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '');
      setTelefone(profile.telefone ? formatPhoneNumber(profile.telefone) : '');
      setCidade(profile.cidade || '');
      setEstado(profile.estado || '');
      setCep(profile.cep || '');
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-olx-purple animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-purple-100 text-olx-purple rounded-full flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Você não está conectado</h1>
        <p className="text-sm text-gray-500">
          Faça login na sua conta para gerenciar seu perfil e acompanhar seus anúncios.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/auth/login?redirect=/conta"
            className="bg-olx-orange hover:bg-olx-orange-hover text-white text-sm font-bold px-6 py-2.5 rounded-full shadow transition"
          >
            Entrar
          </Link>
          <Link
            href="/auth/register?redirect=/conta"
            className="border border-olx-purple text-olx-purple hover:bg-purple-50 text-sm font-bold px-6 py-2.5 rounded-full transition"
          >
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase
        .from(SUPABASE_TABLES.PROFILES)
        .update({
          nome: nome.trim(),
          telefone: telefone.replace(/\D/g, '') || null,
          cidade: cidade.trim() || null,
          estado: estado.trim() || null,
          cep: cep.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setStatusMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar perfil';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Botão Voltar e Título */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-olx-purple transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para anúncios</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
          <p className="text-sm text-gray-500">Gerencie seus dados cadastrais e anúncios publicados</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition border border-red-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{statusMessage.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão de Resumo do Usuário */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 h-fit">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-purple-100 text-olx-purple font-black text-2xl flex items-center justify-center border-2 border-purple-200 shadow-xs mb-3">
              {profile?.nome ? profile.nome.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{profile?.nome || 'Usuário TroqJá'}</h2>
            <p className="text-xs text-gray-500">{user.email}</p>
            <span className={`inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${isCnpj ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-orange-100 text-orange-950 border border-orange-200'}`}>
              {isCnpj ? 'Conta Lojista CNPJ' : 'Conta Pessoa Física (CPF)'}
            </span>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{user.email}</span>
            </div>
            {profile?.telefone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{formatPhoneNumber(profile.telefone)}</span>
              </div>
            )}
            {profile?.cidade && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>
                  {profile.cidade} - {profile.estado}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-2">
            {isCnpj ? (
              /* AÇÕES PARA CONTAS CNPJ (LOJISTA) - SEM MINHAS COMPRAS */
              <>
                <Link
                  href="/conta/painel-receita"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-950 hover:from-black hover:to-slate-900 text-white text-xs font-black py-2.5 rounded-xl shadow-xs transition"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>💰 Painel de Receita do Vendedor</span>
                </Link>

                <Link
                  href="/sobre?aba=lojistas"
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold py-2.5 rounded-xl border border-blue-200 transition"
                >
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>📊 Painel Lojista CNPJ</span>
                </Link>

                <Link
                  href="/conta/meus-anuncios"
                  className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-olx-purple text-xs font-bold py-2.5 rounded-xl border border-purple-200 transition"
                >
                  <Layers className="w-4 h-4" />
                  <span>Gerenciar Meus Anúncios</span>
                </Link>

                <Link
                  href="/anunciar"
                  className="w-full flex items-center justify-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition"
                >
                  <Package className="w-4 h-4" />
                  <span>Criar Novo Anúncio</span>
                </Link>
              </>
            ) : (
              /* AÇÕES PARA CONTAS CPF (PESSOA FÍSICA) - COMPRADOR E VENDEDOR */
              <>
                <Link
                  href="/conta/minhas-compras"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-black py-2.5 rounded-xl shadow-sm transition"
                >
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <span>🛍️ Minhas Compras</span>
                </Link>

                <Link
                  href="/conta/painel-receita"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-950 hover:from-black hover:to-slate-900 text-white text-xs font-black py-2.5 rounded-xl shadow-xs transition"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>💰 Painel de Receita do Vendedor</span>
                </Link>

                <Link
                  href="/conta/meus-anuncios"
                  className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-olx-purple text-xs font-bold py-2.5 rounded-xl border border-purple-200 transition"
                >
                  <Layers className="w-4 h-4" />
                  <span>Gerenciar Meus Anúncios</span>
                </Link>

                <Link
                  href="/anunciar"
                  className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-olx-purple text-xs font-bold py-2.5 rounded-xl border border-purple-200 transition"
                >
                  <Package className="w-4 h-4" />
                  <span>Criar Novo Anúncio</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Formulário de Edição de Dados */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
            Dados Pessoais
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-1 focus:ring-olx-purple outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhoneNumber(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-1 focus:ring-olx-purple outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="01001-000"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-1 focus:ring-olx-purple outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-1 focus:ring-olx-purple outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-1 focus:ring-olx-purple outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-olx-purple hover:bg-olx-purple-hover text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
