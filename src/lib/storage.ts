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

// Optional S3 / Cloudflare R2 client initialization
function getS3Client(): { client: S3Client; bucket: string; publicUrl?: string } | null {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || 'auto';
  const endpoint = process.env.S3_ENDPOINT; // For Cloudflare R2 or MinIO (e.g. https://<account_id>.r2.cloudflarestorage.com)

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
    publicUrl: process.env.S3_PUBLIC_URL?.replace(/\/$/, ''),
  };
}

/**
 * Persists an uploaded file or generated PDF either to Cloud Object Storage (S3 / Cloudflare R2)
 * or to local persistent disk under /public/uploads/
 */
export async function saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
  const { buffer, filename, subfolder, mimeType } = options;

  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const safeName = `${Date.now()}_${sanitized}`;
  const storageKey = `uploads/${subfolder}/${safeName}`;

  const s3 = getS3Client();

  if (s3) {
    // 1. Upload to Cloud Object Storage (S3 / Cloudflare R2 / DigitalOcean Spaces)
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      })
    );

    const fileUrl = s3.publicUrl
      ? `${s3.publicUrl}/${storageKey}`
      : `https://${s3.bucket}.s3.amazonaws.com/${storageKey}`;

    return {
      fileUrl,
      storageType: 'OBJECT_STORAGE',
      storageKey,
    };
  }

  // 2. Fallback to Local Persistent Volume / Disk Storage
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, safeName);
  fs.writeFileSync(filePath, buffer);

  return {
    fileUrl: `/uploads/${subfolder}/${safeName}`,
    storageType: 'LOCAL_DISK',
    storageKey,
  };
}

