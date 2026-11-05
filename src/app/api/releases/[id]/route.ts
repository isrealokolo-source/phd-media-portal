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
      // 1. Fetch current database tracks for this release ordered by trackNumber
      const currentDbTracks = await prisma.track.findMany({
        where: { releaseId: params.id },
        orderBy: { trackNumber: 'asc' },
      });
      const currentDbTrackMap = new Map(currentDbTracks.map((t) => [t.id, t]));
      const matchedDbIds = new Set<string>();

      for (let i = 0; i < body.tracks.length; i++) {
        const trackData = body.tracks[i];
        const targetTrackNumber = trackData.trackNumber || (i + 1);

        // Match existing track by ID or by index position to prevent phantom duplicates
        let existingTrack: any = null;
        if (trackData.id && !trackData.id.startsWith('temp_') && currentDbTrackMap.has(trackData.id)) {
          existingTrack = currentDbTrackMap.get(trackData.id);
        } else if (i < currentDbTracks.length) {
          existingTrack = currentDbTracks[i];
        }

        const trackPayload = {
          trackNumber: targetTrackNumber,
          title: trackData.title || `Track ${targetTrackNumber}`,
          versionRemix: trackData.versionRemix || null,
          primaryArtist: trackData.primaryArtist || updateData.primaryArtist || currentRelease.primaryArtist,
          featuredArtists: trackData.featuredArtists || null,
          producerBeatmaker: trackData.producerBeatmaker || null,
          songwritersComposers: trackData.songwritersComposers || null,
          masterOwnerLegalName: trackData.masterOwnerLegalName || null,
          masterOwnershipPercentage: Number(trackData.masterOwnershipPercentage) || 100,
          isrc: trackData.isrc || null,
          recordingCompletionDate: trackData.recordingCompletionDate ? new Date(trackData.recordingCompletionDate) : null,
          explicitContent: Boolean(trackData.explicitContent),
          language: trackData.language || 'English',
          duration: trackData.duration || null,
          lyricsText: trackData.lyricsText || null,
          lyricsDelivered: trackData.lyricsDelivered || 'No',
          finalMasterDelivered: trackData.finalMasterDelivered || (trackData.audioFileUrl || existingTrack?.audioFileUrl ? 'Yes' : 'No'),
          artworkMetadataDelivered: trackData.artworkMetadataDelivered || 'No',
          rightsClearanceStatus: trackData.rightsClearanceStatus || 'Pending',
          existingLicenceOrRestriction: trackData.existingLicenceOrRestriction || null,
          audioFileUrl: trackData.audioFileUrl || existingTrack?.audioFileUrl || null,
          audioFileName: trackData.audioFileName || existingTrack?.audioFileName || null,
          audioFileSize: trackData.audioFileSize ?? existingTrack?.audioFileSize ?? null,
          audioSampleRate: trackData.audioSampleRate || existingTrack?.audioSampleRate || null,
          audioBitDepth: trackData.audioBitDepth || existingTrack?.audioBitDepth || null,
          audioChannels: trackData.audioChannels || existingTrack?.audioChannels || null,
          audioIsLossless: trackData.audioIsLossless ?? existingTrack?.audioIsLossless ?? null,
        };

        if (existingTrack) {
          matchedDbIds.add(existingTrack.id);
          await prisma.track.update({
            where: { id: existingTrack.id },
            data: trackPayload,
          });

          // Handle contributors if present
          if (Array.isArray(trackData.contributors)) {
            await prisma.trackContributor.deleteMany({ where: { trackId: existingTrack.id } });
            if (trackData.contributors.length > 0) {
              await prisma.trackContributor.createMany({
                data: trackData.contributors.map((c: any) => ({
                  trackId: existingTrack.id,
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
          // New track insertion
          const createdTrack = await prisma.track.create({
            data: {
              ...trackPayload,
              releaseId: params.id,
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
          matchedDbIds.add(createdTrack.id);
        }
      }

      // 3. Delete any tracks removed by artist
      const excessDbTracks = currentDbTracks.filter((t) => !matchedDbIds.has(t.id));
      if (excessDbTracks.length > 0) {
        await prisma.track.deleteMany({
          where: { id: { in: excessDbTracks.map((t) => t.id) } },
        });
      }
    }

    // Handle clearance items update if provided
    if (Array.isArray(body.clearanceItems)) {
      for (const item of body.clearanceItems) {
        const itemData = {
          status: item.status,
          documentReference: item.documentReference,
          supportingDocUrl: item.supportingDocUrl,
          notes: item.notes,
          rightsHolder: item.rightsHolder,
          dateReceived: item.dateReceived ? new Date(item.dateReceived) : null,
          reviewStatus: item.reviewStatus,
          reviewNotes: item.reviewNotes,
        };

        if (item.id && !String(item.id).startsWith('temp_')) {
          const exists = await prisma.clearanceItem.findUnique({ where: { id: item.id } });
          if (exists) {
            await prisma.clearanceItem.update({
              where: { id: item.id },
              data: itemData,
            });
            continue;
          }
        }

        // Fallback: match by releaseId and category
        if (item.category) {
          const existingCat = await prisma.clearanceItem.findFirst({
            where: { releaseId: params.id, category: item.category },
          });
          if (existingCat) {
            await prisma.clearanceItem.update({
              where: { id: existingCat.id },
              data: itemData,
            });
          } else {
            await prisma.clearanceItem.create({
              data: {
                releaseId: params.id,
                category: item.category,
                ...itemData,
              },
            });
          }
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
      const existingById = new Map(existingItems.map((item) => [item.id, item]));
      const existingByCat = new Map(existingItems.map((item) => [item.expenseCategory, item]));

      await prisma.budgetItem.deleteMany({ where: { releaseId: params.id } });
      if (body.budgetItems.length > 0) {
        await prisma.budgetItem.createMany({
          data: body.budgetItems.map((b: any) => {
            const prev = (b.id && existingById.get(b.id)) || existingByCat.get(b.expenseCategory);
            // If admin is updating, they can set approvedAmount and approvalReference
            // If artist is updating, they set suggestedAmount, and existing approvedAmount is preserved
            const approvedAmount = isPhdAdmin(user.role) && b.approvedAmount !== undefined
              ? Number(b.approvedAmount) || 0
              : prev?.approvedAmount ?? (b.approvedAmount !== undefined ? Number(b.approvedAmount) || 0 : 0);

            const approvalReference = isPhdAdmin(user.role) && b.approvalReference !== undefined
              ? b.approvalReference
              : prev?.approvalReference ?? b.approvalReference;

            const approvalStatus = isPhdAdmin(user.role) && b.approvalStatus !== undefined
              ? b.approvalStatus
              : prev?.approvalStatus ?? 'PENDING_REVIEW';

            const suggestedAmount = b.suggestedAmount !== undefined
              ? Number(b.suggestedAmount) || 0
              : (prev?.suggestedAmount ?? (Number(b.approvedAmount) || 0));

            return {
              releaseId: params.id,
              expenseCategory: b.expenseCategory,
              suggestedAmount,
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
        tracks: {
          include: { contributors: true },
          orderBy: { trackNumber: 'asc' },
        },
        clearanceItems: {
          orderBy: { createdAt: 'asc' },
        },
        deliverables: {
          orderBy: { id: 'asc' },
        },
        budgetItems: {
          orderBy: { id: 'asc' },
        },
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

    if (user.role !== 'SUPER_ADMIN' && release.status !== 'DRAFT') {
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

