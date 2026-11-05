import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { generateContractNumber } from '@/lib/reference';
import { createAuditLog } from '@/lib/audit';

// GET: List all contracts with uploader & claimed artist details
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { artistName: { contains: search, mode: 'insensitive' } },
        { contractTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contracts = await prisma.artistContract.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const claimedUserIds = contracts
      .map((c) => c.claimedByUserId)
      .filter(Boolean) as string[];

    const claimedUsers =
      claimedUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: claimedUserIds } },
            select: { id: true, name: true, email: true, createdAt: true },
          })
        : [];

    const userMap = new Map(claimedUsers.map((u) => [u.id, u]));

    const enrichedContracts = contracts.map((c) => ({
      ...c,
      claimedByUser: c.claimedByUserId ? userMap.get(c.claimedByUserId) || null : null,
    }));

    return NextResponse.json({ success: true, contracts: enrichedContracts });
  } catch (err: any) {
    console.error('Failed to list contracts:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Upload and create a new contract
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { artistName, contractTitle, fileUrl, fileName, notes } = body;

    if (!artistName || !artistName.trim()) {
      return NextResponse.json({ error: 'Artist name is required to authorize a contract' }, { status: 400 });
    }

    const contractNumber = await generateContractNumber();

    const contract = await prisma.artistContract.create({
      data: {
        contractNumber,
        artistName: artistName.trim(),
        contractTitle: (contractTitle || 'Exclusive Recording & Distribution Agreement').trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        notes: notes ? notes.trim() : null,
        status: 'ACTIVE',
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'CONTRACT_CREATED',
      entityType: 'ArtistContract',
      entityId: contract.id,
      newValue: {
        contractNumber: contract.contractNumber,
        artistName: contract.artistName,
        contractTitle: contract.contractTitle,
        fileUrl: contract.fileUrl,
      },
    });

    return NextResponse.json({ success: true, contract });
  } catch (err: any) {
    console.error('Failed to create contract:', err);
    return NextResponse.json({ error: err.message || 'Failed to create contract' }, { status: 500 });
  }
}

// DELETE: Revoke or delete an unclaimed contract
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }

    const contract = await prisma.artistContract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (contract.status === 'CLAIMED') {
      return NextResponse.json({ error: 'Cannot delete an already claimed contract. Revoke instead.' }, { status: 400 });
    }

    await prisma.artistContract.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'CONTRACT_DELETED',
      entityType: 'ArtistContract',
      entityId: id,
      previousValue: { contractNumber: contract.contractNumber, artistName: contract.artistName },
    });

    return NextResponse.json({ success: true, message: 'Contract deleted' });
  } catch (err: any) {
    console.error('Failed to delete contract:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete contract' }, { status: 500 });
  }
}
