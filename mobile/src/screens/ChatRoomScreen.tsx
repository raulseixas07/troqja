import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Send,
  Clock,
  Sparkles,
  Star,
  Camera,
  X,
  Handshake,
  CheckCircle2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  SUPABASE_TABLES,
  formatCurrencyBRL,
  enviarMensagem,
  marcarMensagensComoLidas,
  obterReputacaoUsuario,
  fecharNegocioAnuncio,
  verificarAvaliacaoExistente,
  criarAvaliacao,
  type Mensagem,
  type ReputacaoUsuario,
} from '@olx-clone/shared';
import {
  convertAndResizeMobileImageToWebP,
  uploadMobileChatWebPToSupabase,
} from '../services/imageService';

interface ChatRoomScreenProps {
  conversaId: string;
  onBack: () => void;
}

interface ConversaHeaderInfo {
  outroNome: string;
  outroId: string;
  adId: string;
  adTitulo: string;
  adPreco: number;
  adStatus: string;
  adVendedorId: string;
  compradorId: string;
}

export function ChatRoomScreen({ conversaId, onBack }: ChatRoomScreenProps) {
  const { user, refreshUnreadCount } = useAuth();
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerInfo, setHeaderInfo] = useState<ConversaHeaderInfo | null>(null);
  const [reputacao, setReputacao] = useState<ReputacaoUsuario | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Estados de Imagem WebP no Chat
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);

  // Estados de Fechamento de Negócio e Avaliação
  const [modalFecharVisible, setModalFecharVisible] = useState(false);
  const [modalAvaliacaoVisible, setModalAvaliacaoVisible] = useState(false);
  const [fecharTipo, setFecharTipo] = useState<'venda' | 'troca' | 'leilao'>('venda');
  const [fechandoNegocio, setFechandoNegocio] = useState(false);
  const [minhaAvaliacaoFeita, setMinhaAvaliacaoFeita] = useState(false);
  const [minhaAvaliacaoNota, setMinhaAvaliacaoNota] = useState<number | null>(null);
  const [notaAvaliacao, setNotaAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Carregar histórico e detalhes do anúncio/usuário
  useEffect(() => {
    async function initChat() {
      if (!user) return;
      setLoading(true);

      try {
        // Marca as mensagens desta conversa como lidas
        marcarMensagensComoLidas(supabase, conversaId, user.id).then(() => {
          refreshUnreadCount();
        });

        // 1. Carrega dados da conversa
        const { data: convData } = await supabase
          .from(SUPABASE_TABLES.CONVERSAS)
          .select(`
            id,
            anuncio_id,
            comprador_id,
            vendedor_id,
            anuncio:anuncios(id, titulo, preco, status, modalidade, user_id),
            comprador:profiles!conversas_comprador_id_fkey(nome),
            vendedor:profiles!conversas_vendedor_id_fkey(nome)
          `)
          .eq('id', conversaId)
          .maybeSingle();

        if (convData) {
          const isComprador = convData.comprador_id === user.id;
          const outroId = isComprador ? convData.vendedor_id : convData.comprador_id;
          const outro = isComprador ? convData.vendedor : convData.comprador;
          const ad = convData.anuncio as any;

          setHeaderInfo({
            outroNome: (outro as { nome: string } | null)?.nome || 'Usuário TroqJá',
            outroId: outroId || '',
            adId: ad?.id || convData.anuncio_id,
            adTitulo: ad?.titulo || 'Anúncio',
            adPreco: Number(ad?.preco || 0),
            adStatus: ad?.status || 'ativo',
            adVendedorId: ad?.user_id || convData.vendedor_id,
            compradorId: convData.comprador_id,
          });

          if (ad?.status === 'vendido') {
            verificarAvaliacaoExistente(supabase, ad.id, user.id).then(({ avaliado, avaliacao }) => {
              setMinhaAvaliacaoFeita(avaliado);
              if (avaliacao?.nota) setMinhaAvaliacaoNota(Number(avaliacao.nota));
            });
          }

          if (outroId) {
            obterReputacaoUsuario(supabase, outroId).then(({ reputacao: rep }) => {
              if (rep) setReputacao(rep);
            });
          }
        }

        // 2. Carrega mensagens históricas
        const { data: msgData, error: msgError } = await supabase
          .from(SUPABASE_TABLES.MENSAGENS)
          .select('*')
          .eq('conversa_id', conversaId)
          .order('created_at', { ascending: true });

        if (!msgError && msgData) {
          setMessages(msgData as Mensagem[]);
        }
      } catch (err) {
        console.error('Erro ao inicializar chat room mobile:', err);
      } finally {
        setLoading(false);
      }
    }

    initChat();

    // 3. Canal Realtime Supabase para escutar novas mensagens em tempo real
    const channel = supabase
      .channel(`mobile_chat_${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: SUPABASE_TABLES.MENSAGENS,
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const nova = payload.new as Mensagem;
          setMessages((prev) => {
            if (prev.some((m) => m.id === nova.id)) return prev;
            return [...prev, nova];
          });

          if (user && nova.sender_id !== user.id) {
            marcarMensagensComoLidas(supabase, conversaId, user.id).then(() => {
              refreshUnreadCount();
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, user, refreshUnreadCount]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão Necessária', 'Precisamos de acesso às suas fotos para enviar imagens.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0]!;
        setConvertingPhoto(true);

        const converted = await convertAndResizeMobileImageToWebP(
          asset.uri,
          asset.width,
          asset.height,
          { maxWidth: 1200, maxHeight: 1200, quality: 0.82 }
        );

        setSelectedPhotoUri(converted.uri);
      }
    } catch (err) {
      console.error('Erro ao selecionar foto:', err);
      Alert.alert('Erro', 'Não foi possível carregar a imagem.');
    } finally {
      setConvertingPhoto(false);
    }
  };

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if ((!textToSend && !selectedPhotoUri) || !user || sending) return;

    setSending(true);
    setInputText('');
    const photoToUpload = selectedPhotoUri;
    setSelectedPhotoUri(null);

    // Mensagem otimista temporária
    const tempId = 'temp_' + Date.now();
    const optimisticMsg: Mensagem = {
      id: tempId,
      conversa_id: conversaId,
      sender_id: user.id,
      conteudo: textToSend || null,
      imagem_url: photoToUpload,
      lida: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      let imageUrl: string | null = null;
      if (photoToUpload) {
        const { publicUrl } = await uploadMobileChatWebPToSupabase(
          supabase,
          photoToUpload,
          conversaId
        );
        imageUrl = publicUrl;
      }

      const { mensagem, error } = await enviarMensagem(
        supabase,
        conversaId,
        user.id,
        textToSend || null,
        imageUrl
      );

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Alert.alert('Erro ao enviar', error.message);
        return;
      }

      if (mensagem) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? mensagem : m)));
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Erro ao enviar', err.message || 'Falha ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmarFecharNegocio = async () => {
    if (!headerInfo || !user) return;
    setFechandoNegocio(true);

    try {
      const { success, error } = await fecharNegocioAnuncio(
        supabase,
        headerInfo.adId,
        headerInfo.compradorId,
        fecharTipo
      );

      if (!success) {
        Alert.alert('Erro', error?.message || 'Falha ao fechar negócio.');
        return;
      }

      setHeaderInfo((prev) => (prev ? { ...prev, adStatus: 'vendido' } : prev));
      setModalFecharVisible(false);
      setModalAvaliacaoVisible(true);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao processar fechamento.');
    } finally {
      setFechandoNegocio(false);
    }
  };

  const handleEnviarAvaliacao = async () => {
    if (!headerInfo || !user) return;
    setEnviandoAvaliacao(true);

    try {
      const { success, error } = await criarAvaliacao(supabase, {
        anuncio_id: headerInfo.adId,
        avaliador_id: user.id,
        avaliado_id: headerInfo.outroId,
        nota: notaAvaliacao,
        comentario: comentarioAvaliacao.trim() || undefined,
        tipo_negocio: fecharTipo,
      });

      if (!success) {
        Alert.alert('Erro', error?.message || 'Falha ao registrar avaliação.');
        return;
      }

      setMinhaAvaliacaoFeita(true);
      setMinhaAvaliacaoNota(notaAvaliacao);
      Alert.alert('Sucesso', 'Avaliação enviada com sucesso!');
      setModalAvaliacaoVisible(false);

      const { reputacao: novaRep } = await obterReputacaoUsuario(supabase, headerInfo.outroId);
      if (novaRep) setReputacao(novaRep);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao enviar avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const isSeller = user?.id === headerInfo?.adVendedorId;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header do Chat */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#1B1B1B" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.headerUserRow}>
            <Text style={styles.headerUser} numberOfLines={1}>
              {headerInfo?.outroNome || 'Chat'}
            </Text>
            <View style={styles.starBadge}>
              <Star size={11} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.starBadgeText}>
                {reputacao ? reputacao.media_estrelas.toFixed(1) : '5.0'}
              </Text>
              <Text style={styles.starCountText}>
                ({reputacao?.total_avaliacoes || 0})
              </Text>
            </View>
          </View>
          {headerInfo && (
            <Text style={styles.headerAd} numberOfLines={1}>
              {headerInfo.adTitulo} • {formatCurrencyBRL(headerInfo.adPreco)}
            </Text>
          )}
        </View>

        {/* Botão de Fechar Negócio / Avaliação no Header */}
        {headerInfo?.adStatus === 'vendido' ? (
          !minhaAvaliacaoFeita ? (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => setModalAvaliacaoVisible(true)}
            >
              <Star size={13} color="#FFF" fill="#FFF" />
              <Text style={styles.rateButtonText}>Avaliar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ratedBadge}>
              <CheckCircle2 size={13} color="#059669" />
              <Text style={styles.ratedBadgeText}>{minhaAvaliacaoNota ?? 5}★</Text>
            </View>
          )
        ) : (
          isSeller && (
            <TouchableOpacity
              style={styles.closeDealButton}
              onPress={() => setModalFecharVisible(true)}
            >
              <Handshake size={14} color="#FFF" />
              <Text style={styles.closeDealButtonText}>Fechar</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Lista de Mensagens */}
      {loading ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#6E0AD6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={() => (
            <View style={styles.realtimeBadge}>
              <Sparkles size={12} color="#6E0AD6" />
              <Text style={styles.realtimeBadgeText}>Chat em tempo real protegido • TroqJá</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isMine = item.sender_id === user?.id;
            const hora = new Date(item.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View
                style={[
                  styles.bubbleContainer,
                  isMine ? styles.bubbleMineContainer : styles.bubbleOtherContainer,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMine ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  {/* Renderização de Imagem WebP enviada */}
                  {item.imagem_url ? (
                    <Image
                      source={{ uri: item.imagem_url }}
                      style={styles.bubbleImage}
                      resizeMode="cover"
                    />
                  ) : null}

                  {item.conteudo ? (
                    <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                      {item.conteudo}
                    </Text>
                  ) : null}

                  <View style={styles.timeRow}>
                    <Clock size={10} color={isMine ? '#E9D5FF' : '#9E9E9E'} />
                    <Text
                      style={[
                        styles.timeText,
                        isMine ? styles.timeTextMine : styles.timeTextOther,
                      ]}
                    >
                      {hora}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Prévia da Foto Selecionada */}
      {selectedPhotoUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedPhotoUri }} style={styles.previewImage} />
          <Text style={styles.previewText}>Foto WebP pronta para envio</Text>
          <TouchableOpacity
            style={styles.previewRemove}
            onPress={() => setSelectedPhotoUri(null)}
          >
            <X size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input de Envio com Botão de Foto */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handlePickImage}
          disabled={convertingPhoto || sending}
        >
          {convertingPhoto ? (
            <ActivityIndicator size="small" color="#6E0AD6" />
          ) : (
            <Camera size={20} color="#6E0AD6" />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={selectedPhotoUri ? 'Adicione uma legenda...' : 'Digite sua mensagem...'}
          placeholderTextColor="#9E9E9E"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() && !selectedPhotoUri) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={(!inputText.trim() && !selectedPhotoUri) || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Send size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Fechar Negócio Mobile */}
      <Modal visible={modalFecharVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🤝 Fechar Negócio</Text>
            <Text style={styles.modalDesc}>
              Confirmar o fechamento deste anúncio com {headerInfo?.outroNome}? O anúncio será marcado como vendido e a avaliação será liberada.
            </Text>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.tipoButton, fecharTipo === 'venda' && styles.tipoButtonActive]}
                onPress={() => setFecharTipo('venda')}
              >
                <Text style={[styles.tipoText, fecharTipo === 'venda' && styles.tipoTextActive]}>Venda</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoButton, fecharTipo === 'troca' && styles.tipoButtonActive]}
                onPress={() => setFecharTipo('troca')}
              >
                <Text style={[styles.tipoText, fecharTipo === 'troca' && styles.tipoTextActive]}>Troca</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoButton, fecharTipo === 'leilao' && styles.tipoButtonActive]}
                onPress={() => setFecharTipo('leilao')}
              >
                <Text style={[styles.tipoText, fecharTipo === 'leilao' && styles.tipoTextActive]}>Leilão</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalFecharVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmarFecharNegocio}
                disabled={fechandoNegocio}
              >
                {fechandoNegocio ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Avaliação Mobile */}
      <Modal visible={modalAvaliacaoVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⭐ Avaliar Negociação</Text>
            <Text style={styles.modalDesc}>Como foi sua experiência com {headerInfo?.outroNome}?</Text>

            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((st) => (
                <TouchableOpacity key={st} onPress={() => setNotaAvaliacao(st)} style={styles.starTouch}>
                  <Star
                    size={28}
                    color="#F59E0B"
                    fill={st <= notaAvaliacao ? '#F59E0B' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Escreva um comentário (opcional)..."
              placeholderTextColor="#9E9E9E"
              value={comentarioAvaliacao}
              onChangeText={setComentarioAvaliacao}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalAvaliacaoVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRateButton}
                onPress={handleEnviarAvaliacao}
                disabled={enviandoAvaliacao}
              >
                {enviandoAvaliacao ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Enviar Avaliação</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerInfo: {
    flex: 1,
  },
  headerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerUser: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  starBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  starCountText: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  headerAd: {
    fontSize: 11,
    color: '#6E0AD6',
    fontWeight: '600',
    marginTop: 1,
  },
  closeDealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  closeDealButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  rateButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  ratedBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  messageList: {
    padding: 12,
    paddingBottom: 20,
  },
  realtimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  realtimeBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  bubbleContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  bubbleMineContainer: {
    justifyContent: 'flex-end',
  },
  bubbleOtherContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    padding: 10,
    borderRadius: 14,
  },
  bubbleMine: {
    backgroundColor: '#6E0AD6',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 2,
  },
  bubbleImage: {
    width: 220,
    height: 160,
    borderRadius: 10,
    marginBottom: 6,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextMine: {
    color: '#FFF',
  },
  bubbleTextOther: {
    color: '#1B1B1B',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 3,
  },
  timeText: {
    fontSize: 9,
  },
  timeTextMine: {
    color: '#E9D5FF',
  },
  timeTextOther: {
    color: '#9E9E9E',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#DDD6FE',
    gap: 8,
  },
  previewImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  previewText: {
    flex: 1,
    fontSize: 11,
    color: '#5B21B6',
    fontWeight: '600',
  },
  previewRemove: {
    backgroundColor: '#EF4444',
    padding: 4,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 8,
  },
  cameraButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1B1B1B',
  },
  sendButton: {
    backgroundColor: '#F15A24',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 14,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  tipoButtonActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  tipoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tipoTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  starTouch: {
    padding: 4,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmRateButton: {
    flex: 1,
    backgroundColor: '#6E0AD6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
});
