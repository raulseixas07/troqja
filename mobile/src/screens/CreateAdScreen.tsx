import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { ImagePickerWebP, type MobileImageItem } from '../components/ImagePickerWebP';
import { uploadMobileWebPToSupabase } from '../services/imageService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  SUPABASE_TABLES,
  formatCEP,
  buscarEnderecoPorCEP,
  contarInteressadosDesejo,
  destacarAnuncioVitrine,
  type Categoria,
  type ModalidadeAnuncio,
  type CondicaoTroca,
} from '@olx-clone/shared';
import { ArrowLeft, Check, MapPin, Gavel, Tag, Repeat, Clock, Flame, Sparkles } from 'lucide-react-native';

const CATEGORIAS_FALLBACK = [
  { id: '1', nome: 'Autos e peças' },
  { id: '2', nome: 'Imóveis' },
  { id: '3', nome: 'Eletrônicos e celulares' },
  { id: '4', nome: 'Para sua casa' },
  { id: '5', nome: 'Moda e beleza' },
  { id: '6', nome: 'Música e hobbies' },
  { id: '7', nome: 'Esportes e lazer' },
  { id: '8', nome: 'Vagas de emprego' },
  { id: '9', nome: 'Serviços' },
];

interface CreateAdScreenProps {
  onBack: () => void;
  onSuccess: (anuncioId: string) => void;
}

export function CreateAdScreen({ onBack, onSuccess }: CreateAdScreenProps) {
  const { user, profile, refreshProfile } = useAuth();

  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>(CATEGORIAS_FALLBACK);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState('1');

  const [images, setImages] = useState<MobileImageItem[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');

  // Novos diferenciais TroqJá (Venda vs Leilão vs Troca-Troca)
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
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState(profile?.cidade || 'São Paulo');
  const [estado, setEstado] = useState(profile?.estado || 'SP');

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState('');

  // Define opção padrão de créditos se o vendedor possuir saldo
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
    if (cleanTitulo.length < 2 && !selectedCategoriaId) {
      setInteressadosCount(null);
      return;
    }

    setBuscandoInteressados(true);
    const timer = setTimeout(async () => {
      try {
        const total = await contarInteressadosDesejo(supabase, cleanTitulo, selectedCategoriaId);
        setInteressadosCount(total);
      } finally {
        setBuscandoInteressados(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [titulo, selectedCategoriaId, modalidade]);

  // Carregar categorias dinâmicas do Supabase
  useEffect(() => {
    async function loadCategorias() {
      try {
        const { data, error } = await supabase
          .from(SUPABASE_TABLES.CATEGORIAS)
          .select('id, nome, ordem')
          .order('ordem', { ascending: true });

        if (!error && data && data.length > 0) {
          setCategorias(data as Categoria[]);
          if (data[0]) {
            setSelectedCategoriaId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar categorias do Supabase, utilizando fallback:', err);
      }
    }

    loadCategorias();
  }, []);

  useEffect(() => {
    if (profile?.cidade && !cidade) setCidade(profile.cidade);
    if (profile?.estado && estado === 'SP') setEstado(profile.estado);
    if (profile?.cep && !cep) setCep(formatCEP(profile.cep));
  }, [profile, cidade, estado, cep]);

  // Busca de endereço automática por CEP
  const handleCepChange = async (text: string) => {
    const formatted = formatCEP(text);
    setCep(formatted);

    const clean = text.replace(/\D/g, '');
    if (clean.length === 8) {
      setBuscandoCep(true);
      try {
        const endereco = await buscarEnderecoPorCEP(clean);
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

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Login necessário', 'Você precisa estar logado para publicar um anúncio.');
      return;
    }

    if (!titulo.trim() || !descricao.trim()) {
      Alert.alert('Campos incompletos', 'Preencha o título e a descrição do anúncio.');
      return;
    }

    if (modalidade === 'venda' && !preco.trim()) {
      Alert.alert('Preço obrigatório', 'Informe o valor do anúncio para venda direta.');
      return;
    }

    if (modalidade === 'troca' && !preco.trim()) {
      Alert.alert('Valor estimado obrigatório', 'Informe o valor estimado como base de troca.');
      return;
    }

    if (modalidade === 'leilao' && !lanceInicial.trim()) {
      Alert.alert('Lance inicial obrigatório', 'Informe o lance inicial para o modo leilão.');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Foto obrigatória', 'Adicione ao menos uma foto (convertida para WebP) ao seu anúncio.');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = user.id;
      const novoAnuncioId = 'ad_' + Date.now();

      // 1. Upload de cada foto WebP para o Supabase Storage
      const uploadedPhotos: { storagePath: string; publicUrl: string; isPrincipal: boolean; ordem: number }[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        setUploadStep(`Enviando foto WebP ${i + 1} de ${images.length}...`);

        const { storagePath, publicUrl } = await uploadMobileWebPToSupabase(
          supabase,
          img.processed.uri,
          userId,
          novoAnuncioId
        );

        uploadedPhotos.push({
          storagePath,
          publicUrl,
          isPrincipal: img.isPrincipal || i === 0,
          ordem: i,
        });
      }

      setUploadStep('Salvando anúncio no banco...');

      // 2. Cadastrar Anúncio no banco com campos de leilão e permuta
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

      const dadosInsercao: any = {
        user_id: userId,
        categoria_id: selectedCategoriaId || categorias[0]!.id,
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
      const { data: adCriado, error: adError } = await supabase
        .from(SUPABASE_TABLES.ANUNCIOS)
        .insert(dadosInsercao)
        .select()
        .single();

      if (adError) {
        // Fallback resiliente: caso o banco retorne erro de schema cache na coluna tipo_destaque (PGRST204 / Could not find the 'tipo_destaque' column)
        const isColunaNaoEncontrada =
          adError.code === 'PGRST204' ||
          (adError.message && adError.message.toLowerCase().includes('tipo_destaque'));

        if (isColunaNaoEncontrada) {
          console.warn('Fallback resiliente mobile: coluna tipo_destaque ausente no schema cache. Retentando insert sem o campo tipo_destaque...');
          delete dadosInsercao.tipo_destaque;
          const { data: retryData, error: retryError } = await supabase
            .from(SUPABASE_TABLES.ANUNCIOS)
            .insert(dadosInsercao)
            .select()
            .single();

          if (retryError) {
            throw new Error(retryError.message);
          }
          novoAnuncio = retryData;
        } else {
          throw new Error(adError.message);
        }
      } else {
        novoAnuncio = adCriado;
      }

      // Se selecionou Destaque de Vitrine, processa via RPC
      if (destacarVitrine) {
        setUploadStep('Aplicando Destaque de Vitrine...');
        await destacarAnuncioVitrine(supabase, novoAnuncio.id, opcaoDestaque);
        await refreshProfile();
      }

      setUploadStep('Registrando fotos vinculadas...');

      // 3. Cadastrar fotos vinculadas
      const fotosRows = uploadedPhotos.map((f) => ({
        anuncio_id: novoAnuncio.id,
        storage_path: f.storagePath,
        url: f.publicUrl,
        ordem: f.ordem,
        is_principal: f.isPrincipal,
      }));

      await supabase.from(SUPABASE_TABLES.FOTOS_ANUNCIO).insert(fotosRows);

      Alert.alert('Sucesso!', 'Seu anúncio foi publicado com sucesso no TroqJá!', [
        { text: 'Visualizar Anúncio', onPress: () => onSuccess(novoAnuncio.id) },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao publicar anúncio.';
      Alert.alert('Erro na publicação', msg);
    } finally {
      setIsSubmitting(false);
      setUploadStep('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#1B1B1B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inserir Anúncio</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Componente de Foto WebP */}
      <ImagePickerWebP images={images} onChange={setImages} maxImages={6} />

      {/* Formulário */}
      <View style={styles.formSection}>
        {/* Título */}
        <Text style={styles.label}>Título do anúncio *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: PlayStation 5 com 2 controles"
          value={titulo}
          onChangeText={setTitulo}
        />

        {/* Categoria */}
        <Text style={styles.label}>Categoria *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategoriaId === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategoriaId(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategoriaId === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Modalidade de Publicação (3 Cards TroqJá) */}
        <Text style={styles.label}>Modalidade de Publicação *</Text>
        <View style={styles.modeRow}>
          {/* Card 1: Venda Direta */}
          <TouchableOpacity
            style={[styles.modeCard, modalidade === 'venda' && styles.modeCardActiveVenda]}
            onPress={() => {
              setModalidade('venda');
              setAceitaTroca(false);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIconCircle, modalidade === 'venda' && styles.modeIconCircleActiveVenda]}>
              <Tag size={16} color={modalidade === 'venda' ? '#FFF' : '#6E0AD6'} />
            </View>
            <Text style={[styles.modeTitle, modalidade === 'venda' && styles.modeTitleActiveVenda]}>
              Venda
            </Text>
            <Text style={styles.modeDesc}>Preço fixo</Text>
          </TouchableOpacity>

          {/* Card 2: Leilão */}
          <TouchableOpacity
            style={[styles.modeCard, modalidade === 'leilao' && styles.modeCardActiveLeilao]}
            onPress={() => setModalidade('leilao')}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIconCircle, modalidade === 'leilao' && styles.modeIconCircleActiveLeilao]}>
              <Gavel size={16} color={modalidade === 'leilao' ? '#FFF' : '#FF6B00'} />
            </View>
            <View style={styles.auctionHeaderBadgeRow}>
              <Text style={[styles.modeTitle, modalidade === 'leilao' && styles.modeTitleActiveLeilao]}>
                Leilão
              </Text>
              <View style={styles.ebayMiniBadge}>
                <Text style={styles.ebayMiniText}>eBay</Text>
              </View>
            </View>
            <Text style={styles.modeDesc}>Quem dá mais</Text>
          </TouchableOpacity>

          {/* Card 3: Troca-Troca */}
          <TouchableOpacity
            style={[styles.modeCard, modalidade === 'troca' && styles.modeCardActiveTroca]}
            onPress={() => {
              setModalidade('troca');
              setAceitaTroca(true);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIconCircle, modalidade === 'troca' && styles.modeIconCircleActiveTroca]}>
              <Repeat size={16} color={modalidade === 'troca' ? '#FFF' : '#00C853'} />
            </View>
            <View style={styles.auctionHeaderBadgeRow}>
              <Text style={[styles.modeTitle, modalidade === 'troca' && styles.modeTitleActiveTroca]}>
                Troca
              </Text>
              <View style={styles.trocaMiniBadge}>
                <Text style={styles.ebayMiniText}>TroqJá</Text>
              </View>
            </View>
            <Text style={styles.modeDesc}>Permuta pura</Text>
          </TouchableOpacity>
        </View>

        {/* Descrição */}
        <Text style={styles.label}>Descrição *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descreva detalhes, garantia, tempo de uso, o que acompanha..."
          value={descricao}
          onChangeText={setDescricao}
          multiline
          numberOfLines={4}
        />

        {/* Preço de Venda Direta (Apenas quando Venda) */}
        {modalidade === 'venda' && (
          <View>
            <Text style={styles.label}>Preço de Venda (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              value={preco}
              onChangeText={setPreco}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Seção Leilão */}
        {modalidade === 'leilao' && (
          <View style={styles.auctionConfigBox}>
            <View style={styles.auctionConfigHeader}>
              <Gavel size={16} color="#FF6B00" />
              <Text style={styles.auctionConfigTitle}>Configurações do Leilão</Text>
            </View>

            <View style={styles.locationRow}>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.label}>Lance Inicial (R$) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50,00"
                  value={lanceInicial}
                  onChangeText={setLanceInicial}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.label}>Incremento (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  value={incrementoMinimo}
                  onChangeText={setIncrementoMinimo}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Duração do leilão */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 6 }}>
              <Clock size={14} color="#FF6B00" />
              <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Duração do Leilão *</Text>
            </View>
            <View style={styles.durationRow}>
              {[
                { key: '24h', label: '24h' },
                { key: '3d', label: '3 dias' },
                { key: '5d', label: '5 dias' },
                { key: '7d', label: '7 dias' },
              ].map((dur) => (
                <TouchableOpacity
                  key={dur.key}
                  style={[
                    styles.durationChip,
                    duracaoLeilao === dur.key && styles.durationChipActive,
                  ]}
                  onPress={() => setDuracaoLeilao(dur.key as any)}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      duracaoLeilao === dur.key && styles.durationChipTextActive,
                    ]}
                  >
                    {dur.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Switch para aceitar troca dentro do leilão */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#FFE0B2' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#E65100' }}>Aceita propostas de troca?</Text>
                <Text style={{ fontSize: 10, color: '#6C757D' }}>Permite permutas além dos lances</Text>
              </View>
              <Switch
                value={aceitaTroca}
                onValueChange={setAceitaTroca}
                trackColor={{ false: '#CED4DA', true: '#00C853' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        )}

        {/* PAINEL EXCLUSIVO TROCA-TROCA + RADAR DE INTERESSADOS */}
        {(modalidade === 'troca' || (modalidade === 'leilao' && aceitaTroca)) && (
          <View style={styles.tradeCardBox}>
            <View style={styles.tradeCardHeader}>
              <View style={styles.tradeIconCircle}>
                <Repeat size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.tradeTitle}>Painel de Permuta</Text>
                  <View style={styles.trocaMiniBadge}>
                    <Text style={styles.ebayMiniText}>TroqJá</Text>
                  </View>
                </View>
                <Text style={styles.tradeSubtitle}>Configure a troca e consulte interessados reais</Text>
              </View>
            </View>

            {/* Valor Estimado para Base de Troca */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.tradeInputLabel}>Valor Estimado Base (R$) *</Text>
              <TextInput
                style={styles.tradeTextInput}
                placeholder="Ex: 1500,00"
                value={preco}
                onChangeText={setPreco}
                keyboardType="numeric"
              />
            </View>

            {/* Condição de Troca (Chips) */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.tradeInputLabel}>Condição de Negociação *</Text>
              <View style={styles.conditionRow}>
                {[
                  { id: 'pau_a_pau', label: 'Pau a pau' },
                  { id: 'aceita_volta', label: 'Aceito volta' },
                  { id: 'da_volta', label: 'Dou volta' },
                ].map((cond) => (
                  <TouchableOpacity
                    key={cond.id}
                    style={[
                      styles.conditionChip,
                      condicaoTroca === cond.id && styles.conditionChipActive,
                    ]}
                    onPress={() => setCondicaoTroca(cond.id as CondicaoTroca)}
                  >
                    <Text
                      style={[
                        styles.conditionChipText,
                        condicaoTroca === cond.id && styles.conditionChipTextActive,
                      ]}
                    >
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Itens que aceita na troca */}
            <View style={styles.tradeInputContainer}>
              <Text style={styles.tradeInputLabel}>O que você aceita na troca? *</Text>
              <TextInput
                style={styles.tradeTextInput}
                placeholder="Ex: Aceito smartphone, notebook, bike aro 29..."
                value={itensTroca}
                onChangeText={setItensTroca}
              />
            </View>

            {/* RADAR DE INTERESSADOS AO VIVO */}
            <View style={styles.radarBox}>
              <View style={styles.radarHeader}>
                <Flame size={14} color="#FF6B00" />
                <Text style={styles.radarTitle}>RADAR DE INTERESSADOS AO VIVO</Text>
                {buscandoInteressados && <ActivityIndicator size="small" color="#FF6B00" />}
              </View>

              {interessadosCount !== null && interessadosCount > 0 ? (
                <View style={styles.radarAlertBox}>
                  <Text style={styles.radarAlertText}>
                    🔥 Existem {interessadosCount} {interessadosCount === 1 ? 'pessoa' : 'pessoas'} com este item na Lista de Desejos agora!
                  </Text>
                </View>
              ) : (
                <View style={styles.radarAlertBoxEmpty}>
                  <Text style={styles.radarAlertTextEmpty}>
                    💡 Seja o primeiro a anunciar este item para permuta na plataforma!
                  </Text>
                </View>
              )}

              {/* Aviso Gratuito e Integrado */}
              <View style={styles.radarFreeNotice}>
                <Check size={14} color="#00C853" />
                <Text style={styles.radarFreeNoticeText}>
                  Aviso 100% gratuito: os compradores interessados serão alertados automaticamente assim que o anúncio for publicado!
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Localização */}
        <View style={styles.locationHeaderRow}>
          <MapPin size={16} color="#FF6B00" />
          <Text style={styles.locationHeaderText}>Localização do produto</Text>
        </View>

        <View style={styles.locationRow}>
          <View style={{ flex: 1.5 }}>
            <Text style={styles.label}>CEP</Text>
            <View style={styles.inputWithSpinner}>
              <TextInput
                style={styles.inputInner}
                value={cep}
                maxLength={9}
                onChangeText={handleCepChange}
                placeholder="01001-000"
                keyboardType="numeric"
              />
              {buscandoCep && <ActivityIndicator size="small" color="#FF6B00" />}
            </View>
          </View>

          <View style={{ flex: 1.5, marginLeft: 10 }}>
            <Text style={styles.label}>Bairro</Text>
            <TextInput
              style={styles.input}
              value={bairro}
              onChangeText={setBairro}
              placeholder="Centro"
            />
          </View>
        </View>

        <View style={styles.locationRow}>
          <View style={{ flex: 2 }}>
            <Text style={styles.label}>Cidade *</Text>
            <TextInput
              style={styles.input}
              value={cidade}
              onChangeText={setCidade}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.label}>UF *</Text>
            <TextInput
              style={styles.input}
              value={estado}
              maxLength={2}
              autoCapitalize="characters"
              onChangeText={(t) => setEstado(t.toUpperCase())}
            />
          </View>
        </View>
      </View>

      {/* SEÇÃO: DESTAQUE DE VITRINE (PAY-PER-HIGHLIGHT - OPCIONAL) */}
      <View style={styles.destaqueBox}>
        <View style={styles.destaqueHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={styles.destaqueIconCircle}>
              <Sparkles size={16} color="#3E2723" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.destaqueTitle}>Destaque de Vitrine</Text>
                <View style={styles.destaqueMiniBadge}>
                  <Text style={styles.destaqueMiniBadgeText}>VIP</Text>
                </View>
              </View>
              <Text style={styles.destaqueSubtitle}>
                Apareça no topo com o selo dourado 🔥 DESTAQUE
              </Text>
            </View>
          </View>
          <Switch
            value={destacarVitrine}
            onValueChange={setDestacarVitrine}
            trackColor={{ false: '#CED4DA', true: '#FFB300' }}
            thumbColor={destacarVitrine ? '#FF8F00' : '#F8F9FA'}
          />
        </View>

        {destacarVitrine && (
          <View style={styles.destaqueOptionsContainer}>
            {/* Opção A: Destaque Global */}
            <TouchableOpacity
              style={[
                styles.destaqueOptionCard,
                opcaoDestaque === 'avulso' && styles.destaqueOptionCardActive,
              ]}
              onPress={() => setOpcaoDestaque('avulso')}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.destaqueOptionTitle}>Opção A: Destaque Global (R$ 1,99)</Text>
                  <View style={[styles.destaqueMiniBadge, { backgroundColor: '#FFD700' }]}>
                    <Text style={[styles.destaqueMiniBadgeText, { color: '#3E2723' }]}>TODAS CATS</Text>
                  </View>
                </View>
                <Text style={styles.destaqueOptionDesc}>
                  Aparece no carrossel do topo na Home, busca geral e em TODAS as categorias da plataforma!
                </Text>
              </View>
              <Text style={styles.destaqueOptionPrice}>R$ 1,99</Text>
            </TouchableOpacity>

            {/* Opção B: Pacote 10 Destaques na Categoria */}
            <TouchableOpacity
              style={[
                styles.destaqueOptionCard,
                opcaoDestaque === 'pacote_10' && styles.destaqueOptionCardActive,
              ]}
              onPress={() => setOpcaoDestaque('pacote_10')}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.destaqueOptionTitle}>Opção B: Pacote 10 Destaques Categoria</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>-75%</Text>
                  </View>
                </View>
                <Text style={styles.destaqueOptionDesc}>
                  Usa 1 crédito para destacar na categoria correspondente (mais 9 créditos no perfil).
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.destaqueOptionPrice}>R$ 4,90</Text>
                <Text style={styles.destaqueOptionPerItem}>R$ 0,49/cada</Text>
              </View>
            </TouchableOpacity>

            {/* Opção Créditos */}
            {(profile?.creditos_destaque_vitrine ?? 0) > 0 && (
              <TouchableOpacity
                style={[
                  styles.destaqueOptionCard,
                  { borderColor: '#00C853', backgroundColor: '#E8F5E9' },
                  opcaoDestaque === 'credito' && { borderWidth: 2 },
                ]}
                onPress={() => setOpcaoDestaque('credito')}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.destaqueOptionTitle, { color: '#1B5E20' }]}>
                    Usar 1 crédito ({profile?.creditos_destaque_vitrine} restantes)
                  </Text>
                  <Text style={[styles.destaqueOptionDesc, { color: '#2E7D32' }]}>
                    Sem cobrança adicional no cartão/PIX
                  </Text>
                </View>
                <Check size={16} color="#00C853" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Indicador de Etapas */}
      {uploadStep !== '' && (
        <View style={styles.stepContainer}>
          <ActivityIndicator size="small" color="#6E0AD6" />
          <Text style={styles.stepText}>{uploadStep}</Text>
        </View>
      )}

      {/* Botão de Envio */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <View style={styles.submitRow}>
            <Check size={18} color="#FFF" />
            <Text style={styles.submitButtonText}>Publicar Anúncio no TroqJá</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B1B1B',
  },
  formSection: {
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  categoryChipActive: {
    backgroundColor: '#6E0AD6',
    borderColor: '#6E0AD6',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  modeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  modeCardActiveVenda: {
    borderColor: '#6E0AD6',
    backgroundColor: '#F7F0FF',
  },
  modeCardActiveLeilao: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF5EB',
  },
  modeCardActiveTroca: {
    borderColor: '#00C853',
    backgroundColor: '#E8F5E9',
  },
  modeIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  modeIconCircleActiveVenda: {
    backgroundColor: '#6E0AD6',
  },
  modeIconCircleActiveLeilao: {
    backgroundColor: '#FF6B00',
  },
  modeIconCircleActiveTroca: {
    backgroundColor: '#00C853',
  },
  auctionHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ebayMiniBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  trocaMiniBadge: {
    backgroundColor: '#00C853',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ebayMiniText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212529',
  },
  modeTitleActiveVenda: {
    color: '#6E0AD6',
  },
  modeTitleActiveLeilao: {
    color: '#FF6B00',
  },
  modeTitleActiveTroca: {
    color: '#00C853',
  },
  modeDesc: {
    fontSize: 10,
    color: '#6C757D',
    marginTop: 2,
  },
  auctionConfigBox: {
    backgroundColor: '#FFF7EE',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  auctionConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  auctionConfigTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E65100',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCC80',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationChipActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E65100',
  },
  durationChipTextActive: {
    color: '#FFF',
  },
  tradeCardBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  tradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B5E20',
  },
  tradeSubtitle: {
    fontSize: 10,
    color: '#2E7D32',
  },
  tradeInputContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  tradeInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tradeTextInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1B1B1B',
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  conditionChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionChipActive: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  conditionChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1B5E20',
  },
  conditionChipTextActive: {
    color: '#FFF',
  },
  radarBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 10,
    marginTop: 12,
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  radarTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1B1B1B',
    letterSpacing: 0.5,
  },
  radarAlertBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    padding: 8,
    marginBottom: 8,
  },
  radarAlertText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E65100',
  },
  radarAlertBoxEmpty: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 8,
    marginBottom: 8,
  },
  radarAlertTextEmpty: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  radarFreeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  radarFreeNoticeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    flex: 1,
  },
  destaqueBox: {
    backgroundColor: '#FFFDE7',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  destaqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destaqueIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destaqueTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E2723',
  },
  destaqueSubtitle: {
    fontSize: 10,
    color: '#5D4037',
    marginTop: 1,
  },
  destaqueMiniBadge: {
    backgroundColor: '#FFB300',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  destaqueMiniBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#3E2723',
  },
  destaqueOptionsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
    gap: 8,
  },
  destaqueOptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFE082',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destaqueOptionCardActive: {
    borderColor: '#FF8F00',
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
  },
  destaqueOptionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#212529',
  },
  destaqueOptionDesc: {
    fontSize: 9,
    color: '#6C757D',
    marginTop: 1,
  },
  destaqueOptionPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E65100',
  },
  destaqueOptionPerItem: {
    fontSize: 8,
    fontWeight: '700',
    color: '#2E7D32',
  },
  discountBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  discountBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
  },
  activeSubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#00C853',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeSubText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B1B1B',
    backgroundColor: '#FFF',
  },
  inputWithSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FFF',
  },
  inputInner: {
    flex: 1,
    fontSize: 14,
    color: '#1B1B1B',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 4,
  },
  locationHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  locationRow: {
    flexDirection: 'row',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  stepText: {
    fontSize: 12,
    color: '#6E0AD6',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
