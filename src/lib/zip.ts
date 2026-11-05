import zlib from 'zlib';

// Fast standard CRC32 lookup table
const crcTable: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string; // Relative path inside zip, e.g. "Cover_Artwork/PHD_Artwork.jpg"
  data: Buffer;
  date?: Date;
}

/**
 * Creates a valid, standard ZIP archive Buffer containing the given files.
 * Uses Deflate compression via Node.js zlib with zero external dependencies.
 */
export function createZipArchive(files: ZipFileInput[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');
    const uncompressedData = file.data;
    const fileCrc = crc32(uncompressedData);
    const uncompressedSize = uncompressedData.length;

    // Use deflate compression
    let compressedData: Buffer = Buffer.from(zlib.deflateRawSync(uncompressedData));
    let compressionMethod = 8; // Deflate

    // If compressed is larger or equal, store raw
    if (compressedData.length >= uncompressedSize) {
      compressedData = uncompressedData;
      compressionMethod = 0; // Stored
    }

    const compressedSize = compressedData.length;

    // DOS Time & Date
    const d = file.date || new Date();
    const dosTime =
      ((d.getHours() & 0x1f) << 11) |
      ((d.getMinutes() & 0x3f) << 5) |
      ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const dosDate =
      (((d.getFullYear() - 1980) & 0x7f) << 9) |
      (((d.getMonth() + 1) & 0x0f) << 5) |
      (d.getDate() & 0x1f);

    // 1. Local File Header (30 bytes + filename + data)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // Flags
    localHeader.writeUInt16LE(compressionMethod, 8); // Method
    localHeader.writeUInt16LE(dosTime, 10); // Time
    localHeader.writeUInt16LE(dosDate, 12); // Date
    localHeader.writeUInt32LE(fileCrc, 14); // CRC-32
    localHeader.writeUInt32LE(compressedSize, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length

    const fullLocalRecord = Buffer.concat([localHeader, filenameBuf, compressedData]);
    localHeaders.push(fullLocalRecord);

    // 2. Central Directory Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0, 8); // Flags
    centralHeader.writeUInt16LE(compressionMethod, 10); // Method
    centralHeader.writeUInt16LE(dosTime, 12); // Time
    centralHeader.writeUInt16LE(dosDate, 14); // Date
    centralHeader.writeUInt32LE(fileCrc, 16); // CRC-32
    centralHeader.writeUInt32LE(compressedSize, 20); // Compressed size
    centralHeader.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    centralHeader.writeUInt16LE(filenameBuf.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // Comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0x81a40000, 38); // External file attributes (-rw-r--r--)
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header

    centralHeaders.push(Buffer.concat([centralHeader, filenameBuf]));

    offset += fullLocalRecord.length;
  }

  const centralDirOffset = offset;
  const centralDirBuffer = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuffer.length;

  // 3. End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Start disk
  eocd.writeUInt16LE(files.length, 8); // Total entries on disk
  eocd.writeUInt16LE(files.length, 10); // Total entries overall
  eocd.writeUInt32LE(centralDirSize, 12); // Central dir size
  eocd.writeUInt32LE(centralDirOffset, 16); // Central dir offset
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}
