import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

function getS3Client(): { client: S3Client; bucket: string } | null {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || 'auto';
  const endpoint = process.env.S3_ENDPOINT;

  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket };
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.wav':
      return 'audio/wav';
    case '.mp3':
      return 'audio/mpeg';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.pdf':
      return 'application/pdf';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const key = params.path.join('/');
    const s3 = getS3Client();

    const filename = req.nextUrl.searchParams.get('filename');
    const shouldDownload = req.nextUrl.searchParams.get('download') === 'true' || Boolean(filename);
    const contentDisposition = shouldDownload && filename
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : shouldDownload
      ? 'attachment'
      : 'inline';

    // 1. Try S3 / Cloudflare R2
    if (s3) {
      try {
        const response = await s3.client.send(
          new GetObjectCommand({
            Bucket: s3.bucket,
            Key: key,
          })
        );

        if (response.Body) {
          const stream = response.Body as any;
          const webStream = typeof stream.transformToWebStream === 'function'
            ? stream.transformToWebStream()
            : stream;
          const mime = response.ContentType || getMimeType(key);

          return new NextResponse(webStream, {
            headers: {
              'Content-Type': mime,
              'Content-Length': response.ContentLength ? response.ContentLength.toString() : '',
              'Content-Disposition': contentDisposition,
              'Cache-Control': 'private, max-age=86400',
              'Accept-Ranges': 'bytes',
            },
          });
        }
      } catch (s3Err: any) {
        // If not found in S3, fall through to check local disk
      }
    }

    // 2. Try Local Disk
    const localPath = path.join(process.cwd(), 'public', key);
    if (fs.existsSync(localPath)) {
      const stat = fs.statSync(localPath);
      if (!stat.isFile()) {
        return NextResponse.json({ error: 'Not a file' }, { status: 400 });
      }

      const fileBuffer = fs.readFileSync(localPath);
      const mime = getMimeType(localPath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mime,
          'Content-Length': stat.size.toString(),
          'Content-Disposition': contentDisposition,
          'Cache-Control': 'private, max-age=86400',
        },
      });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (err: any) {
    console.error('File streaming error:', err);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
  }
}

