import { uploadToR2 } from './r2Storage';
import { RESPONSIVE_WIDTHS, withResponsiveMarker, variantUrl } from './responsiveImage';

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
        let width = img.naturalWidth || img.width || 1200;
        let height = img.naturalHeight || img.height || 800;

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

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to high-quality WebP (or JPEG fallback)
        let mimeType = 'image/webp';
        let quality = 0.90;

        let optimizedDataUrl;
        try {
          optimizedDataUrl = canvas.toDataURL(mimeType, quality);
          if (!optimizedDataUrl || !optimizedDataUrl.startsWith('data:image/webp')) {
            mimeType = 'image/jpeg';
            optimizedDataUrl = canvas.toDataURL(mimeType, quality);
          }
        } catch (e) {
          mimeType = 'image/jpeg';
          optimizedDataUrl = canvas.toDataURL(mimeType, quality);
        }

        canvas.toBlob((blob) => {
          resolve({
            dataUrl: optimizedDataUrl || event.target.result,
            blob: blob || file,
            format: mimeType,
            isGif: false,
            width: canvas.width,
            height: canvas.height,
            originalSize: file.size,
            optimizedSize: blob ? blob.size : file.size,
            fileName: file.name,
          });
        }, mimeType, quality);
      };
      img.onerror = () => {
        // Fallback directly to original file if image decoding fails
        resolve({
          dataUrl: event.target.result,
          blob: file,
          format: file.type || 'image/jpeg',
          isGif: false,
          originalSize: file.size,
          optimizedSize: file.size,
          fileName: file.name,
        });
      };
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Vietnamese / special text to clean URL-safe and folder-safe slug
 * e.g. "Dự án Thiết Kế Bao Bì #01" -> "du-an-thiet-ke-bao-bi-01"
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese accent marks
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate organized R2 folder path for a specific project
 * e.g. "projects/du-an-thiet-ke-bao-bi" or "projects/project_174123456"
 */
export function getProjectFolderPath(projectOrTitle, id = null) {
  let title = '';
  let projId = id;
  if (typeof projectOrTitle === 'object' && projectOrTitle !== null) {
    title = projectOrTitle.title || '';
    projId = projectOrTitle.id || id;
  } else if (typeof projectOrTitle === 'string') {
    title = projectOrTitle;
  }

  const slug = slugify(title);
  if (slug) {
    return `projects/${slug}`;
  }
  if (projId) {
    return `projects/project_${projId}`;
  }
  return `projects/project_${Date.now()}`;
}

/**
 * Optimize image and upload directly to Cloudflare R2
 * @param {File} file 
 * @param {string} folderPrefix ('projects/du-an-1' | 'cover_banners' | 'random_works' | 'profile')
 * @returns {Promise<{url: string, isR2: boolean, isGif: boolean}>}
 */
export async function optimizeAndUploadToR2(file, folderPrefix = 'uploads') {
  const optimized = await optimizeImageFile(file);
  const ext = optimized.isGif ? 'gif' : 'webp';

  // Ép đúng đuôi theo định dạng THẬT sau khi nén. Trước đây tên file giữ nguyên
  // đuôi gốc (vd ".png") dù nội dung đã là WebP, gây nhầm lẫn khi xem kho R2.
  const rawName = file.name
    ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase().replace(/\.[^.]+$/, '')
    : 'img';

  return uploadWithVariants({
    blob: optimized.blob,
    dataUrl: optimized.dataUrl,
    width: optimized.width || 0,
    mimeType: optimized.format,
    folderPrefix,
    baseName: rawName,
    ext,
    skipVariants: optimized.isGif,
    isGif: optimized.isGif,
  });
}

/**
 * Tải một ảnh lên R2 kèm các bản thu nhỏ.
 *
 * Dùng chung cho cả luồng tải ảnh thường lẫn luồng cắt ảnh trong CMS — nhờ vậy
 * mọi ảnh vào kho đều có srcset, không phụ thuộc người dùng bấm đường nào.
 *
 * An toàn: dựng và tải TẤT CẢ bản thu nhỏ trước; chỉ khi mọi bản đều xong thì
 * ảnh gốc mới mang tên có đánh dấu. Hỏng bất kỳ bước nào -> ảnh gốc giữ tên
 * thường, trang web chạy như cũ, không bao giờ có srcset trỏ vào file rỗng.
 */
export async function uploadWithVariants({
  blob,
  dataUrl,
  width,
  mimeType = 'image/webp',
  folderPrefix = 'uploads',
  baseName = 'img',
  ext = 'webp',
  skipVariants = false,
  isGif = false,
}) {
  const stamp = Date.now();
  const variantWidths = skipVariants || !width
    ? []
    : RESPONSIVE_WIDTHS.filter(w => w <= width * 0.9);

  let ladder = [];
  let variants = [];
  if (variantWidths.length > 0) {
    try {
      variants = await Promise.all(
        variantWidths.map(async (w) => ({
          width: w,
          blob: await resizeToWidth(dataUrl, w, mimeType),
        }))
      );
      ladder = [...variantWidths, width];
    } catch (err) {
      console.warn('Không dựng được bản thu nhỏ, dùng một mình ảnh gốc:', err);
      ladder = [];
      variants = [];
    }
  }

  const fileName = ladder.length > 0
    ? withResponsiveMarker(`${baseName}.${ext}`, ladder)
    : `${baseName}.${ext}`;
  const key = `${folderPrefix}/${stamp}_${fileName}`;

  try {
    if (variants.length > 0) {
      await Promise.all(
        variants.map(v => uploadToR2(v.blob, variantUrl(key, v.width), mimeType))
      );
    }

    const uploadRes = await uploadToR2(blob || dataUrl, key, mimeType);
    return { url: uploadRes.url, isR2: true, isGif, format: mimeType, widths: ladder };
  } catch (err) {
    console.warn('R2 direct upload failed, using local base64 fallback:', err);
    return { url: dataUrl, isR2: false, isGif, format: mimeType, widths: [] };
  }
}

/**
 * Vẽ lại ảnh ở một bề ngang nhỏ hơn. Dùng chất lượng 0.86 — bản thu nhỏ được
 * xem ở kích thước nhỏ nên không cần 0.90 như ảnh gốc.
 */
function resizeToWidth(sourceDataUrl, targetWidth, mimeType = 'image/webp') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = targetWidth / img.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('toBlob trả về null'))),
        mimeType === 'image/gif' ? 'image/webp' : mimeType,
        0.86
      );
    };
    img.onerror = () => reject(new Error('Không giải mã được ảnh để thu nhỏ'));
    img.src = sourceDataUrl;
  });
}
