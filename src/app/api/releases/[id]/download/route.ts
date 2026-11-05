import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { createZipArchive, ZipFileInput } from '@/lib/zip';
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

function sanitizeForFilename(str: string): string {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9_\-\. ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function getFileExtension(fileUrl: string, defaultExt: string): string {
  try {
    const cleanUrl = fileUrl.split('?')[0];
    const ext = path.extname(cleanUrl).toLowerCase();
    return ext ? ext.replace('.', '') : defaultExt;
  } catch {
    return defaultExt;
  }
}

async function fetchFileBuffer(fileUrl: string): Promise<Buffer | null> {
  try {
    const s3 = getS3Client();

    // 1. If URL starts with /api/files/
    if (fileUrl.startsWith('/api/files/')) {
      const key = fileUrl.replace('/api/files/', '').split('?')[0];

      // Try S3
      if (s3) {
        try {
          const res = await s3.client.send(
            new GetObjectCommand({
              Bucket: s3.bucket,
              Key: key,
            })
          );
          if (res.Body) {
            const byteArray = await res.Body.transformToByteArray();
            return Buffer.from(byteArray);
          }
        } catch {}
      }

      // Try Local
      const localPath = path.join(process.cwd(), 'public', key);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }

    // 2. If URL is a direct local path inside /uploads
    if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      const cleanRel = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
      const localPath = path.join(process.cwd(), 'public', cleanRel);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }

    // 3. Fallback: absolute HTTP(S) URL
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      const resp = await fetch(fileUrl);
      if (resp.ok) {
        const ab = await resp.arrayBuffer();
        return Buffer.from(ab);
      }
    }

    return null;
  } catch (err) {
    console.error('Error fetching file buffer:', err);
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const release = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        tracks: { orderBy: { trackNumber: 'asc' } },
        deliverables: true,
        clearanceItems: true,
      },
    });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    // Authorization: only PHD Admin or the artist who owns this release
    if (!isPhdAdmin(user.role) && release.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const downloadType = searchParams.get('type') || 'bundle'; // 'bundle' | 'artwork' | 'track' | 'clearance'
    const trackId = searchParams.get('trackId');
    const clearanceId = searchParams.get('clearanceId');

    const cleanRef = sanitizeForFilename(release.referenceNumber);
    const cleanArtist = sanitizeForFilename(release.primaryArtist);
    const cleanTitle = sanitizeForFilename(release.title);

    // ----------------------------------------------------
    // TYPE A: SINGLE COVER ARTWORK DOWNLOAD
    // ----------------------------------------------------
    if (downloadType === 'artwork') {
      const artwork = release.deliverables.find((d) => d.deliverableKey === 'cover_artwork');
      if (!artwork || !artwork.fileUrl) {
        return NextResponse.json({ error: 'Cover artwork not uploaded' }, { status: 404 });
      }

      const buffer = await fetchFileBuffer(artwork.fileUrl);
      if (!buffer) {
        return NextResponse.json({ error: 'Could not retrieve artwork file' }, { status: 500 });
      }

      const ext = getFileExtension(artwork.fileUrl, 'jpg');
      const filename = `${cleanRef}_${cleanArtist}_${cleanTitle}_Cover_Artwork.${ext}`;

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': ext === 'png' ? 'image/png' : 'image/jpeg',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ----------------------------------------------------
    // TYPE B: SINGLE TRACK AUDIO DOWNLOAD
    // ----------------------------------------------------
    if (downloadType === 'track') {
      const track = release.tracks.find((t) => (trackId ? t.id === trackId : true));
      if (!track || !track.audioFileUrl) {
        return NextResponse.json({ error: 'Track audio not found' }, { status: 404 });
      }

      const buffer = await fetchFileBuffer(track.audioFileUrl);
      if (!buffer) {
        return NextResponse.json({ error: 'Could not retrieve audio file' }, { status: 500 });
      }

      const ext = getFileExtension(track.audioFileUrl, 'wav');
      const trackNum = track.trackNumber.toString().padStart(2, '0');
      const trackArtist = sanitizeForFilename(track.primaryArtist || release.primaryArtist);
      const trackTitle = sanitizeForFilename(track.title);
      const remix = track.versionRemix ? `_${sanitizeForFilename(track.versionRemix)}` : '';
      const filename = `${cleanRef}_Track${trackNum}_${trackArtist}_${trackTitle}${remix}.${ext}`;

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ----------------------------------------------------
    // TYPE C: SINGLE CLEARANCE DOCUMENT PDF DOWNLOAD
    // ----------------------------------------------------
    if (downloadType === 'clearance') {
      const item = release.clearanceItems.find((c) => (clearanceId ? c.id === clearanceId : true));
      if (!item || !item.supportingDocUrl) {
        return NextResponse.json({ error: 'Clearance document not found' }, { status: 404 });
      }

      const buffer = await fetchFileBuffer(item.supportingDocUrl);
      if (!buffer) {
        return NextResponse.json({ error: 'Could not retrieve clearance PDF' }, { status: 500 });
      }

      const cleanCat = sanitizeForFilename(item.category);
      const filename = `${cleanRef}_Clearance_${cleanCat}.pdf`;

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': buffer.length.toString(),
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ----------------------------------------------------
    // TYPE D: COMPLETE ZIP BUNDLE (Artwork + Tracks + Clearances)
    // ----------------------------------------------------
    const filesToZip: ZipFileInput[] = [];

    // 1. Cover Artwork
    const artwork = release.deliverables.find((d) => d.deliverableKey === 'cover_artwork');
    if (artwork && artwork.fileUrl) {
      const artBuffer = await fetchFileBuffer(artwork.fileUrl);
      if (artBuffer) {
        const ext = getFileExtension(artwork.fileUrl, 'jpg');
        filesToZip.push({
          name: `00_Cover_Artwork/${cleanRef}_Cover_Artwork.${ext}`,
          data: artBuffer,
        });
      }
    }

    // 2. Audio Tracks
    for (const track of release.tracks) {
      if (track.audioFileUrl) {
        const trackBuffer = await fetchFileBuffer(track.audioFileUrl);
        if (trackBuffer) {
          const ext = getFileExtension(track.audioFileUrl, 'wav');
          const trackNum = track.trackNumber.toString().padStart(2, '0');
          const trackArtist = sanitizeForFilename(track.primaryArtist || release.primaryArtist);
          const trackTitle = sanitizeForFilename(track.title);
          const remix = track.versionRemix ? `_${sanitizeForFilename(track.versionRemix)}` : '';
          const filename = `${trackNum}_${trackArtist}_${trackTitle}${remix}.${ext}`;

          filesToZip.push({
            name: `01_Audio_Masters/${filename}`,
            data: trackBuffer,
          });
        }
      }
    }

    // 3. Rights Clearance PDFs
    for (let i = 0; i < release.clearanceItems.length; i++) {
      const item = release.clearanceItems[i];
      if (item.supportingDocUrl) {
        const docBuffer = await fetchFileBuffer(item.supportingDocUrl);
        if (docBuffer) {
          const cleanCat = sanitizeForFilename(item.category);
          filesToZip.push({
            name: `02_Clearance_Agreements/${cleanRef}_Clearance_${i + 1}_${cleanCat}.pdf`,
            data: docBuffer,
          });
        }
      }
    }

    if (filesToZip.length === 0) {
      return NextResponse.json(
        { error: 'No files are available to bundle for this release' },
        { status: 400 }
      );
    }

    const zipBuffer = createZipArchive(filesToZip);
    const bundleFilename = `${cleanRef}_${cleanArtist}_${cleanTitle}_Release_Assets.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': zipBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${bundleFilename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (err: any) {
    console.error('Release download handler error:', err);
    return NextResponse.json({ error: err.message || 'Download failed' }, { status: 500 });
  }
}
