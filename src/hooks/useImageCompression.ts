import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

export interface CompressionProgress {
  progress: number; // 0-100
  originalSize: number;
  compressedSize: number | null;
  status: 'idle' | 'compressing' | 'done' | 'error';
  error?: string;
}

export interface CompressionOptions {
  maxSizeMB?: number;        // Target size in MB (0.08 = 80kb)
  maxWidthOrHeight?: number; // Max dimension in pixels
  quality?: number;          // Initial quality (0-1)
  fileType?: string;         // Output format
}

// Preset configurations
export const COMPRESSION_PRESETS = {
  meal: {
    maxSizeMB: 0.08,         // 80kb max for meal photos
    maxWidthOrHeight: 1280,  // GDPR: reduced detail
    quality: 0.75,
    fileType: 'image/webp',
  },
  recipe: {
    maxSizeMB: 0.1,          // 100kb max for recipe images
    maxWidthOrHeight: 1200,
    quality: 0.75,
    fileType: 'image/webp',
  },
} as const;

export function useImageCompression() {
  const [progress, setProgress] = useState<CompressionProgress>({
    progress: 0,
    originalSize: 0,
    compressedSize: null,
    status: 'idle',
  });

  const compressImage = useCallback(async (
    file: File,
    options: CompressionOptions = COMPRESSION_PRESETS.meal
  ): Promise<{ file: File; base64: string } | null> => {
    const originalSize = file.size;
    
    setProgress({
      progress: 0,
      originalSize,
      compressedSize: null,
      status: 'compressing',
    });

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Alleen afbeeldingen zijn toegestaan');
      }

      // Check max file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Afbeelding te groot (max 10MB)');
      }

      const compressionOptions = {
        maxSizeMB: options.maxSizeMB ?? 0.08,
        maxWidthOrHeight: options.maxWidthOrHeight ?? 1280,
        useWebWorker: true,
        fileType: options.fileType ?? 'image/webp',
        initialQuality: options.quality ?? 0.75,
        onProgress: (p: number) => {
          setProgress(prev => ({
            ...prev,
            progress: Math.round(p),
          }));
        },
      };

      // First pass compression
      let compressedFile = await imageCompression(file, compressionOptions);
      
      // If still too large, try again with lower quality
      const targetSizeBytes = (options.maxSizeMB ?? 0.08) * 1024 * 1024;
      if (compressedFile.size > targetSizeBytes * 1.25) { // Allow 25% tolerance
        console.log(`First pass: ${compressedFile.size} bytes, retrying with lower quality`);
        compressedFile = await imageCompression(file, {
          ...compressionOptions,
          initialQuality: 0.6,
        });
      }

      // Convert to base64
      const base64 = await fileToBase64(compressedFile);
      
      const compressedSize = compressedFile.size;
      const reduction = Math.round((1 - compressedSize / originalSize) * 100);
      
      console.log(
        `Image compressed: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${reduction}% reduction)`
      );

      setProgress({
        progress: 100,
        originalSize,
        compressedSize,
        status: 'done',
      });

      return { file: compressedFile, base64 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Compressie mislukt';
      
      setProgress({
        progress: 0,
        originalSize,
        compressedSize: null,
        status: 'error',
        error: errorMessage,
      });
      
      console.error('Image compression error:', error);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress({
      progress: 0,
      originalSize: 0,
      compressedSize: null,
      status: 'idle',
    });
  }, []);

  return {
    compressImage,
    progress,
    reset,
  };
}

// Helper functions
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Utility to convert base64 to File for upload
export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
