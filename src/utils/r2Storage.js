// Giao tiếp với kho ảnh Cloudflare R2 THÔNG QUA backend (/api/*).
//
// File này KHÔNG chứa khoá truy cập R2. Mọi thao tác ghi/xoá đều do server
// thực hiện sau khi kiểm tra phiên đăng nhập CMS, nên dù ai xem mã nguồn
// trang web cũng không lấy được quyền vào kho ảnh.

export const R2_CONFIG = {
  bucketName: 'portfolio-assets',
  publicUrl: 'https://pub-92c2aa5ead2a411ebfe8b083d3ce67d1.r2.dev',
};

const TOKEN_KEY = 'phihung_cms_token';

// ---------------------------------------------------------------------------
// Vé đăng nhập CMS
// ---------------------------------------------------------------------------

export function setCmsToken(token, persist = true) {
  try {
    clearCmsToken();
    if (!token) return;
    (persist ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // Trình duyệt chặn lưu trữ — bỏ qua, người dùng sẽ phải đăng nhập lại
  }
}

export function getCmsToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function clearCmsToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // bỏ qua
  }
}

function authHeaders(extra = {}) {
  const token = getCmsToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function postJson(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await readJson(res);
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Yêu cầu thất bại (${res.status})`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

async function toBlob(fileData, contentType) {
  if (fileData instanceof Blob) return fileData;

  if (typeof fileData === 'string') {
    if (fileData.startsWith('data:')) {
      return await (await fetch(fileData)).blob();
    }
    return new Blob([fileData], { type: contentType });
  }

  return new Blob([fileData], { type: contentType });
}

/**
 * Tải một File, Blob, chuỗi hoặc data URL lên kho R2 qua backend.
 * @param {Blob|File|string} fileData - Nội dung cần tải lên
 * @param {string} key - Đường dẫn đích (vd: 'projects/du-an-a/cover.webp')
 * @param {string} contentType - Kiểu file (vd: 'image/webp')
 * @returns {Promise<{success: boolean, url: string, key: string}>}
 */
export async function uploadToR2(fileData, key, contentType = 'image/webp') {
  const blob = await toBlob(fileData, contentType);

  const form = new FormData();
  form.append('file', blob, key.split('/').pop() || 'upload.webp');
  form.append('key', key);
  form.append('contentType', contentType);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  const data = await readJson(res);
  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.error || `Tải lên thất bại (${res.status})`);
  }

  return { success: true, url: data.url, key: data.key };
}

// ---------------------------------------------------------------------------
// Xoá
// ---------------------------------------------------------------------------

// Ảnh base64 hoặc ảnh từ nguồn ngoài thì không có gì để xoá trên R2.
function isOurStoredFile(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('data:') || value.startsWith('blob:')) return false;
  return (
    value.includes(R2_CONFIG.publicUrl) ||
    value.includes('.r2.dev') ||
    value.includes('portfolio-assets')
  );
}

/**
 * Xoá một ảnh khỏi R2. Nhận vào key hoặc URL công khai.
 */
export async function deleteFromR2(keyOrUrl) {
  if (!isOurStoredFile(keyOrUrl)) return { success: true };

  try {
    await postJson('/api/delete', { key: keyOrUrl });
    return { success: true };
  } catch (err) {
    console.warn('R2 delete error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Xoá nhiều ảnh cùng lúc trong một lần gọi.
 */
export async function deleteMultipleFromR2(urls) {
  if (!Array.isArray(urls)) return { success: true, deleted: 0 };

  const keys = urls.filter(isOurStoredFile);
  if (keys.length === 0) return { success: true, deleted: 0 };

  try {
    const data = await postJson('/api/delete', { keys });
    return { success: true, deleted: data.deleted || 0 };
  } catch (err) {
    console.warn('R2 bulk delete error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Xoá nguyên một thư mục dự án và toàn bộ nội dung bên trong.
 * @param {string} folderPrefix - vd: 'projects/du-an-bao-bi'
 */
export async function deleteFolderFromR2(folderPrefix) {
  if (!folderPrefix || typeof folderPrefix !== 'string') {
    return { success: false, error: 'Thiếu đường dẫn thư mục' };
  }

  try {
    const data = await postJson('/api/delete-folder', { prefix: folderPrefix });
    return { success: true, count: data.count || 0 };
  } catch (err) {
    console.warn('R2 delete folder error:', err);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Dữ liệu portfolio
// ---------------------------------------------------------------------------

/**
 * Lưu toàn bộ nội dung portfolio lên R2 (chỉ CMS đã đăng nhập).
 */
export async function savePortfolioDataToR2(portfolioData) {
  try {
    await postJson('/api/data', portfolioData);
    return { success: true };
  } catch (err) {
    console.error('Failed to save portfolio data to R2:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Đọc nội dung portfolio từ kho công khai. Không cần đăng nhập —
 * đây chính là nội dung mà mọi khách truy cập đều nhìn thấy.
 */
export async function fetchPortfolioDataFromR2() {
  try {
    const url = `${R2_CONFIG.publicUrl}/data/portfolio.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    console.log('Không đọc được portfolio.json online, dùng dữ liệu lưu trong máy.');
    return null;
  }
}
