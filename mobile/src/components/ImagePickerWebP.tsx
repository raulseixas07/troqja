import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Trash2, Star } from 'lucide-react-native';
import { convertAndResizeMobileImageToWebP, type MobileProcessedWebP } from '../services/imageService';

export interface MobileImageItem {
  id: string;
  processed: MobileProcessedWebP;
  isPrincipal: boolean;
}

interface ImagePickerWebPProps {
  images: MobileImageItem[];
  onChange: (images: MobileImageItem[]) => void;
  maxImages?: number;
}

export function ImagePickerWebP({
  images,
  onChange,
  maxImages = 6,
}: ImagePickerWebPProps) {
  const [isConverting, setIsConverting] = useState(false);

  const handlePickImages = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limite atingido', `Você já selecionou o limite máximo de ${maxImages} fotos.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para você adicionar imagens ao anúncio.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
      quality: 1, // Obtém a foto original em alta resolução para que nosso manipulador faça o WebP
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    setIsConverting(true);

    try {
      const newItems: MobileImageItem[] = [];

      for (const asset of result.assets) {
        const webpResult = await convertAndResizeMobileImageToWebP(
          asset.uri,
          asset.width ?? 1280,
          asset.height ?? 1280
        );

        const isFirst = images.length === 0 && newItems.length === 0;
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          processed: webpResult,
          isPrincipal: isFirst,
        });
      }

      onChange([...images, ...newItems]);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível converter a foto para WebP.');
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleRemove = (id: string) => {
    const remaining = images.filter((img) => img.id !== id);
    if (remaining.length > 0 && !remaining.some((img) => img.isPrincipal)) {
      remaining[0] = { ...remaining[0]!, isPrincipal: true };
    }
    onChange(remaining);
  };

  const handleSetPrincipal = (id: string) => {
    const updated = images.map((img) => ({
      ...img,
      isPrincipal: img.id === id,
    }));
    onChange(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Fotos do Anúncio</Text>
        <Text style={styles.counter}>{images.length} de {maxImages}</Text>
      </View>
      <Text style={styles.subtitle}>
        Fotos convertidas automaticamente para WebP de alta velocidade.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
        {/* Botão de Adicionar */}
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handlePickImages}
            disabled={isConverting}
          >
            {isConverting ? (
              <ActivityIndicator color="#FF6B00" />
            ) : (
              <>
                <Camera size={28} color="#FF6B00" />
                <Text style={styles.addButtonText}>Incluir Fotos</Text>
                <Text style={styles.badgeWebP}>WebP</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Fotos Carregadas */}
        {images.map((item) => (
          <View
            key={item.id}
            style={[styles.thumbnailCard, item.isPrincipal && styles.principalBorder]}
          >
            <Image source={{ uri: item.processed.uri }} style={styles.thumbnailImage} />

            {item.isPrincipal && (
              <View style={styles.principalBadge}>
                <Text style={styles.principalBadgeText}>CAPA</Text>
              </View>
            )}

            <View style={styles.actionsOverlay}>
              {!item.isPrincipal && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleSetPrincipal(item.id)}
                >
                  <Star size={16} color="#FFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.iconButton, styles.deleteButton]}
                onPress={() => handleRemove(item.id)}
              >
                <Trash2 size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  counter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
  },
  subtitle: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
    marginBottom: 10,
  },
  gallery: {
    flexDirection: 'row',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    borderStyle: 'dashed',
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B00',
    marginTop: 4,
  },
  badgeWebP: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00C853',
    marginTop: 2,
  },
  thumbnailCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative',
    backgroundColor: '#E9ECEF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  principalBorder: {
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  principalBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  principalBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
  },
  actionsOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderRadius: 20,
  },
  deleteButton: {
    backgroundColor: 'rgba(220,38,38,0.85)',
  },
});
