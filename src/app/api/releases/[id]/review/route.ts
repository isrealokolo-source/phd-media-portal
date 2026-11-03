import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin, canCountersign } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import {
  sendRevisionRequestEmail,
  sendReleaseExecutionEmail,
  sendReleaseOnHoldEmail,
  sendAdminExecutionNotificationEmail,
} from '@/lib/email';
import { generateScheduleAPdf, generateScheduleBPdf, generateCombinedSchedulesPdf } from '@/lib/pdf';
import crypto from 'crypto';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Only PHD personnel can perform review actions' }, { status: 403 });
    }

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

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action } = body; // 'COUNTERSIGN_EXECUTE' | 'REQUEST_REVISION' | 'PLACE_ON_HOLD' | 'REMOVE_HOLD'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const artistEmail = release.artist.email;
    const artistName = release.artist.artistProfile?.stageName || release.artist.name;

    // OPTION A: REQUEST REVISION
    if (action === 'REQUEST_REVISION') {
      const { comments, sections = ['release_info'], trackId } = body;
      if (!comments || !comments.trim()) {
        return NextResponse.json({ error: 'Revision feedback comments are required' }, { status: 400 });
      }

      const revReq = await prisma.$transaction(async (tx) => {
        const rr = await tx.revisionRequest.create({
          data: {
            releaseId: params.id,
            requestedByUserId: user.id,
            sectionKey: Array.isArray(sections) ? sections.join(', ') : sections,
            trackId,
            comments,
          },
        });

        await tx.review.create({
          data: {
            releaseId: params.id,
            reviewerUserId: user.id,
            reviewType: 'REVISION_REQUEST',
            notes: comments,
          },
        });

        await tx.release.update({
          where: { id: params.id },
          data: { status: 'REVISION_REQUESTED' },
        });

        return rr;
      });

      await createAuditLog({
        releaseId: release.id,
        userId: user.id,
        userEmail: user.email,
        action: 'REVISION_REQUESTED',
        entityType: 'Release',
        entityId: release.id,
        newValue: { comments, sections },
      });

      await sendRevisionRequestEmail({
        artistEmail,
        artistName,
        releaseTitle: release.title,
        referenceNumber: release.referenceNumber,
        comments,
        sections: Array.isArray(sections) ? sections : [sections],
        releaseId: release.id,
        appUrl,
      });

      return NextResponse.json({ success: true, message: 'Revision requested', revisionRequest: revReq });
    }

    // OPTION B: PLACE ON HOLD
    if (action === 'PLACE_ON_HOLD') {
      const { reason } = body;
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'Reason for placing release on hold is required' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.review.create({
          data: {
            releaseId: params.id,
            reviewerUserId: user.id,
            reviewType: 'HOLD',
            notes: reason,
          },
        });

        await tx.release.update({
          where: { id: params.id },
          data: {
            status: 'ON_HOLD',
            onHoldReason: reason,
          },
        });
      });

      await createAuditLog({
        releaseId: release.id,
        userId: user.id,
        userEmail: user.email,
        action: 'ON_HOLD',
        entityType: 'Release',
        entityId: release.id,
        newValue: { reason },
      });

      await sendReleaseOnHoldEmail({
        artistEmail,
        artistName,
        releaseTitle: release.title,
        referenceNumber: release.referenceNumber,
        reason,
        releaseId: release.id,
        appUrl,
      });

      return NextResponse.json({ success: true, message: 'Release placed on hold' });
    }

    // OPTION C: COUNTERSIGN AND EXECUTE
    if (action === 'COUNTERSIGN_EXECUTE') {
      if (!canCountersign(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden: Only Super Admin and Authorized Admin can countersign agreements' },
          { status: 403 }
        );
      }

      const { representativeName, position, signatureData, signatureType = 'DRAWN', confirmedInspection } = body;

      if (!representativeName || !representativeName.trim()) {
        return NextResponse.json({ error: 'Authorized representative name is required' }, { status: 400 });
      }
      if (!position || !position.trim()) {
        return NextResponse.json({ error: 'Representative position is required' }, { status: 400 });
      }
      if (!signatureData) {
        return NextResponse.json({ error: 'PHD signature is required' }, { status: 400 });
      }
      if (!confirmedInspection) {
        return NextResponse.json({ error: 'You must confirm inspection and statutory authority to execute' }, { status: 400 });
      }

      const executionTime = new Date();

      // Execute transaction
      const executed = await prisma.$transaction(async (tx) => {
        // 1. Store PHD Signature
        const sig = await tx.signature.create({
          data: {
            releaseId: params.id,
            scheduleType: 'SCHEDULE_A_AND_B',
            signerType: 'PHD_REPRESENTATIVE',
            signerUserId: user.id,
            signerLegalName: representativeName.trim(),
            signerPosition: position.trim(),
            signatureType,
            signatureData,
            ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
            userAgent: req.headers.get('user-agent') || 'Browser',
            signedAt: executionTime,
            documentHash: crypto.createHash('sha256').update(signatureData).digest('hex'),
          },
        });

        // 2. Mark release as FULLY_EXECUTED_APPROVED
        const updated = await tx.release.update({
          where: { id: params.id },
          data: {
            status: 'FULLY_EXECUTED_APPROVED',
            approvedAt: executionTime,
            executedAt: executionTime,
          },
          include: {
            artist: { include: { artistProfile: true } },
            tracks: { include: { contributors: true } },
            clearanceItems: true,
            deliverables: true,
            budgetItems: true,
            signatures: true,
          },
        });

        await tx.review.create({
          data: {
            releaseId: params.id,
            reviewerUserId: user.id,
            reviewType: 'APPROVAL',
            notes: `Countersigned and executed by ${representativeName} (${position}).`,
          },
        });

        return { updated, sig };
      });

      // 3. Generate official Schedule A, Schedule B and Combined PDFs
      const schedA = await generateScheduleAPdf(executed.updated);
      const schedB = await generateScheduleBPdf(executed.updated);
      const combined = await generateCombinedSchedulesPdf(executed.updated);

      // 4. Save executed documents in database
      const artistSig = executed.updated.signatures.find((s) => s.signerType === 'ARTIST');
      const phdSig = executed.updated.signatures.find((s) => s.signerType === 'PHD_REPRESENTATIVE');

      await prisma.executedDocument.createMany({
        data: [
          {
            releaseId: params.id,
            documentType: 'SCHEDULE_A',
            versionNumber: executed.updated.currentVersion,
            pdfFileUrl: schedA.fileUrl,
            documentHash: schedA.documentHash,
            artistSignerName: artistSig?.signerLegalName || artistName,
            phdSignerName: phdSig?.signerLegalName || representativeName,
            executedAt: executionTime,
          },
          {
            releaseId: params.id,
            documentType: 'SCHEDULE_B',
            versionNumber: executed.updated.currentVersion,
            pdfFileUrl: schedB.fileUrl,
            documentHash: schedB.documentHash,
            artistSignerName: artistSig?.signerLegalName || artistName,
            phdSignerName: phdSig?.signerLegalName || representativeName,
            executedAt: executionTime,
          },
          {
            releaseId: params.id,
            documentType: 'COMBINED',
            versionNumber: executed.updated.currentVersion,
            pdfFileUrl: combined.fileUrl,
            documentHash: combined.documentHash,
            artistSignerName: artistSig?.signerLegalName || artistName,
            phdSignerName: phdSig?.signerLegalName || representativeName,
            executedAt: executionTime,
          },
        ],
      });

      await createAuditLog({
        releaseId: release.id,
        userId: user.id,
        userEmail: user.email,
        action: 'FULLY_EXECUTED_APPROVED',
        entityType: 'Release',
        entityId: release.id,
        newValue: {
          representativeName,
          position,
          executedAt: executionTime,
          combinedHash: combined.documentHash,
        },
      });

      // 5. Notify Artist & Admin via Email
      const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
      const adminEmail = settings?.administrativeEmail || process.env.PHD_ADMIN_EMAIL || 'operations@phdservices.com';

      sendReleaseExecutionEmail({
        artistEmail,
        artistName,
        releaseTitle: release.title,
        referenceNumber: release.referenceNumber,
        plannedReleaseDate: release.plannedReleaseDate?.toLocaleDateString('en-GB'),
        tracks: release.tracks.map((t) => t.title),
        releaseId: release.id,
        appUrl,
      }).catch((err) => console.error('Failed to send artist execution email:', err));

      sendAdminExecutionNotificationEmail({
        adminEmail,
        representativeName,
        position,
        artistName,
        releaseTitle: release.title,
        referenceNumber: release.referenceNumber,
        documentHash: combined.documentHash,
        releaseId: release.id,
        appUrl,
      }).catch((err) => console.error('Failed to send admin execution email:', err));

      return NextResponse.json({
        success: true,
        message: 'Release approved and fully executed',
        release: executed.updated,
        documents: {
          scheduleA: schedA.fileUrl,
          scheduleB: schedB.fileUrl,
          combined: combined.fileUrl,
          hash: combined.documentHash,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
  } catch (err: any) {
    console.error('Review action failed:', err);
    return NextResponse.json({ error: err.message || 'Review action failed' }, { status: 500 });
  }
}

