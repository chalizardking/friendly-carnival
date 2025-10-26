// Manga-specific image processing utilities

export interface MangaOptions {
  enabled: boolean;
  readingDirection: 'right-to-left' | 'left-to-right';
  textContrastEnhancement: boolean;
  speechBubbleDetection: boolean;
  panelBoundaryDetection: boolean;
  fontOptimization: boolean;
  imagePreprocessing: 'auto' | 'manga' | 'standard';
}

/**
 * Apply manga-specific image preprocessing
 * @param canvas Canvas element containing the image
 * @param options Manga processing options
 * @returns Processed canvas
 */
export function applyMangaPreprocessing(canvas: HTMLCanvasElement, options: MangaOptions): HTMLCanvasElement {
  if (!options.enabled || options.imagePreprocessing === 'standard') {
    return canvas;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let processedData = imageData;

  // Apply contrast enhancement for manga
  if (options.textContrastEnhancement) {
    processedData = enhanceTextContrast(processedData, options.imagePreprocessing === 'manga');
  }

  // Apply speech bubble detection preprocessing
  if (options.speechBubbleDetection) {
    processedData = preprocessForSpeechBubbles(processedData);
  }

  // Apply font optimization preprocessing
  if (options.fontOptimization) {
    processedData = optimizeForMangaFonts(processedData);
  }

  ctx.putImageData(processedData, 0, 0);
  return canvas;
}

/**
 * Enhance text contrast specifically for manga images
 */
function enhanceTextContrast(imageData: ImageData, isMangaMode: boolean): ImageData {
  const data = imageData.data;
  const contrast = isMangaMode ? 1.5 : 1.2; // Higher contrast for manga mode
  const brightness = isMangaMode ? 10 : 5;

  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale first for better text detection
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Apply contrast and brightness
    let adjusted = ((gray - 128) * contrast + 128) + brightness;
    adjusted = Math.max(0, Math.min(255, adjusted));
    
    // For manga, enhance black text on white background
    if (isMangaMode) {
      if (adjusted < 128) {
        // Darken dark areas (text)
        adjusted = adjusted * 0.7;
      } else {
        // Brighten light areas (background)
        adjusted = Math.min(255, adjusted * 1.2);
      }
    }
    
    data[i] = adjusted;     // Red
    data[i + 1] = adjusted; // Green  
    data[i + 2] = adjusted; // Blue
    // Alpha stays the same
  }

  return imageData;
}

/**
 * Preprocess image to optimize speech bubble detection
 */
function preprocessForSpeechBubbles(imageData: ImageData): ImageData {
  const data = imageData.data;
  
  // Apply edge detection to help identify bubble boundaries
  const edges = detectEdges(imageData);
  
  // Combine original with edge-enhanced version
  for (let i = 0; i < data.length; i += 4) {
    const edgeStrength = edges.data[i] / 255;
    
    // Enhance areas with strong edges (likely bubble boundaries)
    if (edgeStrength > 0.3) {
      data[i] = Math.min(255, data[i] * 1.1);
      data[i + 1] = Math.min(255, data[i + 1] * 1.1);
      data[i + 2] = Math.min(255, data[i + 2] * 1.1);
    }
  }
  
  return imageData;
}

/**
 * Optimize image for manga font recognition
 */
function optimizeForMangaFonts(imageData: ImageData): ImageData {
  const data = imageData.data;
  
  // Apply morphological operations to clean up text
  const cleaned = morphologicalClosing(imageData, 1);
  
  // Enhance typical manga text characteristics
  for (let i = 0; i < cleaned.data.length; i += 4) {
    const intensity = (cleaned.data[i] + cleaned.data[i + 1] + cleaned.data[i + 2]) / 3;
    
    // Sharpen text by increasing local contrast
    if (intensity < 100) {
      // Darken dark pixels (text)
      const factor = 0.8;
      data[i] = Math.max(0, cleaned.data[i] * factor);
      data[i + 1] = Math.max(0, cleaned.data[i + 1] * factor);
      data[i + 2] = Math.max(0, cleaned.data[i + 2] * factor);
    } else if (intensity > 180) {
      // Brighten bright pixels (background)
      const factor = 1.1;
      data[i] = Math.min(255, cleaned.data[i] * factor);
      data[i + 1] = Math.min(255, cleaned.data[i + 1] * factor);
      data[i + 2] = Math.min(255, cleaned.data[i + 2] * factor);
    }
  }
  
  return imageData;
}

/**
 * Simple edge detection using Sobel operator
 */
function detectEdges(imageData: ImageData): ImageData {
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const width = imageData.width;
  const height = imageData.height;
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = (src[idx] + src[idx + 1] + src[idx + 2]) / 3;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          
          gx += gray * sobelX[kernelIdx];
          gy += gray * sobelY[kernelIdx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const dstIdx = (y * width + x) * 4;
      
      dst[dstIdx] = magnitude;
      dst[dstIdx + 1] = magnitude;
      dst[dstIdx + 2] = magnitude;
      dst[dstIdx + 3] = 255;
    }
  }
  
  return new ImageData(dst, width, height);
}

/**
 * Apply morphological closing operation to clean up text
 */
function morphologicalClosing(imageData: ImageData, radius: number): ImageData {
  // Simple implementation of morphological closing
  // First dilate, then erode
  let processed = dilate(imageData, radius);
  processed = erode(processed, radius);
  return processed;
}

/**
 * Morphological dilation
 */
function dilate(imageData: ImageData, radius: number): ImageData {
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const width = imageData.width;
  const height = imageData.height;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const idx = (ny * width + nx) * 4;
          const gray = (src[idx] + src[idx + 1] + src[idx + 2]) / 3;
          maxVal = Math.max(maxVal, gray);
        }
      }
      
      const dstIdx = (y * width + x) * 4;
      dst[dstIdx] = maxVal;
      dst[dstIdx + 1] = maxVal;
      dst[dstIdx + 2] = maxVal;
      dst[dstIdx + 3] = 255;
    }
  }
  
  return new ImageData(dst, width, height);
}

/**
 * Morphological erosion
 */
function erode(imageData: ImageData, radius: number): ImageData {
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const width = imageData.width;
  const height = imageData.height;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const idx = (ny * width + nx) * 4;
          const gray = (src[idx] + src[idx + 1] + src[idx + 2]) / 3;
          minVal = Math.min(minVal, gray);
        }
      }
      
      const dstIdx = (y * width + x) * 4;
      dst[dstIdx] = minVal;
      dst[dstIdx + 1] = minVal;
      dst[dstIdx + 2] = minVal;
      dst[dstIdx + 3] = 255;
    }
  }
  
  return new ImageData(dst, width, height);
}

/**
 * Get manga options from chrome storage
 */
export async function getMangaOptions(): Promise<MangaOptions> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['mangaOptions'], (result) => {
      const defaultOptions: MangaOptions = {
        enabled: false,
        readingDirection: 'right-to-left',
        textContrastEnhancement: true,
        speechBubbleDetection: true,
        panelBoundaryDetection: true,
        fontOptimization: true,
        imagePreprocessing: 'auto'
      };
      
      resolve(result.mangaOptions ? { ...defaultOptions, ...result.mangaOptions } : defaultOptions);
    });
  });
}
