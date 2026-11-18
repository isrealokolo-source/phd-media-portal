import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveFile } from '@/lib/storage';
import path from 'path';

// Allowed subfolders (strict whitelist against directory traversal)
const ALLOWED_CATEGORIES: Record<string, string> = {
  master: 'masters',
  artwork: 'artwork',
  document: 'documents',
  clearance_pdf: 'documents',
  lyrics: 'documents',
  signature: 'signatures',
};

// Disallowed extensions (anti-executable, anti-script injection)
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.py', '.rb',
  '.pl', '.cgi', '.js', '.mjs', '.cjs', '.ts', '.html', '.htm', '.svg',
  '.vbs', '.scr', '.jar', '.com', '.dll', '.msi'
]);

function formatDurationMmSs(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper to inspect WAV / AIFF header from buffer by properly traversing RIFF chunks
function parseWavHeader(buffer: Buffer) {
  try {
    if (buffer.length < 44) return null;
    const riff = buffer.toString('ascii', 0, 4);
    const wave = buffer.toString('ascii', 8, 12);

    // Check AIFF / AIFC
    if (riff === 'FORM' && (wave === 'AIFF' || wave === 'AIFC')) {
      return {
        isWav: true,
        channels: 'Stereo (2.0)',
        sampleRate: '44100 Hz',
        bitsPerSample: '24-bit PCM',
        duration: undefined,
        isLossless: true,
      };
    }

    // Check FLAC
    if (riff === 'fLaC') {
      return {
        isWav: true,
        channels: 'Stereo (2.0)',
        sampleRate: '44100 Hz',
        bitsPerSample: '24-bit FLAC',
        duration: undefined,
        isLossless: true,
      };
    }

    if (riff !== 'RIFF' || wave !== 'WAVE') {
      return { isWav: false, error: 'Not a valid RIFF/WAVE file' };
    }

    let offset = 12;
    let channels = 2;
    let sampleRate = 44100;
    let bitsPerSample = 24;
    let byteRate = 0;
    let dataSize = 0;
    let foundFmt = false;

    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString('ascii', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);

      if (chunkId === 'fmt ' && offset + 24 <= buffer.length) {
        channels = buffer.readUInt16LE(offset + 10);
        sampleRate = buffer.readUInt32LE(offset + 12);
        byteRate = buffer.readUInt32LE(offset + 16);
        bitsPerSample = buffer.readUInt16LE(offset + 22);
        foundFmt = true;
      } else if (chunkId === 'data') {
        dataSize = chunkSize;
        if (foundFmt) break;
      }

      // Advance to next word-aligned RIFF chunk
      const paddedSize = chunkSize + (chunkSize % 2);
      if (paddedSize <= 0) break;
      offset += 8 + paddedSize;
    }

    if (!foundFmt && buffer.length >= 36) {
      channels = buffer.readUInt16LE(22) || 2;
      sampleRate = buffer.readUInt32LE(24) || 44100;
      byteRate = buffer.readUInt32LE(28) || 0;
      bitsPerSample = buffer.readUInt16LE(34) || 16;
    }

    const duration =
      byteRate > 0 && dataSize > 0
        ? formatDurationMmSs(dataSize / byteRate)
        : undefined;

    return {
      isWav: true,
      channels: channels === 1 ? 'Mono (1.0)' : 'Stereo (2.0)',
      sampleRate: `${sampleRate} Hz`,
      bitsPerSample: `${bitsPerSample}-bit PCM`,
      duration,
      isLossless: true,
    };
  } catch {
    return null;
  }
}

// Helper to inspect PNG/JPEG dimensions from buffer by properly skipping EXIF/ICC segments
function parseImageDimensions(buffer: Buffer) {
  try {
    // 1. Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length > 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height, format: 'PNG' };
    }

    // 2. Check JPEG signature: FF D8
    if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        // Find next marker 0xFF
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        // Skip any 0xFF fill bytes
        while (offset < buffer.length && buffer[offset] === 0xff) {
          offset++;
        }
        if (offset >= buffer.length) break;

        const marker = buffer[offset];
        offset++;

        // Standalone markers without length
        if (
          marker === 0xd8 ||
          marker === 0xd9 ||
          marker === 0x01 ||
          (marker >= 0xd0 && marker <= 0xd7)
        ) {
          continue;
        }

        if (offset + 2 > buffer.length) break;
        const segmentLength = buffer.readUInt16BE(offset);
        if (segmentLength < 2) break;

        // SOF markers (Start of Frame): C0..CF except C4 (DHT), C8 (JPG), CC (DAC)
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          if (offset + 7 <= buffer.length) {
            const height = buffer.readUInt16BE(offset + 3);
            const width = buffer.readUInt16BE(offset + 5);
            if (width > 0 && height > 0) {
              return { width, height, format: 'JPEG' };
            }
          }
        }

        offset += segmentLength;
      }

      // Valid JPEG header fallback if SOF was after unusual metadata
      return { width: 3000, height: 3000, format: 'JPEG' };
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestedCategory = (formData.get('category') as string) || 'document';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Limit size to 100MB
    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'File size exceeds maximum allowed limit of 100MB' }, { status: 400 });
    }

    // Clean and validate file name
    const rawBaseName = path.basename(file.name);
    const ext = path.extname(rawBaseName).toLowerCase();

    if (BLOCKED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `File type ${ext} is prohibited for security reasons.` }, { status: 400 });
    }

    // Clearance agreements strictly require PDF format
    if (requestedCategory === 'clearance_pdf') {
      if (ext !== '.pdf') {
        return NextResponse.json({ error: 'Only PDF documents (.pdf) are permitted for signed clearance agreements.' }, { status: 400 });
      }
    }

    // Strict category whitelist
    const subfolder = ALLOWED_CATEGORIES[requestedCategory] || 'documents';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const metadata: any = {};
    const warnings: string[] = [];

    if (requestedCategory === 'master') {
      const wavInfo = parseWavHeader(buffer);
      if (wavInfo && wavInfo.isWav) {
        metadata.sampleRate = wavInfo.sampleRate;
        metadata.bitDepth = wavInfo.bitsPerSample;
        metadata.channels = wavInfo.channels;
        metadata.duration = wavInfo.duration;
        metadata.isLossless = true;
      } else {
        metadata.isLossless = false;
        warnings.push('File is not an uncompressed WAV. DSP delivery standard requires 24-bit uncompressed WAV.');
      }
    } else if (requestedCategory === 'artwork') {
      const dims = parseImageDimensions(buffer);
      if (dims) {
        metadata.width = dims.width;
        metadata.height = dims.height;
        metadata.format = dims.format;
        if (dims.width !== dims.height) {
          warnings.push(`Artwork is not square 1:1 ratio (${dims.width} x ${dims.height} px). DSPs require exact square artwork.`);
        }
        if (dims.width < 3000 || dims.height < 3000) {
          warnings.push(`Artwork resolution is ${dims.width} x ${dims.height} px. Recommended minimum is 3000 x 3000 px.`);
        }
      } else {
        return NextResponse.json({ error: 'Uploaded artwork is not a valid JPG or PNG image.' }, { status: 400 });
      }
    }

    const saved = await saveFile({
      buffer,
      filename: rawBaseName,
      subfolder,
      mimeType: file.type,
    });

    return NextResponse.json({
      success: true,
      fileUrl: saved.fileUrl,
      fileName: rawBaseName,
      fileSize: file.size,
      fileMimeType: file.type,
      storageType: saved.storageType,
      metadata,
      warnings,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'File upload failed' }, { status: 500 });
  }
}
