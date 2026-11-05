import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { generateReleaseReferenceNumber } from '@/lib/reference';
import { CLEARANCE_CATEGORIES, DELIVERABLES_CONFIG } from '@/lib/constants';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sourceRelease = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        tracks: {
          include: { contributors: true },
          orderBy: { trackNumber: 'asc' },
        },
        clearanceItems: true,
        budgetItems: true,
      },
    });

    if (!sourceRelease) {
      return NextResponse.json({ error: 'Source release not found' }, { status: 404 });
    }

    // Permission check
    if (!isPhdAdmin(user.role) && sourceRelease.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const referencePrefix = settings?.releaseReferencePrefix || 'PHD';
    const referenceNumber = await generateReleaseReferenceNumber(referencePrefix);

    // Create the cloned release in transaction
    const newRelease = await prisma.release.create({
      data: {
        referenceNumber,
        artistId: user.id, // Assign to current user (artist or admin duplicating)
        title: `${sourceRelease.title} (Copy)`,
        releaseType: sourceRelease.releaseType,
        primaryArtist: sourceRelease.primaryArtist,
        featuredArtists: sourceRelease.featuredArtists,
        recordLabel: sourceRelease.recordLabel,
        genre: sourceRelease.genre,
        subgenre: sourceRelease.subgenre,
        plannedReleaseDate: null, // Reset release date for new draft
        territoryType: sourceRelease.territoryType,
        territoryDetails: sourceRelease.territoryDetails,
        distributionFormats: sourceRelease.distributionFormats,
        distributionPlatforms: sourceRelease.distributionPlatforms,
        releaseDescription: sourceRelease.releaseDescription,
        currency: sourceRelease.currency,
        status: 'DRAFT',
        currentVersion: 1,
        readinessScore: 0,
        // Clone track skeletons (without audio binaries, allowing fresh master uploads)
        tracks: {
          create: sourceRelease.tracks.map((t) => ({
            trackNumber: t.trackNumber,
            title: t.title,
            versionRemix: t.versionRemix,
            primaryArtist: t.primaryArtist,
            featuredArtists: t.featuredArtists,
            producerBeatmaker: t.producerBeatmaker,
            songwritersComposers: t.songwritersComposers,
            masterOwnerLegalName: t.masterOwnerLegalName,
            masterOwnershipPercentage: t.masterOwnershipPercentage,
            explicitContent: t.explicitContent,
            language: t.language,
            duration: t.duration,
            lyricsText: t.lyricsText,
            lyricsDelivered: t.lyricsText ? 'Yes' : 'No',
            finalMasterDelivered: 'No',
            rightsClearanceStatus: 'Pending',
            contributors: {
              create: t.contributors.map((c) => ({
                contributorName: c.contributorName,
                role: c.role,
                feeRoyaltyShare: c.feeRoyaltyShare,
                rightsAgreementRef: c.rightsAgreementRef,
              })),
            },
          })),
        },
        // Fresh standard clearance checklist
        clearanceItems: {
          create: CLEARANCE_CATEGORIES.map((cat) => {
            const existing = sourceRelease.clearanceItems.find((c) => c.category === cat.id);
            return {
              category: cat.id,
              status: 'Pending',
              rightsHolder: existing?.rightsHolder || null,
              documentReference: null,
              notes: `Clearance category: ${cat.label}`,
            };
          }),
        },
        // Fresh deliverables
        deliverables: {
          create: DELIVERABLES_CONFIG.map((del) => ({
            deliverableKey: del.key,
            name: del.name,
            responsibleParty: del.responsibleParty,
            status: 'Not Started',
          })),
        },
        // Clone budget categories with reset approval status
        budgetItems: {
          create: sourceRelease.budgetItems.map((b) => ({
            expenseCategory: b.expenseCategory,
            suggestedAmount: b.suggestedAmount || 0,
            approvedAmount: 0,
            approvalStatus: 'PENDING_REVIEW',
            isEligibleRecoupable: b.isEligibleRecoupable,
            notes: b.notes,
          })),
        },
      },
      include: {
        tracks: { include: { contributors: true } },
        clearanceItems: true,
        deliverables: true,
        budgetItems: true,
      },
    });

    await createAuditLog({
      releaseId: newRelease.id,
      userId: user.id,
      userEmail: user.email,
      action: 'RELEASE_CREATED',
      entityType: 'Release',
      entityId: newRelease.id,
      newValue: {
        referenceNumber: newRelease.referenceNumber,
        title: newRelease.title,
        duplicatedFrom: sourceRelease.referenceNumber,
      },
    });

    return NextResponse.json({ success: true, release: newRelease });
  } catch (err: any) {
    console.error('Failed to duplicate release:', err);
    return NextResponse.json({ error: err.message || 'Failed to duplicate release' }, { status: 500 });
  }
}
