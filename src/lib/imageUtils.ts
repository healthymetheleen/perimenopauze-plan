/**
 * Converts an image (base64 or blob) to WebP format for efficient storage.
 * WebP typically provides 25-34% smaller file sizes than JPEG at equivalent quality.
 */
export async function convertToWebP(
  imageData: string | Blob,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Convert to WebP
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        
        // Clean up
        canvas.width = 0;
        canvas.height = 0;
        
        resolve(webpDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Handle both base64 strings and Blobs
    if (typeof imageData === 'string') {
      img.src = imageData;
    } else {
      img.src = URL.createObjectURL(imageData);
    }
  });
}

/**
 * Converts a base64 data URL to a Uint8Array for upload
 */
export function base64ToUint8Array(base64DataUrl: string): Uint8Array {
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Checks if the browser supports WebP encoding
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Resizes an image to a maximum dimension while maintaining aspect ratio
 */
export async function resizeImage(
  imageData: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        let { width, height } = img;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        
        // Clean up
        canvas.width = 0;
        canvas.height = 0;
        
        resolve(webpDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageData;
  });
}
