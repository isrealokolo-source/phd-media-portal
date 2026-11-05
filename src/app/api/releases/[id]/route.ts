import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const release = await prisma.release.findUnique({
      where: { id: params.id },
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
            masterOwnerships: true,
          },
          orderBy: {
            trackNumber: 'asc',
          },
        },
        masterOwnerships: true,
        clearanceItems: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        licences: true,
        featuredArtistConsents: true,
        visualRights: true,
        deliverables: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        budgetItems: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        signatures: true,
        reviews: {
          include: {
            reviewerUser: {
              select: { name: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        revisionRequests: {
          include: {
            requestedByUser: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 30,
        },
        executedDocuments: {
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    // Access control: Artist can only access their own release
    if (!isPhdAdmin(user.role) && release.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this release' }, { status: 403 });
    }

    const readiness = evaluateReleaseReadiness(release);

    return NextResponse.json({ release, readiness });
  } catch (err: any) {
    console.error('Failed to get release:', err);
    return NextResponse.json({ error: 'Failed to retrieve release' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentRelease = await prisma.release.findUnique({
      where: { id: params.id },
      include: { tracks: true },
    });

    if (!currentRelease) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    if (!isPhdAdmin(user.role) && currentRelease.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Immutable check: cannot edit an executed contract
    if (currentRelease.status === 'FULLY_EXECUTED_APPROVED') {
      return NextResponse.json(
        { error: 'Cannot modify a fully executed and approved release. Create an amendment instead.' },
        { status: 400 }
      );
    }

    // Artist cannot edit while release is in review unless revision requested
    if (
      !isPhdAdmin(user.role) &&
      (currentRelease.status === 'SUBMITTED_PENDING_APPROVAL' || currentRelease.status === 'RESUBMITTED')
    ) {
      return NextResponse.json(
        { error: 'This release is currently under PHD review and is locked from editing.' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Prepare update data
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.releaseType !== undefined) updateData.releaseType = body.releaseType;
    if (body.primaryArtist !== undefined) updateData.primaryArtist = body.primaryArtist;
    if (body.featuredArtists !== undefined) updateData.featuredArtists = body.featuredArtists;
    if (body.recordLabel !== undefined) updateData.recordLabel = body.recordLabel;
    if (body.genre !== undefined) updateData.genre = body.genre;
    if (body.subgenre !== undefined) updateData.subgenre = body.subgenre;
    if (body.plannedReleaseDate !== undefined) {
      updateData.plannedReleaseDate = body.plannedReleaseDate ? new Date(body.plannedReleaseDate) : null;
    }
    if (body.territoryType !== undefined) updateData.territoryType = body.territoryType;
    if (body.territoryDetails !== undefined) updateData.territoryDetails = body.territoryDetails;
    if (body.distributionFormats !== undefined) {
      updateData.distributionFormats = Array.isArray(body.distributionFormats)
        ? JSON.stringify(body.distributionFormats)
        : body.distributionFormats;
    }
    if (body.distributionPlatforms !== undefined) {
      updateData.distributionPlatforms = Array.isArray(body.distributionPlatforms)
        ? JSON.stringify(body.distributionPlatforms)
        : body.distributionPlatforms;
    }
    if (body.releaseDescription !== undefined) updateData.releaseDescription = body.releaseDescription;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.maxApprovedBudget !== undefined) updateData.maxApprovedBudget = Number(body.maxApprovedBudget) || null;
    if (body.budgetConditions !== undefined) updateData.budgetConditions = body.budgetConditions;

    // Handle nested tracks update if provided
    if (Array.isArray(body.tracks)) {
      // Upsert tracks
      for (const trackData of body.tracks) {
        if (trackData.id && !trackData.id.startsWith('temp_')) {
          await prisma.track.update({
            where: { id: trackData.id },
            data: {
              trackNumber: trackData.trackNumber,
              title: trackData.title,
              versionRemix: trackData.versionRemix,
              primaryArtist: trackData.primaryArtist,
              featuredArtists: trackData.featuredArtists,
              producerBeatmaker: trackData.producerBeatmaker,
              songwritersComposers: trackData.songwritersComposers,
              masterOwnerLegalName: trackData.masterOwnerLegalName,
              masterOwnershipPercentage: Number(trackData.masterOwnershipPercentage) || 100,
              isrc: trackData.isrc,
              recordingCompletionDate: trackData.recordingCompletionDate ? new Date(trackData.recordingCompletionDate) : null,
              explicitContent: Boolean(trackData.explicitContent),
              language: trackData.language,
              duration: trackData.duration,
              lyricsText: trackData.lyricsText,
              lyricsDelivered: trackData.lyricsDelivered,
              finalMasterDelivered: trackData.finalMasterDelivered,
              artworkMetadataDelivered: trackData.artworkMetadataDelivered,
              rightsClearanceStatus: trackData.rightsClearanceStatus,
              existingLicenceOrRestriction: trackData.existingLicenceOrRestriction,
              audioFileUrl: trackData.audioFileUrl,
              audioFileName: trackData.audioFileName,
              audioFileSize: trackData.audioFileSize,
              audioSampleRate: trackData.audioSampleRate,
              audioBitDepth: trackData.audioBitDepth,
              audioChannels: trackData.audioChannels,
              audioIsLossless: trackData.audioIsLossless,
            },
          });

          // Handle contributors if present
          if (Array.isArray(trackData.contributors)) {
            await prisma.trackContributor.deleteMany({ where: { trackId: trackData.id } });
            if (trackData.contributors.length > 0) {
              await prisma.trackContributor.createMany({
                data: trackData.contributors.map((c: any) => ({
                  trackId: trackData.id,
                  contributorName: c.contributorName,
                  role: c.role || 'Producer',
                  feeRoyaltyShare: c.feeRoyaltyShare,
                  rightsAgreementRef: c.rightsAgreementRef,
                  supportingDocUrl: c.supportingDocUrl,
                })),
              });
            }
          }
        } else {
          // New track
          await prisma.track.create({
            data: {
              releaseId: params.id,
              trackNumber: trackData.trackNumber || (currentRelease.tracks.length + 1),
              title: trackData.title || 'Untitled Track',
              versionRemix: trackData.versionRemix,
              primaryArtist: trackData.primaryArtist || updateData.primaryArtist || currentRelease.primaryArtist,
              featuredArtists: trackData.featuredArtists,
              producerBeatmaker: trackData.producerBeatmaker,
              songwritersComposers: trackData.songwritersComposers,
              masterOwnerLegalName: trackData.masterOwnerLegalName,
              masterOwnershipPercentage: Number(trackData.masterOwnershipPercentage) || 100,
              isrc: trackData.isrc,
              explicitContent: Boolean(trackData.explicitContent),
              language: trackData.language || 'English',
              duration: trackData.duration,
              lyricsText: trackData.lyricsText,
              lyricsDelivered: trackData.lyricsDelivered || 'No',
              finalMasterDelivered: trackData.finalMasterDelivered || 'No',
              artworkMetadataDelivered: trackData.artworkMetadataDelivered || 'No',
              rightsClearanceStatus: trackData.rightsClearanceStatus || 'Pending',
              audioFileUrl: trackData.audioFileUrl,
              audioFileName: trackData.audioFileName,
              audioFileSize: trackData.audioFileSize,
              audioSampleRate: trackData.audioSampleRate,
              audioBitDepth: trackData.audioBitDepth,
              audioChannels: trackData.audioChannels,
              audioIsLossless: trackData.audioIsLossless,
              contributors: {
                create: Array.isArray(trackData.contributors)
                  ? trackData.contributors.map((c: any) => ({
                      contributorName: c.contributorName,
                      role: c.role || 'Producer',
                      feeRoyaltyShare: c.feeRoyaltyShare,
                      rightsAgreementRef: c.rightsAgreementRef,
                    }))
                  : [],
              },
            },
          });
        }
      }
    }

    // Handle clearance items update if provided
    if (Array.isArray(body.clearanceItems)) {
      for (const item of body.clearanceItems) {
        if (item.id) {
          await prisma.clearanceItem.update({
            where: { id: item.id },
            data: {
              status: item.status,
              documentReference: item.documentReference,
              supportingDocUrl: item.supportingDocUrl,
              notes: item.notes,
              rightsHolder: item.rightsHolder,
              dateReceived: item.dateReceived ? new Date(item.dateReceived) : null,
              reviewStatus: item.reviewStatus,
              reviewNotes: item.reviewNotes,
            },
          });
        }
      }
    }

    // Handle deliverables update if provided
    if (Array.isArray(body.deliverables)) {
      for (const d of body.deliverables) {
        if (d.id) {
          await prisma.deliverable.update({
            where: { id: d.id },
            data: {
              status: d.status,
              responsibleParty: d.responsibleParty,
              fileUrl: d.fileUrl,
              fileName: d.fileName,
              fileSize: d.fileSize,
              fileMimeType: d.fileMimeType,
              metadataJson: d.metadataJson,
              reviewComments: d.reviewComments,
              approvalDate: d.approvalDate ? new Date(d.approvalDate) : null,
            },
          });
        } else if (d.deliverableKey) {
          const existing = await prisma.deliverable.findFirst({
            where: { releaseId: params.id, deliverableKey: d.deliverableKey },
          });

          if (existing) {
            await prisma.deliverable.update({
              where: { id: existing.id },
              data: {
                status: d.status || existing.status,
                responsibleParty: d.responsibleParty || existing.responsibleParty,
                fileUrl: d.fileUrl !== undefined ? d.fileUrl : existing.fileUrl,
                fileName: d.fileName !== undefined ? d.fileName : existing.fileName,
                fileSize: d.fileSize !== undefined ? d.fileSize : existing.fileSize,
                fileMimeType: d.fileMimeType !== undefined ? d.fileMimeType : existing.fileMimeType,
                metadataJson: d.metadataJson !== undefined ? d.metadataJson : existing.metadataJson,
              },
            });
          } else {
            await prisma.deliverable.create({
              data: {
                releaseId: params.id,
                deliverableKey: d.deliverableKey,
                name: d.name || 'Cover Artwork (Front)',
                responsibleParty: d.responsibleParty || 'Artist / agreed designer',
                status: d.status || 'Uploaded',
                fileUrl: d.fileUrl,
                fileName: d.fileName,
                fileSize: d.fileSize,
                fileMimeType: d.fileMimeType,
                metadataJson: d.metadataJson,
              },
            });
          }
        }
      }
    }

    // Handle budget items update if provided
    if (Array.isArray(body.budgetItems)) {
      const existingItems = await prisma.budgetItem.findMany({ where: { releaseId: params.id } });
      const existingMap = new Map(existingItems.map((item) => [item.expenseCategory, item]));

      await prisma.budgetItem.deleteMany({ where: { releaseId: params.id } });
      if (body.budgetItems.length > 0) {
        await prisma.budgetItem.createMany({
          data: body.budgetItems.map((b: any) => {
            const prev = existingMap.get(b.expenseCategory);
            // If admin is updating, they can set approvedAmount and approvalReference
            // If artist is updating, they set suggestedAmount, and existing approvedAmount is preserved
            const approvedAmount = isPhdAdmin(user.role) && b.approvedAmount !== undefined
              ? Number(b.approvedAmount) || 0
              : prev?.approvedAmount ?? (Number(b.approvedAmount) || 0);

            const approvalReference = isPhdAdmin(user.role) && b.approvalReference !== undefined
              ? b.approvalReference
              : prev?.approvalReference ?? b.approvalReference;

            const approvalStatus = isPhdAdmin(user.role) && b.approvalStatus !== undefined
              ? b.approvalStatus
              : prev?.approvalStatus ?? (b.suggestedAmount ? 'PENDING_REVIEW' : 'PENDING_REVIEW');

            return {
              releaseId: params.id,
              expenseCategory: b.expenseCategory,
              suggestedAmount: Number(b.suggestedAmount) || Number(b.approvedAmount) || 0,
              approvedAmount,
              actualAmount: Number(b.actualAmount) || 0,
              approvalReference,
              approvalStatus,
              reviewerNotes: b.reviewerNotes ?? prev?.reviewerNotes,
              invoiceReceiptDocUrl: b.invoiceReceiptDocUrl,
              isEligibleRecoupable: b.isEligibleRecoupable !== false,
              notes: b.notes,
            };
          }),
        });
      }
    }

    const updated = await prisma.release.update({
      where: { id: params.id },
      data: updateData,
      include: {
        tracks: { include: { contributors: true } },
        clearanceItems: true,
        deliverables: true,
        budgetItems: true,
      },
    });

    const readiness = evaluateReleaseReadiness(updated);
    await prisma.release.update({
      where: { id: params.id },
      data: { readinessScore: readiness.score },
    });

    await createAuditLog({
      releaseId: updated.id,
      userId: user.id,
      userEmail: user.email,
      action: 'RELEASE_UPDATED',
      entityType: 'Release',
      entityId: updated.id,
      newValue: updateData,
    });

    return NextResponse.json({ success: true, release: updated, readiness });
  } catch (err: any) {
    console.error('Failed to update release:', err);
    return NextResponse.json({ error: err.message || 'Failed to update release' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const release = await prisma.release.findUnique({ where: { id: params.id } });
    if (!release) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!isPhdAdmin(user.role) && release.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (release.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only draft releases can be deleted' }, { status: 400 });
    }

    await prisma.release.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'RELEASE_DELETED',
      entityType: 'Release',
      entityId: params.id,
      previousValue: { referenceNumber: release.referenceNumber, title: release.title },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

