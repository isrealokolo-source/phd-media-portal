import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface SaveFileOptions {
  buffer: Buffer;
  filename: string;
  subfolder: 'masters' | 'artwork' | 'documents' | 'signatures' | 'pdfs' | string;
  mimeType?: string;
}

interface SaveFileResult {
  fileUrl: string;
  storageType: 'LOCAL_DISK' | 'OBJECT_STORAGE';
  storageKey: string;
}

/**
 * Normalizes any stored file URL (including legacy relative or domain-prefixed URLs)
 * to a clean internal streaming route `/api/files/uploads/...`.
 */
export function normalizeFileUrl(url?: string | null): string | null {
  if (!url) return null;
  const cleaned = url.replace(/[\r\n]+/g, '').trim();
  if (!cleaned) return null;

  if (cleaned.startsWith('/api/files/')) {
    return cleaned;
  }

  const uploadsIdx = cleaned.indexOf('uploads/');
  if (uploadsIdx !== -1) {
    const key = cleaned.slice(uploadsIdx);
    return `/api/files/${key}`;
  }

  return cleaned;
}

// Optional S3 / Cloudflare R2 client initialization
function getS3Client(): { client: S3Client; bucket: string } | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const region = (process.env.S3_REGION || 'auto').trim();
  const endpoint = process.env.S3_ENDPOINT?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    client,
    bucket,
  };
}

/**
 * Persists an uploaded file or generated PDF to Cloud Object Storage (S3 / Cloudflare R2)
 * and/or local persistent disk under /public/uploads/, always returning a reliable
 * `/api/files/uploads/...` URL served by the authenticated streaming handler.
 */
export async function saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
  const { buffer, filename, subfolder, mimeType } = options;

  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const safeName = `${Date.now()}_${sanitized}`;
  const storageKey = `uploads/${subfolder}/${safeName}`;
  const canonicalUrl = `/api/files/${storageKey}`;

  // Always attempt to cache on local disk when writable
  let savedLocally = false;
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);
    savedLocally = true;
  } catch (localErr) {
    console.warn('Local disk cache write skipped:', localErr);
  }

  const s3 = getS3Client();

  if (s3) {
    try {
      await s3.client.send(
        new PutObjectCommand({
          Bucket: s3.bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: mimeType || 'application/octet-stream',
        })
      );

      return {
        fileUrl: canonicalUrl,
        storageType: 'OBJECT_STORAGE',
        storageKey,
      };
    } catch (s3Err) {
      console.error('S3/R2 upload error, falling back to local disk:', s3Err);
      if (savedLocally) {
        return {
          fileUrl: canonicalUrl,
          storageType: 'LOCAL_DISK',
          storageKey,
        };
      }
      throw s3Err;
    }
  }

  return {
    fileUrl: canonicalUrl,
    storageType: 'LOCAL_DISK',
    storageKey,
  };
}
