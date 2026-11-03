import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateReleaseReferenceNumber } from '@/lib/reference';
import { getSampleReleaseData } from '@/lib/demo-data';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const referencePrefix = settings?.releaseReferencePrefix || 'PHD';
    const referenceNumber = await generateReleaseReferenceNumber(referencePrefix);

    const demoData = getSampleReleaseData(user.id, referenceNumber);

    const release = await prisma.release.create({
      data: {
        referenceNumber: demoData.referenceNumber,
        artistId: user.id,
        title: demoData.title,
        releaseType: demoData.releaseType,
        primaryArtist: demoData.primaryArtist,
        featuredArtists: demoData.featuredArtists,
        recordLabel: demoData.recordLabel,
        genre: demoData.genre,
        subgenre: demoData.subgenre,
        plannedReleaseDate: demoData.plannedReleaseDate,
        territoryType: demoData.territoryType,
        territoryDetails: demoData.territoryDetails,
        distributionFormats: demoData.distributionFormats,
        distributionPlatforms: demoData.distributionPlatforms,
        releaseDescription: demoData.releaseDescription,
        status: 'DRAFT',
        currency: demoData.currency,
        maxApprovedBudget: demoData.maxApprovedBudget,
        budgetConditions: demoData.budgetConditions,
        isDemo: true,
        tracks: {
          create: demoData.tracks.map((t) => ({
            trackNumber: t.trackNumber,
            title: t.title,
            versionRemix: t.versionRemix,
            primaryArtist: t.primaryArtist,
            featuredArtists: t.featuredArtists,
            producerBeatmaker: t.producerBeatmaker,
            songwritersComposers: t.songwritersComposers,
            masterOwnerLegalName: t.masterOwnerLegalName,
            masterOwnershipPercentage: t.masterOwnershipPercentage,
            isrc: t.isrc,
            recordingCompletionDate: t.recordingCompletionDate,
            explicitContent: t.explicitContent,
            language: t.language,
            duration: t.duration,
            lyricsText: t.lyricsText,
            lyricsDelivered: t.lyricsDelivered,
            finalMasterDelivered: t.finalMasterDelivered,
            artworkMetadataDelivered: t.artworkMetadataDelivered,
            rightsClearanceStatus: t.rightsClearanceStatus,
            audioFileName: t.audioFileName,
            audioFileSize: t.audioFileSize,
            audioSampleRate: t.audioSampleRate,
            audioBitDepth: t.audioBitDepth,
            audioChannels: t.audioChannels,
            audioIsLossless: t.audioIsLossless,
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
        clearanceItems: {
          create: demoData.clearanceItems.map((c) => ({
            category: c.category,
            status: c.status,
            documentReference: c.documentReference,
            notes: c.notes,
            rightsHolder: c.rightsHolder,
            dateReceived: c.dateReceived,
            reviewStatus: c.reviewStatus,
          })),
        },
        deliverables: {
          create: demoData.deliverables.map((d) => ({
            deliverableKey: d.deliverableKey,
            name: d.name,
            responsibleParty: d.responsibleParty,
            status: d.status,
            fileName: d.fileName,
            metadataJson: d.metadataJson,
            approvalDate: d.approvalDate,
          })),
        },
        budgetItems: {
          create: demoData.budgetItems.map((b) => ({
            expenseCategory: b.expenseCategory,
            suggestedAmount: b.suggestedAmount || 0,
            approvedAmount: b.approvedAmount || 0,
            actualAmount: b.actualAmount || 0,
            approvalReference: b.approvalReference,
            approvalStatus: b.approvalStatus || 'APPROVED',
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

    const readiness = evaluateReleaseReadiness(release);
    await prisma.release.update({
      where: { id: release.id },
      data: { readinessScore: readiness.score },
    });

    await createAuditLog({
      releaseId: release.id,
      userId: user.id,
      userEmail: user.email,
      action: 'DEMO_RELEASE_CREATED',
      entityType: 'Release',
      entityId: release.id,
      newValue: { referenceNumber: release.referenceNumber, title: release.title },
    });

    return NextResponse.json({ success: true, release, readiness });
  } catch (err: any) {
    console.error('Failed to create demo release:', err);
    return NextResponse.json({ error: err.message || 'Failed to create demo release' }, { status: 500 });
  }
}

