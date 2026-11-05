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

// Helper to inspect WAV header from buffer
function parseWavHeader(buffer: Buffer) {
  try {
    if (buffer.length < 44) return null;
    const riff = buffer.toString('ascii', 0, 4);
    const wave = buffer.toString('ascii', 8, 12);
    if (riff !== 'RIFF' || wave !== 'WAVE') {
      return { isWav: false, error: 'Not a valid RIFF/WAVE file' };
    }

    // Read fmt subchunk
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);

    return {
      isWav: true,
      channels: channels === 1 ? 'Mono (1.0)' : 'Stereo (2.0)',
      sampleRate: `${sampleRate} Hz`,
      bitsPerSample: `${bitsPerSample}-bit PCM`,
      isLossless: true,
    };
  } catch {
    return null;
  }
}

// Helper to inspect PNG/JPEG dimensions from buffer
function parseImageDimensions(buffer: Buffer) {
  try {
    // Check PNG
    if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height, format: 'PNG' };
    }

    // Check JPEG (SOF0 or SOF2 marker)
    if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] === 0xff && (buffer[offset + 1] === 0xc0 || buffer[offset + 1] === 0xc2)) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height, format: 'JPEG' };
        }
        offset++;
      }
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
