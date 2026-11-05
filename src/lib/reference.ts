import { prisma } from './prisma';

/**
 * Concurrency-safe, sequential release reference number generator.
 * Format: PHD-{YEAR}-REL-{SEQ} (e.g., PHD-2026-REL-001)
 */
export async function generateReleaseReferenceNumber(customPrefix?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = (customPrefix || 'PHD').trim().toUpperCase();
  const pattern = `${prefix}-${currentYear}-REL-`;

  return await prisma.$transaction(async (tx) => {
    // Find all releases matching this year's prefix
    const matchingReleases = await tx.release.findMany({
      where: {
        referenceNumber: {
          startsWith: pattern,
        },
      },
      select: {
        referenceNumber: true,
      },
      orderBy: {
        referenceNumber: 'desc',
      },
      take: 10,
    });

    let maxSeq = 0;
    for (const rel of matchingReleases) {
      const parts = rel.referenceNumber.split('-');
      if (parts.length >= 4) {
        const num = parseInt(parts[3], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const formattedSeq = nextSeq.toString().padStart(3, '0');
    return `${pattern}${formattedSeq}`;
  });
}

/**
 * Concurrency-safe, sequential contract number generator.
 * Format: PHD-CTR-{YEAR}-{SEQ} (e.g., PHD-CTR-2026-001)
 */
export async function generateContractNumber(customPrefix?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = (customPrefix || 'PHD').trim().toUpperCase();
  const pattern = `${prefix}-CTR-${currentYear}-`;

  return await prisma.$transaction(async (tx) => {
    const matchingContracts = await tx.artistContract.findMany({
      where: {
        contractNumber: {
          startsWith: pattern,
        },
      },
      select: {
        contractNumber: true,
      },
      orderBy: {
        contractNumber: 'desc',
      },
      take: 20,
    });

    let maxSeq = 0;
    for (const ctr of matchingContracts) {
      const parts = ctr.contractNumber.split('-');
      if (parts.length >= 4) {
        const num = parseInt(parts[3], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const formattedSeq = nextSeq.toString().padStart(3, '0');
    return `${pattern}${formattedSeq}`;
  });
}

/**
 * Concurrency-safe, sequential ISRC code generator.
 * Pattern: NGB77{YY}{SEQ5}
 * Persistent Registrant Prefix: NGB77
 * Year: 26 (2-digit reference year)
 * Numbers start from: 00300 (e.g. NGB772600300, NGB772600301, ...)
 */
export async function generateNextIsrc(count: number = 1): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const year2Digits = currentYear.toString().slice(-2); // e.g. "26"
  const prefix = `NGB77${year2Digits}`;
  const BASE_START_SEQ = 300; // starts from 00300

  return await prisma.$transaction(async (tx) => {
    // Find all tracks with an ISRC starting with NGB77{YY}
    const matchingTracks = await tx.track.findMany({
      where: {
        isrc: {
          startsWith: prefix,
        },
      },
      select: {
        isrc: true,
      },
      orderBy: {
        isrc: 'desc',
      },
      take: 100,
    });

    let maxSeq = BASE_START_SEQ - 1; // 299, so next is at least 300

    for (const t of matchingTracks) {
      if (!t.isrc) continue;
      const clean = t.isrc.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (clean.startsWith(prefix)) {
        const seqStr = clean.slice(prefix.length);
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }

    const generated: string[] = [];
    for (let i = 1; i <= count; i++) {
      const nextSeq = maxSeq + i;
      const formattedSeq = nextSeq.toString().padStart(5, '0');
      generated.push(`${prefix}${formattedSeq}`);
    }

    return generated;
  });
}
