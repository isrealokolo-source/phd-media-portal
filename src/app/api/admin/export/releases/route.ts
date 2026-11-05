import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const releases = await prisma.release.findMany({
      where,
      include: {
        artist: { select: { name: true, email: true, artistProfile: true } },
        tracks: {
          orderBy: { trackNumber: 'asc' },
        },
        clearanceItems: true,
        deliverables: true,
        budgetItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Reference Number',
      'Release Title',
      'Release Type',
      'Primary Artist',
      'Artist Legal Name',
      'Artist Contact Email',
      'Record Label',
      'Genre',
      'Subgenre',
      'Planned Release Date',
      'Status',
      'Tracks Count',
      'Track List & ISRCs',
      'Master Ownership Splits',
      'Cover Artwork Uploaded',
      'Clearances Obtained / Total',
      'Total Approved Budget',
      'Currency',
      'Created Date',
      'Submitted Date',
      'Executed Date',
    ];

    const rows = releases.map((r) => {
      const trackSummary = r.tracks
        .map((t) => `${t.trackNumber}. ${t.title} [ISRC: ${t.isrc || 'NONE'}]`)
        .join(' | ');

      const splitSummary = r.tracks
        .map((t) => `Trk ${t.trackNumber}: ${t.masterOwnerLegalName || 'Owner'} (${t.masterOwnershipPercentage}%)`)
        .join(' | ');

      const artwork = r.deliverables.find((d) => d.deliverableKey === 'cover_artwork');
      const hasArtwork = Boolean(artwork?.fileUrl || artwork?.status === 'Uploaded' || artwork?.status === 'Approved');

      const clearancesTotal = r.clearanceItems.length;
      const clearancesObtained = r.clearanceItems.filter((c) => c.status === 'Obtained').length;

      const totalApprovedBudget = r.budgetItems.reduce((acc, b) => acc + (b.approvedAmount || 0), 0);

      return [
        r.referenceNumber,
        r.title,
        r.releaseType,
        r.primaryArtist,
        r.artist?.artistProfile?.legalName || r.artist?.name || '',
        r.artist?.email || '',
        r.recordLabel || '',
        r.genre || '',
        r.subgenre || '',
        r.plannedReleaseDate ? new Date(r.plannedReleaseDate).toISOString().split('T')[0] : 'TBD',
        r.status,
        r.tracks.length,
        trackSummary,
        splitSummary,
        hasArtwork ? 'YES' : 'NO',
        `${clearancesObtained}/${clearancesTotal}`,
        totalApprovedBudget > 0 ? totalApprovedBudget.toFixed(2) : '0.00',
        r.currency || 'NGN',
        new Date(r.createdAt).toISOString().split('T')[0],
        r.submittedAt ? new Date(r.submittedAt).toISOString().split('T')[0] : '',
        r.executedAt ? new Date(r.executedAt).toISOString().split('T')[0] : '',
      ]
        .map(escapeCsvField)
        .join(',');
    });

    const csvContent = [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `PHD_Release_Catalogue_Export_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Failed to export releases CSV:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
