import {
  calculateAspectRatioFit,
  generateStoragePath,
  DEFAULT_WEBP_CONFIG,
  STORAGE_BUCKETS,
  type ImageResizeConfig,
} from '@olx-clone/shared';
import type { TypedSupabaseClient } from '@olx-clone/shared';

export interface ProcessedWebPImage {
  blob: Blob;
  previewUrl: string;
  originalFileName: string;
  originalSize: number;
  convertedSize: number;
  width: number;
  height: number;
  reductionPercentage: number;
}

/**
 * Converte e redimensiona um arquivo de imagem no navegador para o formato WebP via Canvas API.
 */
export async function convertImageToWebP(
  file: File,
  config: ImageResizeConfig = {}
): Promise<ProcessedWebPImage> {
  const maxWidth = config.maxWidth ?? DEFAULT_WEBP_CONFIG.maxWidth;
  const maxHeight = config.maxHeight ?? DEFAULT_WEBP_CONFIG.maxHeight;
  const quality = config.quality ?? DEFAULT_WEBP_CONFIG.quality;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao decodificar a imagem'));
      img.onload = () => {
        const { width: targetWidth, height: targetHeight } = calculateAspectRatioFit(
          img.naturalWidth,
          img.naturalHeight,
          maxWidth,
          maxHeight
        );

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto 2D do Canvas'));
          return;
        }

        // Suavização para melhor qualidade de interpolação
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao exportar a imagem para o formato WebP'));
              return;
            }

            const originalSize = file.size;
            const convertedSize = blob.size;
            const reduction = Math.max(0, Math.round(((originalSize - convertedSize) / originalSize) * 100));

            resolve({
              blob,
              previewUrl: URL.createObjectURL(blob),
              originalFileName: file.name,
              originalSize,
              convertedSize,
              width: targetWidth,
              height: targetHeight,
              reductionPercentage: reduction,
            });
          },
          'image/webp',
          quality
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Faz o upload direto de uma imagem WebP processada para o Bucket do Supabase Storage.
 */
export async function uploadWebPToSupabase(
  supabase: TypedSupabaseClient,
  image: ProcessedWebPImage,
  userId: string,
  anuncioId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const storagePath = generateStoragePath(userId, anuncioId, 'webp');

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.ANUNCIOS)
    .upload(storagePath, image.blob, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erro ao enviar imagem para o Supabase Storage: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKETS.ANUNCIOS)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: publicData.publicUrl,
  };
}
