'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, MapPin, MessageSquare, PlusCircle, User as UserIcon, LogOut, ChevronDown, UserCheck, Package, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Navbar() {
  const router = useRouter();
  const { user, profile, signOut, unreadCount, unreadWishlistCount } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push('/busca');
    }
  };

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const getFirstName = () => {
    if (profile?.nome) {
      return profile.nome.trim().split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  const getInitial = () => {
    if (profile?.nome) {
      return profile.nome.trim().charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Logo Oficial TroqJá */}
          <Link href="/" className="flex items-center gap-1 shrink-0 group" title="TroqJá - Anunciou, trocou, fechou!">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 transition">
              Troq<span className="text-olx-orange">Já</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-olx-orange self-baseline mt-4 -ml-0.5 animate-pulse" />
          </Link>

          {/* Barra de Pesquisa */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl items-center relative">
            <div className="w-full flex items-center bg-gray-100 rounded-lg border border-transparent focus-within:border-olx-purple focus-within:bg-white transition">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Estou procurando por..."
                className="w-full py-2.5 pl-4 pr-10 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                className="p-2 text-gray-500 hover:text-olx-purple transition"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Ações e Links */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Seletor de Região */}
            <button
              type="button"
              className="hidden lg:flex items-center gap-1.5 text-xs text-gray-600 hover:text-olx-purple font-medium transition"
            >
              <MapPin className="w-4 h-4 text-olx-orange" />
              <span>São Paulo e região</span>
            </button>

            {/* Lista de Desejos & Radar de Matches */}
            <Link
              href="/desejos"
              className="relative flex items-center gap-1.5 text-gray-600 hover:text-emerald-600 transition p-2 rounded-full hover:bg-gray-100"
              title={
                unreadWishlistCount > 0
                  ? `Lista de Desejos (${unreadWishlistCount} novos matches!)`
                  : 'Lista de Desejos & Radar'
              }
            >
              <div className="relative flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                {unreadWishlistCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 bg-[#00C853] text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none"
                    aria-label={`${unreadWishlistCount} alertas na lista de desejos`}
                  >
                    {unreadWishlistCount > 99 ? '99+' : unreadWishlistCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-semibold">Desejos</span>
            </Link>

            {/* Chat com Indicador de Mensagens Não Lidas */}
            <Link
              href="/chat"
              className="relative flex items-center gap-1.5 text-gray-600 hover:text-olx-purple transition p-2 rounded-full hover:bg-gray-100"
              title={
                unreadCount > 0
                  ? `Minhas conversas (${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'})`
                  : 'Minhas conversas'
              }
            >
              <div className="relative flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 bg-olx-orange text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none"
                    aria-label={`${unreadCount} mensagens não lidas`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-semibold">Chat</span>
            </Link>

            {/* Menu de Autenticação / Perfil */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full hover:bg-gray-100 transition border border-gray-200"
                >
                  <div className="w-7 h-7 rounded-full bg-olx-purple text-white text-xs font-bold flex items-center justify-center">
                    {getInitial()}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-gray-800 max-w-[100px] truncate">
                    Olá, {getFirstName()}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50 animate-fadeIn">
                    <div className="px-3.5 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">{profile?.nome || 'Minha Conta'}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/conta"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-olx-purple transition"
                    >
                      <UserCheck className="w-4 h-4 text-gray-400" />
                      <span>Meu Perfil</span>
                    </Link>

                    <Link
                      href="/conta/meus-anuncios"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-olx-purple transition"
                    >
                      <Package className="w-4 h-4 text-gray-400" />
                      <span>Meus Anúncios</span>
                    </Link>

                    <Link
                      href="/desejos"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Lista de Desejos</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition border-t border-gray-100"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 text-gray-700 hover:text-olx-purple transition py-2 px-3 rounded-full hover:bg-gray-100 font-semibold text-xs"
                title="Entrar na sua conta"
              >
                <UserIcon className="w-4 h-4" />
                <span>Entrar</span>
              </Link>
            )}

            {/* Botão Anunciar (Destaque Laranja) */}
            <Link
              href="/anunciar"
              className="flex items-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-sm hover:shadow transition transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Anunciar</span>
            </Link>
          </div>
        </div>

        {/* Barra de pesquisa mobile */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no TroqJá..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </form>
        </div>
      </div>
    </header>
  );
}
