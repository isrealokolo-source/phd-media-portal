import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Only PHD personnel can approve budget rates' }, { status: 403 });
    }

    const release = await prisma.release.findUnique({
      where: { id: params.id },
      include: { budgetItems: true },
    });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    const body = await req.json();
    const { items } = body; // Array of { id, approvedAmount, approvalReference, approvalStatus, reviewerNotes, isEligibleRecoupable }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    for (const item of items) {
      if (item.id) {
        await prisma.budgetItem.update({
          where: { id: item.id },
          data: {
            approvedAmount: Number(item.approvedAmount) || 0,
            approvalReference: item.approvalReference || `PHD-APPR-${item.id.slice(-4)}`,
            approvalStatus: item.approvalStatus || 'APPROVED',
            reviewerNotes: item.reviewerNotes,
            isEligibleRecoupable: item.isEligibleRecoupable !== false,
          },
        });
      }
    }

    const updatedItems = await prisma.budgetItem.findMany({
      where: { releaseId: params.id },
    });

    await createAuditLog({
      releaseId: release.id,
      userId: user.id,
      userEmail: user.email,
      action: 'BUDGET_RATES_APPROVED',
      entityType: 'Release',
      entityId: release.id,
      newValue: { count: items.length },
    });

    return NextResponse.json({ success: true, budgetItems: updatedItems });
  } catch (err: any) {
    console.error('Failed to update approved budget rates:', err);
    return NextResponse.json({ error: err.message || 'Failed to update budget rates' }, { status: 500 });
  }
}

