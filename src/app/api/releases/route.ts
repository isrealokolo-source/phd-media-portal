import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { generateReleaseReferenceNumber } from '@/lib/reference';
import { CLEARANCE_CATEGORIES, DELIVERABLES_CONFIG } from '@/lib/constants';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const artistId = searchParams.get('artistId');

    const isAdmin = isPhdAdmin(user.role);

    const where: any = {};

    if (!isAdmin) {
      // Artist can only access their own releases
      where.artistId = user.id;
    } else {
      if (artistId) where.artistId = artistId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { primaryArtist: { contains: search, mode: 'insensitive' } },
      ];
    }

    const releases = await prisma.release.findMany({
      where,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            email: true,
            artistProfile: true,
          },
        },
        tracks: {
          include: {
            contributors: true,
          },
          orderBy: {
            trackNumber: 'asc',
          },
        },
        clearanceItems: true,
        deliverables: true,
        budgetItems: true,
        signatures: true,
        executedDocuments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Compute readiness score and metrics dynamically
    const enriched = releases.map((rel) => {
      const evaluation = evaluateReleaseReadiness(rel);
      return {
        ...rel,
        readiness: evaluation,
      };
    });

    return NextResponse.json({ releases: enriched });
  } catch (err: any) {
    console.error('Failed to list releases:', err);
    return NextResponse.json({ error: 'Failed to retrieve releases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const referencePrefix = settings?.releaseReferencePrefix || 'PHD';

    const referenceNumber = await generateReleaseReferenceNumber(referencePrefix);

    const stageName = user.artistProfile?.stageName || user.name;

    const release = await prisma.release.create({
      data: {
        referenceNumber,
        artistId: user.id,
        title: body.title || 'Untitled Release',
        releaseType: body.releaseType || 'Single',
        primaryArtist: body.primaryArtist || stageName,
        recordLabel: body.recordLabel || 'Independent / PHD Services',
        genre: body.genre || 'Afrobeats',
        plannedReleaseDate: body.plannedReleaseDate ? new Date(body.plannedReleaseDate) : null,
        territoryType: body.territoryType || 'Worldwide',
        currency: body.currency || 'NGN',
        status: 'DRAFT',
        clearanceItems: {
          create: CLEARANCE_CATEGORIES.map((cat) => ({
            category: cat.id,
            status: 'Pending',
            notes: `Clearance category: ${cat.label}`,
          })),
        },
        deliverables: {
          create: DELIVERABLES_CONFIG.map((del) => ({
            deliverableKey: del.key,
            name: del.name,
            responsibleParty: del.responsibleParty,
            status: 'Not Started',
          })),
        },
      },
      include: {
        tracks: true,
        clearanceItems: true,
        deliverables: true,
        budgetItems: true,
      },
    });

    await createAuditLog({
      releaseId: release.id,
      userId: user.id,
      userEmail: user.email,
      action: 'RELEASE_CREATED',
      entityType: 'Release',
      entityId: release.id,
      newValue: { referenceNumber: release.referenceNumber, title: release.title },
    });

    return NextResponse.json({ success: true, release });
  } catch (err: any) {
    console.error('Failed to create release:', err);
    return NextResponse.json({ error: err.message || 'Failed to create release' }, { status: 500 });
  }
}

