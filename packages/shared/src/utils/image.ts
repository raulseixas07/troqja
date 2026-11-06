export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageResizeConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 a 1.0
}

export const DEFAULT_WEBP_CONFIG: Required<ImageResizeConfig> = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.82,
};

/**
 * Calcula as novas dimensões de uma imagem mantendo a proporção de aspecto (aspect ratio).
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number = DEFAULT_WEBP_CONFIG.maxWidth,
  maxHeight: number = DEFAULT_WEBP_CONFIG.maxHeight
): ImageDimensions {
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: srcWidth, height: srcHeight };
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  };
}

/**
 * Gera um caminho estruturado e único para armazenar a imagem no Supabase Storage.
 * Exemplo: `users/123/anuncios/456/1715000000000-abc12345.webp`
 */
export function generateStoragePath(userId: string, anuncioId: string, extension: string = 'webp'): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${userId}/${anuncioId}/${timestamp}-${randomStr}.${extension}`;
}

/**
 * Valida se um arquivo de imagem é suportado para conversão.
 */
export function isValidImageMimeType(mimeType: string): boolean {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  return allowed.includes(mimeType.toLowerCase());
}
