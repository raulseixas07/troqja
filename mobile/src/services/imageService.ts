import * as ImageManipulator from 'expo-image-manipulator';
import {
  calculateAspectRatioFit,
  generateStoragePath,
  DEFAULT_WEBP_CONFIG,
  STORAGE_BUCKETS,
  type ImageResizeConfig,
} from '@olx-clone/shared';
import type { TypedSupabaseClient } from '@olx-clone/shared';

export interface MobileProcessedWebP {
  uri: string;
  width: number;
  height: number;
}

/**
 * Converte e redimensiona uma imagem selecionada no dispositivo para o formato WebP
 * utilizando a API nativa de aceleração gráfica do Expo Image Manipulator.
 */
export async function convertAndResizeMobileImageToWebP(
  sourceUri: string,
  originalWidth: number,
  originalHeight: number,
  config: ImageResizeConfig = {}
): Promise<MobileProcessedWebP> {
  const maxWidth = config.maxWidth ?? DEFAULT_WEBP_CONFIG.maxWidth;
  const maxHeight = config.maxHeight ?? DEFAULT_WEBP_CONFIG.maxHeight;
  const quality = config.quality ?? DEFAULT_WEBP_CONFIG.quality;

  const targetDimensions = calculateAspectRatioFit(
    originalWidth,
    originalHeight,
    maxWidth,
    maxHeight
  );

  const manipulationResult = await ImageManipulator.manipulateAsync(
    sourceUri,
    [
      {
        resize: {
          width: targetDimensions.width,
          height: targetDimensions.height,
        },
      },
    ],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.WEBP,
    }
  );

  return {
    uri: manipulationResult.uri,
    width: manipulationResult.width,
    height: manipulationResult.height,
  };
}

/**
 * Faz o upload de um arquivo WebP gerado pelo Expo para o Bucket do Supabase Storage.
 */
export async function uploadMobileWebPToSupabase(
  supabase: TypedSupabaseClient,
  imageUri: string,
  userId: string,
  anuncioId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const storagePath = generateStoragePath(userId, anuncioId, 'webp');

  // No Expo/React Native, converter a URI local em Blob é o padrão recomendado pelo Supabase
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.ANUNCIOS)
    .upload(storagePath, blob, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Falha no upload para o Supabase Storage: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKETS.ANUNCIOS)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: publicData.publicUrl,
  };
}

/**
 * Faz o upload de uma imagem do chat convertida em WebP para o Supabase Storage.
 */
export async function uploadMobileChatWebPToSupabase(
  supabase: TypedSupabaseClient,
  imageUri: string,
  conversaId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
  const storagePath = `chat/${conversaId}/${fileName}`;

  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.ANUNCIOS)
    .upload(storagePath, blob, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Falha no upload para o Supabase Storage: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKETS.ANUNCIOS)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: publicData.publicUrl,
  };
}
