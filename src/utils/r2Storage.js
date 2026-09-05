// Cloudflare R2 Direct Integration & Storage Utility

export const R2_CONFIG = {
  accountId: 'a0650e4cdd588f8cab25b3a13a282dc4',
  accessKeyId: '99b974108a9bb71a92d0cbce95e9f88e',
  secretAccessKey: '9be2dfef5f4db1815f37fa182b11b62c2a096be5bcd87aed2ff716c9248ff14d',
  bucketName: 'portfolio-assets',
  publicUrl: 'https://pub-92c2aa5ead2a411ebfe8b083d3ce67d1.r2.dev',
};

// Web Crypto Helper Functions for AWS SigV4
async function sha256Hex(data) {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
}

async function hmacSha256Hex(key, data) {
  const signature = await hmacSha256(key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

/**
 * Upload a File, Blob, or String directly to Cloudflare R2
 * @param {Blob|File|string} fileData - The raw content to upload
 * @param {string} key - The destination key (e.g., 'projects/cover-123.webp')
 * @param {string} contentType - MIME type (e.g. 'image/webp', 'application/json')
 * @returns {Promise<{success: boolean, url: string, key: string}>}
 */
export async function uploadToR2(fileData, key, contentType = 'image/webp') {
  try {
    const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${R2_CONFIG.bucketName}/${key.startsWith('/') ? key.slice(1) : key}`;
    const endpoint = `https://${host}${canonicalUri}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const region = 'auto';
    const service = 's3';

    // Convert fileData to ArrayBuffer
    let bodyBuffer;
    if (typeof fileData === 'string') {
      if (fileData.startsWith('data:')) {
        const res = await fetch(fileData);
        bodyBuffer = await res.arrayBuffer();
      } else {
        bodyBuffer = new TextEncoder().encode(fileData);
      }
    } else if (fileData instanceof Blob || fileData instanceof File) {
      bodyBuffer = await fileData.arrayBuffer();
    } else {
      bodyBuffer = fileData;
    }

    const payloadHash = await sha256Hex(bodyBuffer);

    // Canonical Request
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'PUT',
      encodeURI(canonicalUri),
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to Sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Calculate Signature
    const signingKey = await getSignatureKey(R2_CONFIG.secretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256Hex(signingKey, stringToSign);

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Execute direct PUT request
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
        'Content-Type': contentType,
      },
      body: bodyBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('R2 direct upload status:', response.status, errorText);
      throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
    }

    const publicFileUrl = `${R2_CONFIG.publicUrl}/${key.startsWith('/') ? key.slice(1) : key}`;
    return {
      success: true,
      url: publicFileUrl,
      key,
    };
  } catch (error) {
    console.error('R2 Upload error:', error);
    throw error;
  }
}

/**
 * Delete an object directly from Cloudflare R2
 * @param {string} keyOrUrl - Key or full public URL
 */
export async function deleteFromR2(keyOrUrl) {
  if (!keyOrUrl || typeof keyOrUrl !== 'string') return { success: false };

  // If base64 or external non-R2 image, skip
  if (keyOrUrl.startsWith('data:') || keyOrUrl.startsWith('blob:')) return { success: true };
  if (!keyOrUrl.includes(R2_CONFIG.publicUrl) && !keyOrUrl.includes('.r2.dev') && !keyOrUrl.includes('portfolio-assets')) {
    return { success: true };
  }

  try {
    let key = keyOrUrl;
    if (key.includes(R2_CONFIG.publicUrl)) {
      key = key.replace(R2_CONFIG.publicUrl, '').replace(/^\/+/, '');
    } else if (key.includes('.r2.dev/')) {
      key = key.split('.r2.dev/')[1];
    } else if (key.includes('/portfolio-assets/')) {
      key = key.split('/portfolio-assets/')[1];
    }

    if (!key) return { success: false };

    const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${R2_CONFIG.bucketName}/${key.startsWith('/') ? key.slice(1) : key}`;
    const endpoint = `https://${host}${canonicalUri}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const region = 'auto';
    const service = 's3';

    const payloadHash = await sha256Hex('');

    // Canonical Request for DELETE
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'DELETE',
      encodeURI(canonicalUri),
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to Sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Calculate Signature
    const signingKey = await getSignatureKey(R2_CONFIG.secretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256Hex(signingKey, stringToSign);

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
      },
    });

    if (response.ok || response.status === 204) {
      console.log(`Deleted ${key} from Cloudflare R2 ✓`);
      return { success: true };
    }
    return { success: false };
  } catch (err) {
    console.warn('R2 delete error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * List all object keys under a prefix in Cloudflare R2 bucket
 * @param {string} prefix - e.g. 'projects/du-an-a'
 * @returns {Promise<string[]>} - array of keys
 */
export async function listObjectsInR2(prefix = '') {
  try {
    const cleanPrefix = prefix.replace(/^\/+/, '').replace(/\/+$/, '');
    const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${R2_CONFIG.bucketName}`;
    const queryParams = `list-type=2&prefix=${encodeURIComponent(cleanPrefix)}`;
    const endpoint = `https://${host}${canonicalUri}?${queryParams}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const region = 'auto';
    const service = 's3';

    const payloadHash = await sha256Hex('');

    // Canonical Request for GET ListObjectsV2
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'GET',
      encodeURI(canonicalUri),
      queryParams,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to Sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Signature
    const signingKey = await getSignatureKey(R2_CONFIG.secretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256Hex(signingKey, stringToSign);
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
      },
    });

    if (!response.ok) {
      return [];
    }

    const xmlText = await response.text();
    // Parse keys from XML response
    const keyMatches = [...xmlText.matchAll(/<Key>(.*?)<\/Key>/g)];
    const keys = keyMatches.map(m => m[1]);
    return keys;
  } catch (err) {
    console.warn('R2 ListObjects error:', err);
    return [];
  }
}

/**
 * Delete an entire folder and all its contents from R2
 * @param {string} folderPrefix - e.g. 'projects/du-an-bao-bi'
 */
export async function deleteFolderFromR2(folderPrefix) {
  if (!folderPrefix || typeof folderPrefix !== 'string') return { success: false };
  try {
    const cleanPrefix = folderPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!cleanPrefix || cleanPrefix === 'projects' || cleanPrefix === 'cover_banners' || cleanPrefix === 'random_works' || cleanPrefix === 'profile' || cleanPrefix === 'data') {
      // Safety guard against deleting root categories
      return { success: false, error: 'Cannot delete root folder' };
    }

    // Find all files inside the folder in R2
    const keys = await listObjectsInR2(cleanPrefix);
    if (keys.length > 0) {
      await deleteMultipleFromR2(keys);
    }
    console.log(`Deleted folder ${cleanPrefix} (${keys.length} items) from R2 ✓`);
    return { success: true, count: keys.length };
  } catch (err) {
    console.warn('Error deleting folder from R2:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete multiple images from R2 in parallel
 */
export async function deleteMultipleFromR2(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  await Promise.allSettled(urls.map(url => deleteFromR2(url)));
}

/**
 * Save complete portfolio JSON data to R2
 */
export async function savePortfolioDataToR2(portfolioData) {
  try {
    const jsonStr = JSON.stringify(portfolioData, null, 2);
    return await uploadToR2(jsonStr, 'data/portfolio.json', 'application/json');
  } catch (err) {
    console.error('Failed to save portfolio data to R2:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch live portfolio JSON data from R2 public bucket
 */
export async function fetchPortfolioDataFromR2() {
  try {
    const url = `${R2_CONFIG.publicUrl}/data/portfolio.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log('No online R2 portfolio.json found or network error, falling back to local storage.');
    return null;
  }
}
