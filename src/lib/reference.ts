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

