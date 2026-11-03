import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const releaseId = searchParams.get('releaseId');

    const where: any = {};
    if (releaseId) where.releaseId = releaseId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

