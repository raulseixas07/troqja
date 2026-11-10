'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageUploaderWebP, type ImageUploadItem } from '@/components/ImageUploaderWebP';
import { uploadWebPToSupabase } from '@/utils/imageWebP';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  SUPABASE_TABLES,
  formatCEP,
  formatCurrencyBRL,
  buscarEnderecoPorCEP,
  contarInteressadosDesejo,
  destacarAnuncioVitrine,
  type Categoria,
  type ModalidadeAnuncio,
  type CondicaoTroca,
} from '@olx-clone/shared';
import {
  calcularSplitTroqJa,
  calcularPrecoBrutoParaLiquidoDesejado,
} from '@/lib/checkout';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  Sparkles,
  MapPin,
  Gavel,
  ArrowLeftRight,
  Clock,
  Tag,
  Flame,
  Check,
} from 'lucide-react';

const CATEGORIAS_FALLBACK = [
  { id: '1', nome: 'Autos e peças', slug: 'autos-e-pecas' },
  { id: '2', nome: 'Imóveis', slug: 'imoveis' },
  { id: '3', nome: 'Eletrônicos e celulares', slug: 'eletronicos-e-celulares' },
  { id: '4', nome: 'Para a sua casa', slug: 'para-a-sua-casa' },
  { id: '5', nome: 'Moda e beleza', slug: 'moda-e-beleza' },
  { id: '6', nome: 'Música e hobbies', slug: 'musica-e-hobbies' },
  { id: '7', nome: 'Esportes e lazer', slug: 'esportes-e-lazer' },
  { id: '8', nome: 'Vagas de emprego', slug: 'vagas-de-emprego' },
  { id: '9', nome: 'Serviços e outros', slug: 'servicos-e-outros' },
];

function SimuladorRecebimentoVendedor({
  valorTexto,
  onAjustarPreco,
  rotuloValor = 'Preço anunciado para o cliente',
}: {
  valorTexto: string;
  onAjustarPreco: (novoValor: string) => void;
  rotuloValor?: string;
}) {
  const valorNum = parseFloat(valorTexto.replace(',', '.'));
  const valorValido = Number.isFinite(valorNum) && valorNum > 0 ? valorNum : 0;
  const split = calcularSplitTroqJa(valorValido);
  const precoAjustado =
    valorValido > 0 ? calcularPrecoBrutoParaLiquidoDesejado(valorValido) : 0;

  return (
    <div className="mt-3 p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-100">
        <span className="text-xs sm:text-sm font-black text-gray-900">
          📊 Simulador de Recebimento do Vendedor (Pix e Cartão 1x à vista)
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Taxa {split.percentualTaxa}% ({valorValido <= 1000 ? 'até R$ 1.000' : 'acima de R$ 1.000'})
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-600">
            {rotuloValor}:{' '}
            <span className="text-[11px] text-gray-400">
              (pelo Pix ou Cartão 1x, sem acréscimos)
            </span>
          </span>
          <strong className="font-bold text-gray-900 shrink-0">
            {formatCurrencyBRL(split.valorBase)}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-600">
            Taxa de intermediação e custódia TroqJá ({split.percentualTaxa}% — 5% até R$ 1.000 / 7% acima de R$ 1.000):
          </span>
          <strong className="font-bold text-orange-600 shrink-0">
            - {formatCurrencyBRL(split.taxaPlataforma)}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-100">
          <span className="font-extrabold text-gray-900">
            Valor líquido que você recebe na sua carteira:
          </span>
          <strong className="text-base sm:text-lg font-black text-[#00C853] shrink-0">
            {formatCurrencyBRL(split.liquidoVendedor)}
          </strong>
        </div>
      </div>

      {valorValido > 0 && (
        <button
          type="button"
          onClick={() => onAjustarPreco(precoAjustado.toFixed(2))}
          className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <span>
            ✨ Ajustar preço para eu receber {formatCurrencyBRL(valorValido)} limpos (anunciar por{' '}
            {formatCurrencyBRL(precoAjustado)})
          </span>
        </button>
      )}

      <p className="text-[11px] text-gray-500 leading-snug">
        No parcelamento de 2x a 12x no cartão, os juros são assumidos pelo comprador e você continua recebendo o mesmo valor líquido acima.
      </p>
    </div>
  );
}

export default function AnunciarPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();

  const [categorias, setCategorias] = useState<{ id: string; nome: string; slug?: string }[]>(CATEGORIAS_FALLBACK);
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  // Diferenciais TroqJá: Venda vs Leilão vs Troca-Troca
  const [modalidade, setModalidade] = useState<ModalidadeAnuncio>('venda');
  const [aceitaTroca, setAceitaTroca] = useState(false);
  const [itensTroca, setItensTroca] = useState('');
  const [condicaoTroca, setCondicaoTroca] = useState<CondicaoTroca>('pau_a_pau');
  const [lanceInicial, setLanceInicial] = useState('');
  const [incrementoMinimo, setIncrementoMinimo] = useState('10');
  const [duracaoLeilao, setDuracaoLeilao] = useState<'24h' | '3d' | '5d' | '7d'>('3d');

  // Radar de Interessados (100% Gratuito no TroqJá)
  const [interessadosCount, setInteressadosCount] = useState<number | null>(null);
  const [buscandoInteressados, setBuscandoInteressados] = useState(false);

  // Destaque de Vitrine (Pay-per-Highlight - Opcional)
  const [destacarVitrine, setDestacarVitrine] = useState(false);
  const [opcaoDestaque, setOpcaoDestaque] = useState<'avulso' | 'pacote_10' | 'credito'>('avulso');

  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');
  const [bairro, setBairro] = useState('');

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inicializa a opção de destaque padrão se o vendedor já possui créditos
  useEffect(() => {
    if ((profile?.creditos_destaque_vitrine ?? 0) > 0) {
      setOpcaoDestaque('credito');
    }
  }, [profile?.creditos_destaque_vitrine]);

  // Radar de Interessados em Tempo Real com debounce
  useEffect(() => {
    if (modalidade === 'venda') {
      setInteressadosCount(null);
      return;
    }

    const cleanTitulo = titulo.trim();
    if (cleanTitulo.length < 2 && !categoriaId) {
      setInteressadosCount(null);
      return;
    }

    setBuscandoInteressados(true);
    const timer = setTimeout(async () => {
      try {
        const total = await contarInteressadosDesejo(supabase, cleanTitulo, categoriaId);
        setInteressadosCount(total);
      } finally {
        setBuscandoInteressados(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [titulo, categoriaId, modalidade]);

  // Carregar categorias dinâmicas do Supabase
  useEffect(() => {
    async function loadCategorias() {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_TABLES.CATEGORIAS)
          .select('id, nome, slug, ordem')
          .order('ordem', { ascending: true });

        if (!error && data && data.length > 0) {
          setCategorias(data as Categoria[]);
          if (!categoriaId && data[0]) {
            setCategoriaId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar categorias do Supabase, utilizando categorias padrão:', err);
      }
    }

    loadCategorias();
  }, [categoriaId]);

  // Preenchimento automático inicial com base no perfil do usuário
  useEffect(() => {
    if (profile) {
      if (profile.cidade && !cidade) setCidade(profile.cidade);
      if (profile.estado && estado === 'SP') setEstado(profile.estado);
      if (profile.cep && !cep) {
        setCep(formatCEP(profile.cep));
      }
    }
  }, [profile, cidade, estado, cep]);

  // Busca automática de endereço por CEP
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCEP(rawValue);
    setCep(formatted);

    const cleanCep = rawValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setBuscandoCep(true);
      try {
        const endereco = await buscarEnderecoPorCEP(cleanCep);
        if (endereco) {
          if (endereco.localidade) setCidade(endereco.localidade);
          if (endereco.uf) setEstado(endereco.uf);
          if (endereco.bairro) setBairro(endereco.bairro);
        }
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setStatusMessage({
        type: 'error',
        text: 'Você precisa estar conectado à sua conta para publicar um anúncio.',
      });
      return;
    }

    if (!titulo.trim() || !descricao.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, preencha o título e a descrição do anúncio.',
      });
      return;
    }

    if (modalidade === 'venda' && !preco) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, informe o preço para venda direta.',
      });
      return;
    }

    if (modalidade === 'troca' && !preco) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, informe o valor estimado como base de troca.',
      });
      return;
    }

    if (modalidade === 'leilao' && !lanceInicial) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, informe o lance inicial para o modo leilão.',
      });
      return;
    }

    if (images.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, adicione ao menos 1 foto em WebP para o anúncio.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const userId = user.id;
      const novoAnuncioId = crypto.randomUUID();

      // 1. Processar e enviar imagens WebP para o Supabase Storage
      const uploadedPhotos: { storagePath: string; publicUrl: string; isPrincipal: boolean; ordem: number }[] = [];

      for (let i = 0; i < images.length; i++) {
        const imgItem = images[i]!;
        setUploadStep(`Otimizando e enviando foto ${i + 1} de ${images.length} (WebP)...`);

        const { storagePath, publicUrl } = await uploadWebPToSupabase(
          supabase,
          imgItem.processed,
          userId,
          novoAnuncioId
        );

        uploadedPhotos.push({
          storagePath,
          publicUrl,
          isPrincipal: imgItem.isPrincipal || i === 0,
          ordem: i,
        });
      }

      setUploadStep('Salvando dados do anúncio no banco de dados...');

      // 2. Salvar o Anúncio na tabela `anuncios`
      const precoNumerico = modalidade === 'leilao'
        ? (parseFloat(lanceInicial.replace(',', '.')) || 0)
        : (parseFloat(preco.replace(',', '.')) || 0);

      const lanceInicialNum = modalidade === 'leilao'
        ? (parseFloat(lanceInicial.replace(',', '.')) || 0)
        : null;

      const incrementoMinimoNum = modalidade === 'leilao'
        ? (parseFloat(incrementoMinimo.replace(',', '.')) || 10)
        : 10;

      let leilaoEncerramentoIso: string | null = null;
      if (modalidade === 'leilao') {
        const duracaoMap: Record<string, number> = {
          '24h': 24 * 60 * 60 * 1000,
          '3d': 3 * 24 * 60 * 60 * 1000,
          '5d': 5 * 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
        };
        const duracaoMs = duracaoMap[duracaoLeilao] || duracaoMap['3d']!;
        leilaoEncerramentoIso = new Date(Date.now() + duracaoMs).toISOString();
      }

      const finalAceitaTroca = modalidade === 'troca' ? true : modalidade === 'leilao' ? aceitaTroca : false;
      const finalItensTroca = finalAceitaTroca ? (itensTroca.trim() || null) : null;
      const finalCondicaoTroca = finalAceitaTroca ? condicaoTroca : null;

      const selectedCategory = categoriaId || (categorias[0] ? categorias[0].id : '1');

      const dadosInsercao: any = {
        id: novoAnuncioId,
        user_id: userId,
        categoria_id: selectedCategory,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        preco: precoNumerico,
        modalidade,
        aceita_troca: finalAceitaTroca,
        itens_troca: finalItensTroca,
        condicao_troca: finalCondicaoTroca,
        lance_inicial: lanceInicialNum,
        lance_atual: lanceInicialNum,
        incremento_minimo: incrementoMinimoNum,
        leilao_encerramento: leilaoEncerramentoIso,
        destacado_vitrine: destacarVitrine,
        tipo_destaque: destacarVitrine ? (opcaoDestaque === 'avulso' ? 'global' : 'categoria') : null,
        cidade: cidade.trim() || 'São Paulo',
        estado: estado.trim() || 'SP',
        bairro: bairro.trim() || null,
        cep: cep.replace(/\D/g, '') || null,
        status: 'ativo',
      };

      let novoAnuncio: any = null;
      const { data: insertData, error: anuncioError } = await supabase
        .from(SUPABASE_TABLES.ANUNCIOS)
        .insert(dadosInsercao)
        .select()
        .single();

      if (anuncioError) {
        // Fallback resiliente: caso o banco retorne erro de schema cache na coluna tipo_destaque (PGRST204 / Could not find the 'tipo_destaque' column)
        const isColunaNaoEncontrada =
          anuncioError.code === 'PGRST204' ||
          (anuncioError.message && anuncioError.message.toLowerCase().includes('tipo_destaque'));

        if (isColunaNaoEncontrada) {
          console.warn('Fallback resiliente: coluna tipo_destaque ausente no schema cache do Supabase. Retentando insert sem o campo tipo_destaque...');
          delete dadosInsercao.tipo_destaque;
          const { data: retryData, error: retryError } = await supabase
            .from(SUPABASE_TABLES.ANUNCIOS)
            .insert(dadosInsercao)
            .select()
            .single();

          if (retryError) {
            throw new Error(`Erro ao cadastrar anúncio: ${retryError.message}`);
          }
          novoAnuncio = retryData;
        } else {
          throw new Error(`Erro ao cadastrar anúncio: ${anuncioError.message}`);
        }
      } else {
        novoAnuncio = insertData;
      }

      // Se ativou Destaque de Vitrine, processa o pagamento/créditos via RPC
      if (destacarVitrine) {
        setUploadStep('Aplicando Destaque de Vitrine no anúncio...');
        await destacarAnuncioVitrine(supabase, novoAnuncio.id, opcaoDestaque);
        await refreshProfile();
      }

      setUploadStep('Vinculando galeria de fotos WebP...');

      // 3. Salvar as fotos vinculadas na tabela `fotos_anuncio`
      const fotosParaInserir = uploadedPhotos.map((f) => ({
        anuncio_id: novoAnuncio.id,
        storage_path: f.storagePath,
        url: f.publicUrl,
        ordem: f.ordem,
        is_principal: f.isPrincipal,
      }));

      const { error: fotosError } = await supabase
        .from(SUPABASE_TABLES.FOTOS_ANUNCIO)
        .insert(fotosParaInserir);

      if (fotosError) {
        console.warn('Alerta ao registrar fotos no banco:', fotosError.message);
      }

      setStatusMessage({
        type: 'success',
        text: 'Anúncio publicado com sucesso! Redirecionando para a página do seu produto...',
      });

      // 4. Redirecionar para os detalhes do anúncio recém-criado
      setTimeout(() => {
        router.push(`/anuncio/${novoAnuncio.id}`);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao publicar anúncio.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
      setUploadStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Botão Voltar e Título */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-olx-purple transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Inserir Anúncio</h1>
          <span className="bg-orange-100 text-olx-orange text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Fotos WebP Grátis
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Publique seu produto ou serviço e encontre compradores rapidamente na sua região.
        </p>
      </div>

      {/* Banner de Autenticação Necessária se usuário não estiver logado */}
      {!authLoading && !user && (
        <div className="mb-6 p-5 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-olx-purple text-white flex items-center justify-center shrink-0 shadow-xs">
              <LogIn className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">Você precisa entrar para publicar</p>
              <p className="text-xs text-gray-600">
                Faça login ou crie uma conta gratuita para gerenciar seus anúncios e responder a mensagens no chat.
              </p>
            </div>
          </div>
          <Link
            href="/auth/login?redirect=/anunciar"
            className="w-full sm:w-auto text-center shrink-0 bg-olx-purple hover:bg-olx-purple-hover text-white text-sm font-bold px-6 py-3 rounded-xl transition shadow-xs"
          >
            Fazer Login
          </Link>
        </div>
      )}

      {/* Mensagens de Feedback */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-start gap-3 animate-fadeIn ${
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
          <p className="text-sm font-semibold">{statusMessage.text}</p>
        </div>
      )}

      {/* Formulário de Criação */}
      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
        {/* Seção 1: Fotos com Otimização WebP */}
        <div className="pb-6 border-b border-gray-100">
          <ImageUploaderWebP images={images} onChange={setImages} maxImages={6} />
        </div>

        {/* Seção 2: Informações Básicas do Produto */}
        <div className="space-y-5 pb-6 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Informações Básicas</h2>

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Título do anúncio *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: iPhone 13 128GB na garantia com caixa original"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition font-medium"
            />
            <p className="text-[11px] text-gray-400 mt-1">Inclua a marca, modelo e detalhes principais para facilitar as buscas.</p>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Categoria *
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none bg-white font-medium"
            >
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Descrição detalhada *
            </label>
            <textarea
              required
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva as características principais, tempo de uso, motivo da venda, o que acompanha, se aceita trocas, etc."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none transition leading-relaxed"
            />
          </div>

          {/* Modalidade de Negociação (3 Cards TroqJá: Venda vs Leilão vs Troca-Troca) */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Modalidade de Publicação *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1: Venda Direta */}
              <button
                type="button"
                onClick={() => {
                  setModalidade('venda');
                  setAceitaTroca(false);
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  modalidade === 'venda'
                    ? 'border-olx-purple bg-purple-50/50 shadow-xs ring-2 ring-purple-100'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      modalidade === 'venda'
                        ? 'bg-olx-purple text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Preço Fixo / Venda</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Venda tradicional exclusiva em dinheiro por valor pré-fixado.
                  </p>
                </div>
              </button>

              {/* Card 2: Leilão em Tempo Real */}
              <button
                type="button"
                onClick={() => setModalidade('leilao')}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  modalidade === 'leilao'
                    ? 'border-orange-500 bg-orange-50/60 shadow-xs ring-2 ring-orange-100'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      modalidade === 'leilao'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Gavel className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-gray-900">Leilão (Quem Dá Mais)</h4>
                    <span className="bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                      eBay Style
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Disputa com cronômetro regressivo e lances em tempo real.
                  </p>
                </div>
              </button>

              {/* Card 3: Troca-Troca / Permuta */}
              <button
                type="button"
                onClick={() => {
                  setModalidade('troca');
                  setAceitaTroca(true);
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  modalidade === 'troca'
                    ? 'border-[#00C853] bg-emerald-50/70 shadow-xs ring-2 ring-emerald-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      modalidade === 'troca'
                        ? 'bg-[#00C853] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-gray-900">Troca-Troca / Permuta</h4>
                    <span className="bg-[#00C853] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                      TroqJá
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Espaço dedicado a trocas, permutas e rolos inteligentes.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Preço de Venda (Apenas quando Venda Direta) */}
          {modalidade === 'venda' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Preço de Venda (R$) *
              </label>
              <div className="relative max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold text-sm pointer-events-none">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-lg font-black text-gray-900 focus:border-olx-purple focus:ring-2 focus:ring-purple-100 outline-none"
                />
              </div>

              <SimuladorRecebimentoVendedor
                valorTexto={preco}
                onAjustarPreco={setPreco}
              />
            </div>
          )}

          {/* Configurações de Leilão (Apenas quando Leilão) */}
          {modalidade === 'leilao' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-4">
              <div className="flex items-center gap-2 text-orange-900 font-bold text-sm">
                <Gavel className="w-4 h-4 text-orange-600" />
                <span>Configurações do Leilão em Tempo Real</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lance Inicial */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Lance Inicial (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold text-sm pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={lanceInicial}
                      onChange={(e) => setLanceInicial(e.target.value)}
                      placeholder="Ex: 50,00"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-base font-extrabold text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Valor de abertura do leilão.</p>
                </div>

                {/* Incremento Mínimo */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Incremento Mínimo (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold text-sm pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={incrementoMinimo}
                      onChange={(e) => setIncrementoMinimo(e.target.value)}
                      placeholder="10"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-base font-extrabold text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Valor somado a cada novo lance (padrão R$ 10).</p>
                </div>
              </div>

              <SimuladorRecebimentoVendedor
                valorTexto={lanceInicial}
                onAjustarPreco={setLanceInicial}
                rotuloValor="Lance inicial anunciado para o cliente"
              />

              {/* Duração do Leilão */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  <span>Duração do Leilão *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: '24h', label: '24 horas', desc: 'Relâmpago' },
                    { key: '3d', label: '3 dias', desc: 'Recomendado' },
                    { key: '5d', label: '5 dias', desc: 'Intermediário' },
                    { key: '7d', label: '7 dias', desc: 'Semanal' },
                  ].map((dur) => (
                    <button
                      key={dur.key}
                      type="button"
                      onClick={() => setDuracaoLeilao(dur.key as any)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        duracaoLeilao === dur.key
                          ? 'border-orange-600 bg-white text-orange-600 font-black shadow-xs ring-2 ring-orange-200'
                          : 'border-orange-200 bg-orange-50/50 text-gray-700 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm font-bold">{dur.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{dur.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Switch opcional de Troca dentro do Leilão */}
              <div className="pt-3 border-t border-orange-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Também aceita propostas de troca neste leilão?</h4>
                  <p className="text-[11px] text-gray-500">Permite que interessados proponham trocas enquanto o leilão decorre.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aceitaTroca}
                  onClick={() => setAceitaTroca(!aceitaTroca)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    aceitaTroca ? 'bg-[#00C853]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      aceitaTroca ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* PAINEL EXCLUSIVO DA MODALIDADE TROCA-TROCA + RADAR DE INTERESSADOS AO VIVO */}
          {(modalidade === 'troca' || (modalidade === 'leilao' && aceitaTroca)) && (
            <div className="p-5 sm:p-6 rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50/80 via-white to-green-50/60 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#00C853] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-gray-900">Painel de Troca & Permuta</h3>
                      <span className="bg-[#00C853] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        TroqJá
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure as condições da sua permuta e veja interessados reais.
                    </p>
                  </div>
                </div>
              </div>

              {/* Valor Estimado para Base de Troca (R$) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
                  Valor Estimado para Base de Troca (R$) *
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold text-sm pointer-events-none">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required={modalidade === 'troca'}
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    placeholder="Ex: 1.500,00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-base font-extrabold text-gray-900 focus:border-[#00C853] focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Serve de referência para nivelar os valores dos produtos envolvidos na negociação.
                </p>

                {modalidade === 'troca' && (
                  <SimuladorRecebimentoVendedor
                    valorTexto={preco}
                    onAjustarPreco={setPreco}
                    rotuloValor="Valor base/volta simulado na plataforma"
                  />
                )}
              </div>

              {/* Condição de Negociação (Chips) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Condição de Negociação da Permuta *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'pau_a_pau', label: 'Pau a pau', desc: 'Mesmo valor estimado' },
                    { id: 'aceita_volta', label: 'Aceito volta em R$', desc: 'Se seu item valer mais' },
                    { id: 'da_volta', label: 'Dou volta em R$', desc: 'Se o item oferecido valer mais' },
                  ].map((cond) => (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setCondicaoTroca(cond.id as CondicaoTroca)}
                      className={`p-3 rounded-xl border text-left transition ${
                        condicaoTroca === cond.id
                          ? 'border-[#00C853] bg-emerald-100/70 font-bold text-emerald-950 shadow-xs ring-2 ring-emerald-300'
                          : 'border-emerald-200/80 bg-white/80 text-gray-700 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="text-xs font-extrabold flex items-center gap-1.5">
                        {condicaoTroca === cond.id && <Check className="w-3.5 h-3.5 text-[#00C853]" />}
                        <span>{cond.label}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{cond.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* O que você aceita receber na troca */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
                  O que você aceita receber na troca? *
                </label>
                <input
                  type="text"
                  value={itensTroca}
                  onChange={(e) => setItensTroca(e.target.value)}
                  placeholder="Ex: Aceito iPhone 13, iPad 9, bicicleta aro 29, PC gamer..."
                  className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-sm focus:border-[#00C853] focus:ring-2 focus:ring-emerald-100 outline-none transition"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Seja específico nas marcas, modelos ou categorias que chamam sua atenção.
                </p>
              </div>

              {/* RADAR DE INTERESSADOS AO VIVO */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-900">
                      Radar de Interessados Ao Vivo
                    </span>
                  </div>
                  {buscandoInteressados && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verificando lista...
                    </span>
                  )}
                </div>

                {interessadosCount !== null && interessadosCount > 0 ? (
                  <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-3">
                    <span className="text-2xl animate-pulse">🔥</span>
                    <div>
                      <p className="text-sm font-black text-orange-900">
                        Existem {interessadosCount} {interessadosCount === 1 ? 'pessoa' : 'pessoas'} com este item na Lista de Desejos agora!
                      </p>
                      <p className="text-xs text-orange-700 mt-0.5">
                        Potencial altíssimo de fechar negócio logo nas primeiras horas de publicação.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        Seja o primeiro a anunciar este item para permuta na plataforma!
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Interessados que adicionarem este produto na Lista de Desejos serão avisados automaticamente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Aviso Informativo: Disparo 100% Gratuito & Integrado */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-[#00C853] shrink-0" />
                  <p className="text-xs font-semibold">
                    <span className="font-extrabold text-emerald-900">Aviso 100% Gratuito:</span> Os compradores interessados que monitoram este item receberão o alerta de match automaticamente, sem nenhuma cobrança do vendedor!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seção 3: Localização do Anúncio (Com busca automática de CEP) */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-olx-orange" />
              <span>Localização</span>
            </h2>
            <span className="text-xs text-gray-400">Digite seu CEP para preenchimento rápido</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* CEP */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                CEP
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={9}
                  value={cep}
                  onChange={handleCepChange}
                  placeholder="01001-000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple outline-none font-medium"
                />
                {buscandoCep && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-4 h-4 text-olx-orange animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Bairro
              </label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Centro"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple outline-none font-medium"
              />
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Cidade *
              </label>
              <input
                type="text"
                required
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="São Paulo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple outline-none font-medium"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Estado (UF) *
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                placeholder="SP"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-olx-purple outline-none font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* Seção 4: Destaque de Vitrine (Pay-per-Highlight) - Opcional */}
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 via-yellow-50/40 to-amber-50/70 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 text-amber-950 flex items-center justify-center font-black shadow-xs shrink-0">
                <Sparkles className="w-6 h-6 text-amber-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-gray-900">
                    Turbinar Anúncio com Destaque de Vitrine (Opcional)
                  </h3>
                  <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    Pay-per-Highlight
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Anúncios destacados ganham o selo dourado <span className="font-bold text-amber-900">"🔥 DESTAQUE"</span> e prioridade máxima no topo das buscas e do feed.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={destacarVitrine}
                onChange={(e) => setDestacarVitrine(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {destacarVitrine && (
            <div className="pt-3 border-t border-amber-200/80 space-y-3">
              <p className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Selecione o plano de turbinagem:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção A: Destaque Global */}
                <div
                  onClick={() => setOpcaoDestaque('avulso')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    opcaoDestaque === 'avulso'
                      ? 'border-amber-500 bg-white shadow-md ring-2 ring-amber-200'
                      : 'border-amber-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-gray-900">
                          Opção A: Destaque Global em Todas as Categorias
                        </span>
                        <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                          Alcance Máximo
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                        Seu anúncio aparece no carrossel de destaque do topo na Home, na Busca Geral e dentro de <strong>TODAS as categorias</strong> da plataforma, mesmo que o visitante esteja navegando em outra categoria!
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="opcaoDestaque"
                      checked={opcaoDestaque === 'avulso'}
                      onChange={() => setOpcaoDestaque('avulso')}
                      className="text-amber-500 focus:ring-amber-400 mt-1 shrink-0"
                    />
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-lg font-black text-amber-950">R$ 1,99</span>
                    <span className="text-[10px] text-gray-500 font-medium">/ anúncio</span>
                  </div>
                </div>

                {/* Opção B: Pacote 10 Destaques na Categoria */}
                <div
                  onClick={() => setOpcaoDestaque('pacote_10')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between relative overflow-hidden ${
                    opcaoDestaque === 'pacote_10'
                      ? 'border-amber-500 bg-white shadow-md ring-2 ring-amber-200'
                      : 'border-amber-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <span className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    Economize 75%
                  </span>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-black text-gray-900">
                        Opção B: Pacote 10 Destaques na Categoria
                      </span>
                      <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                        Usa 1 crédito para destacar este anúncio exclusivamente dentro da sua categoria correspondente (mais 9 créditos salvos no perfil).
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="opcaoDestaque"
                      checked={opcaoDestaque === 'pacote_10'}
                      onChange={() => setOpcaoDestaque('pacote_10')}
                      className="text-amber-500 focus:ring-amber-400 mt-1 shrink-0"
                    />
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-amber-950">R$ 4,90</span>
                    <span className="text-[10px] text-emerald-700 font-bold">(R$ 0,49 por anúncio)</span>
                  </div>
                </div>
              </div>

              {(profile?.creditos_destaque_vitrine ?? 0) > 0 && (
                <div
                  onClick={() => setOpcaoDestaque('credito')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    opcaoDestaque === 'credito'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                      : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold">
                        Você possui {profile?.creditos_destaque_vitrine} {profile?.creditos_destaque_vitrine === 1 ? 'crédito' : 'créditos'} de destaque no perfil!
                      </span>
                      <p className="text-[11px] text-emerald-700">Usar 1 crédito para destacar este anúncio sem custo adicional.</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="opcaoDestaque"
                    checked={opcaoDestaque === 'credito'}
                    onChange={() => setOpcaoDestaque('credito')}
                    className="text-emerald-600 focus:ring-emerald-400"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão de Envio e Progresso */}
        <div className="pt-6 border-t border-gray-100 space-y-3">
          {uploadStep && (
            <div className="p-3 bg-purple-50 rounded-xl flex items-center gap-2.5 text-xs text-olx-purple font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-olx-purple shrink-0" />
              <span>{uploadStep}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (!user && !authLoading)}
            className="w-full flex items-center justify-center gap-2 bg-olx-orange hover:bg-olx-orange-hover text-white font-bold py-4 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Publicando anúncio...</span>
              </>
            ) : (
              <span>Enviar Anúncio com Fotos WebP</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
