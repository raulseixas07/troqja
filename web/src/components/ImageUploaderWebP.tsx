'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Star, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { convertImageToWebP, type ProcessedWebPImage } from '@/utils/imageWebP';

export interface ImageUploadItem {
  id: string;
  file?: File;
  processed: ProcessedWebPImage;
  isPrincipal: boolean;
  status: 'ready' | 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
}

interface ImageUploaderWebPProps {
  images: ImageUploadItem[];
  onChange: (images: ImageUploadItem[]) => void;
  maxImages?: number;
}

export function ImageUploaderWebP({
  images,
  onChange,
  maxImages = 6,
}: ImageUploaderWebPProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) return;

    const selectedFiles = Array.from(fileList).slice(0, remainingSlots);
    setIsProcessing(true);

    try {
      const newItems: ImageUploadItem[] = [];

      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) continue;

        try {
          const processed = await convertImageToWebP(file);
          const isFirstImage = images.length === 0 && newItems.length === 0;

          newItems.push({
            id: Math.random().toString(36).substring(2, 9),
            file,
            processed,
            isPrincipal: isFirstImage,
            status: 'ready',
          });
        } catch (err) {
          console.error('Erro ao converter imagem:', err);
        }
      }

      onChange([...images, ...newItems]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string) => {
    const remaining = images.filter((item) => item.id !== id);
    if (remaining.length > 0 && !remaining.some((item) => item.isPrincipal)) {
      remaining[0] = { ...remaining[0]!, isPrincipal: true };
    }
    onChange(remaining);
  };

  const handleSetPrincipal = (id: string) => {
    const updated = images.map((item) => ({
      ...item,
      isPrincipal: item.id === id,
    }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const current = copy[index]!;
    const target = copy[targetIndex]!;

    copy[index] = target;
    copy[targetIndex] = current;

    // Atualiza flag de principal para a primeira foto da fila se necessário
    const reordered = copy.map((item, idx) => ({
      ...item,
      isPrincipal: idx === 0,
    }));

    onChange(reordered);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Fotos do Anúncio</h3>
          <p className="text-xs text-gray-500">
            Imagens convertidas no seu dispositivo para <strong>WebP</strong> (até {maxImages} fotos). A primeira foto será a capa.
          </p>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          {images.length} / {maxImages}
        </span>
      </div>

      {/* Área de Dropzone */}
      {images.length < maxImages && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-olx-orange bg-orange-50'
              : 'border-gray-300 hover:border-olx-orange bg-gray-50/50 hover:bg-orange-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            {isProcessing ? (
              <>
                <Loader2 className="w-8 h-8 text-olx-orange animate-spin" />
                <p className="text-sm font-medium text-gray-700">Convertendo e otimizando imagens em WebP...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-olx-orange">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    <span className="text-olx-orange underline font-semibold">Clique para escolher</span> ou arraste as fotos aqui
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, HEIC ou WebP (compressão inteligente sem perda perceptível)</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid de Fotos Carregadas */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((item, idx) => (
            <div
              key={item.id}
              className={`group relative rounded-xl overflow-hidden border bg-white shadow-xs flex flex-col ${
                item.isPrincipal ? 'ring-2 ring-olx-orange border-olx-orange' : 'border-gray-200'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
                <img
                  src={item.processed.previewUrl}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Badge Foto Principal */}
                {item.isPrincipal ? (
                  <span className="absolute top-2 left-2 bg-olx-orange text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                    FOTO PRINCIPAL
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                )}

                {/* Ações Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <div className="flex items-center gap-1.5">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'left')}
                        className="p-1.5 bg-white text-gray-800 rounded-full hover:bg-olx-purple hover:text-white transition shadow text-xs"
                        title="Mover para esquerda"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'right')}
                        className="p-1.5 bg-white text-gray-800 rounded-full hover:bg-olx-purple hover:text-white transition shadow text-xs"
                        title="Mover para direita"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!item.isPrincipal && (
                      <button
                        type="button"
                        onClick={() => handleSetPrincipal(item.id)}
                        className="p-1.5 bg-white text-gray-700 rounded-full hover:bg-olx-orange hover:text-white transition shadow"
                        title="Tornar foto de capa"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 bg-white text-red-600 rounded-full hover:bg-red-600 hover:text-white transition shadow"
                      title="Excluir foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {!item.isPrincipal && (
                    <button
                      type="button"
                      onClick={() => handleSetPrincipal(item.id)}
                      className="text-[10px] font-bold text-white bg-olx-orange/90 hover:bg-olx-orange px-2 py-0.5 rounded transition"
                    >
                      Definir como capa
                    </button>
                  )}
                </div>
              </div>

              {/* Informações da Otimização WebP */}
              <div className="p-2.5 text-[11px] bg-white border-t border-gray-100 space-y-1">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-gray-500">Formato:</span>
                  <span className="text-green-600 font-bold uppercase">WEBP</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>{formatFileSize(item.processed.originalSize)}</span>
                  <span>➔</span>
                  <span className="text-gray-900 font-semibold">{formatFileSize(item.processed.convertedSize)}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5 text-green-700 font-bold">
                  <span>Economia de banda:</span>
                  <span>-{item.processed.reductionPercentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
