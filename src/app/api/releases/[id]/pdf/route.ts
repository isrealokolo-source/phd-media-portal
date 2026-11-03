import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { generateScheduleAPdf, generateScheduleBPdf, generateCombinedSchedulesPdf } from '@/lib/pdf';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const release = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        artist: { include: { artistProfile: true } },
        tracks: { include: { contributors: true } },
        clearanceItems: true,
        deliverables: true,
        budgetItems: true,
        signatures: true,
      },
    });

    if (!release) return NextResponse.json({ error: 'Release not found' }, { status: 404 });

    if (!isPhdAdmin(user.role) && release.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'combined'; // 'schedA' | 'schedB' | 'combined'

    let result;
    let filename = '';

    if (type === 'schedA') {
      result = await generateScheduleAPdf(release);
      filename = `Schedule_A_${release.referenceNumber}.pdf`;
    } else if (type === 'schedB') {
      result = await generateScheduleBPdf(release);
      filename = `Schedule_B_${release.referenceNumber}.pdf`;
    } else {
      result = await generateCombinedSchedulesPdf(release);
      filename = `Combined_Schedules_${release.referenceNumber}.pdf`;
    }

    return new NextResponse(Buffer.from(result.pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Document-Hash': result.documentHash,
      },
    });
  } catch (err: any) {
    console.error('PDF download error:', err);
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 });
  }
}

