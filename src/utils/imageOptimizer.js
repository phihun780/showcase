import { uploadToR2 } from './r2Storage';

/**
 * Client-Side High-Fidelity Image Optimizer
 * - Preserves animated GIFs
 * - Converts large PNG/JPG to crisp WebP/JPEG with max dimension 2560px and 0.90 quality
 * - Reduces file size by 70-85% while keeping graphic design sharpness
 */
export async function optimizeImageFile(file) {
  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif') || file.type === 'image/svg+xml';
  
  if (isGif) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        dataUrl: reader.result,
        blob: file,
        format: file.type || 'image/gif',
        isGif: true,
        originalSize: file.size,
        optimizedSize: file.size,
        fileName: file.name,
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Optimize PNG/JPEG/WEBP
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const MAX_WIDTH = 2560;
        const MAX_HEIGHT = 2560;
        let width = img.width;
        let height = img.height;

        // Resize proportionally if image is larger than 2560px
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-quality WebP (or JPEG fallback)
        let mimeType = 'image/webp';
        let quality = 0.90;

        let optimizedDataUrl = canvas.toDataURL(mimeType, quality);
        
        if (!optimizedDataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          optimizedDataUrl = canvas.toDataURL(mimeType, quality);
        }

        canvas.toBlob((blob) => {
          resolve({
            dataUrl: optimizedDataUrl,
            blob: blob || file,
            format: mimeType,
            isGif: false,
            width,
            height,
            originalSize: file.size,
            optimizedSize: blob ? blob.size : file.size,
            fileName: file.name,
          });
        }, mimeType, quality);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Optimize image and upload directly to Cloudflare R2
 * @param {File} file 
 * @param {string} folderPrefix ('projects' | 'random' | 'avatar')
 * @returns {Promise<{url: string, isR2: boolean, isGif: boolean}>}
 */
export async function optimizeAndUploadToR2(file, folderPrefix = 'uploads') {
  const optimized = await optimizeImageFile(file);
  const ext = optimized.isGif ? 'gif' : 'webp';
  const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase() : `img.${ext}`;
  const key = `${folderPrefix}/${Date.now()}_${cleanName}`;

  try {
    // Attempt direct upload to Cloudflare R2
    const uploadRes = await uploadToR2(optimized.blob || optimized.dataUrl, key, optimized.format);
    return {
      url: uploadRes.url,
      isR2: true,
      isGif: optimized.isGif,
      format: optimized.format,
    };
  } catch (err) {
    console.warn('R2 direct upload failed, using local base64 fallback:', err);
    // Graceful fallback to dataUrl
    return {
      url: optimized.dataUrl,
      isR2: false,
      isGif: optimized.isGif,
      format: optimized.format,
    };
  }
}
