import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { createAuditLog } from '@/lib/audit';
import { sendArtistSubmissionEmail, sendArtistSubmissionReceiptEmail, sendReleaseResubmittedEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const release = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        tracks: { include: { contributors: true } },
        clearanceItems: true,
        deliverables: true,
        budgetItems: true,
      },
    });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    if (release.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (release.status !== 'DRAFT' && release.status !== 'REVISION_REQUESTED') {
      return NextResponse.json(
        { error: `Release cannot be submitted from status ${release.status}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { legalName, signatureData, signatureType = 'DRAWN', confirmDeclarations } = body;

    if (!legalName || !legalName.trim()) {
      return NextResponse.json({ error: 'Artist legal name is required for legal execution' }, { status: 400 });
    }

    if (!signatureData) {
      return NextResponse.json({ error: 'Digital signature is required' }, { status: 400 });
    }

    if (!confirmDeclarations) {
      return NextResponse.json({ error: 'You must confirm the statutory Schedule A & B declarations' }, { status: 400 });
    }

    // Evaluate readiness
    const readiness = evaluateReleaseReadiness(release);
    if (!readiness.submissionReady) {
      return NextResponse.json(
        {
          error: `Release is not submission ready: ${readiness.criticalBlockers.join(' • ')}`,
          criticalBlockers: readiness.criticalBlockers,
        },
        { status: 400 }
      );
    }

    const submissionTime = new Date();

    // Generate SHA-256 hash of the submission snapshot
    const snapshotPayload = {
      release,
      legalName,
      submittedBy: user.email,
      submittedAt: submissionTime.toISOString(),
    };
    const documentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(snapshotPayload))
      .digest('hex');

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete previous artist signatures if this is a resubmission
      await tx.signature.deleteMany({
        where: {
          releaseId: params.id,
          signerType: 'ARTIST',
        },
      });

      // 2. Create official artist digital signature record
      const signature = await tx.signature.create({
        data: {
          releaseId: params.id,
          scheduleType: 'SCHEDULE_A_AND_B',
          signerType: 'ARTIST',
          signerUserId: user.id,
          signerLegalName: legalName.trim(),
          signerPosition: 'Recording Artist / Master Owner',
          signatureType,
          signatureData,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Browser',
          signedAt: submissionTime,
          documentHash,
        },
      });

      // 3. Increment version and save immutable ReleaseVersion snapshot
      const newVersion = release.currentVersion + 1;
      await tx.releaseVersion.create({
        data: {
          releaseId: params.id,
          versionNumber: newVersion,
          snapshotData: JSON.stringify(snapshotPayload),
          createdBy: user.id,
        },
      });

      // 4. Update status to SUBMITTED_PENDING_APPROVAL (or RESUBMITTED)
      const newStatus = release.status === 'REVISION_REQUESTED' ? 'RESUBMITTED' : 'SUBMITTED_PENDING_APPROVAL';

      const updatedRelease = await tx.release.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          submittedAt: submissionTime,
          currentVersion: newVersion,
          readinessScore: readiness.score,
        },
        include: {
          tracks: true,
          clearanceItems: true,
          deliverables: true,
          signatures: true,
        },
      });

      return { updatedRelease, signature };
    });

    await createAuditLog({
      releaseId: release.id,
      userId: user.id,
      userEmail: user.email,
      action: release.status === 'REVISION_REQUESTED' ? 'RESUBMITTED' : 'SUBMITTED',
      entityType: 'Release',
      entityId: release.id,
      newValue: {
        status: result.updatedRelease.status,
        version: result.updatedRelease.currentVersion,
        documentHash,
      },
    });

    // Notify PHD and Artist through emails
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const adminEmail = settings?.administrativeEmail || process.env.PHD_ADMIN_EMAIL || 'israel@phantomdigital.com.ng';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://media.phantomdigital.com.ng';
    const artistName = user.artistProfile?.stageName || user.name;

    // 1. Send submission confirmation receipt to the Artist
    sendArtistSubmissionReceiptEmail({
      artistEmail: user.email,
      artistName,
      releaseTitle: release.title,
      referenceNumber: release.referenceNumber,
      trackCount: release.tracks.length,
      plannedReleaseDate: release.plannedReleaseDate?.toLocaleDateString('en-GB'),
      releaseId: release.id,
      appUrl,
    }).catch((err) => console.error('Failed to send artist receipt email:', err));

    // 2. Send review notification to PHD Administration
    if (release.status === 'REVISION_REQUESTED') {
      sendReleaseResubmittedEmail({
        adminEmail,
        artistName,
        releaseTitle: release.title,
        referenceNumber: release.referenceNumber,
        releaseId: release.id,
        appUrl,
      }).catch((err) => console.error('Failed to send resubmission email to admin:', err));
    } else {
      sendArtistSubmissionEmail({
        adminEmail,
        artistName,
        releaseTitle: release.title,
        referenceNumber: release.referenceNumber,
        plannedReleaseDate: release.plannedReleaseDate?.toLocaleDateString('en-GB'),
        trackCount: release.tracks.length,
        releaseId: release.id,
        appUrl,
      }).catch((err) => console.error('Failed to send submission email to admin:', err));
    }

    return NextResponse.json({
      success: true,
      release: result.updatedRelease,
      documentHash,
    });
  } catch (err: any) {
    console.error('Submission failed:', err);
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 });
  }
}

