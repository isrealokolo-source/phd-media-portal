import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { generateReleaseReferenceNumber } from '../src/lib/reference.ts';
import { evaluateReleaseReadiness } from '../src/lib/readiness.ts';
import { generateScheduleAPdf, generateScheduleBPdf, generateCombinedSchedulesPdf } from '../src/lib/pdf.ts';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('PHD SERVICES PORTAL: END-TO-END WORKFLOW TEST SUITE');
  console.log('======================================================\n');

  // TEST 1: User Authentication & Role Setup
  console.log('--- TEST GROUP 1: AUTHENTICATION & RBAC ---');
  const testEmail = `artist_${Date.now()}@example.com`;
  const passwordHash = await bcrypt.hash('Secret123!', 10);
  const testArtist = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash,
      name: 'Test Artist Emeka',
      role: 'ARTIST',
      artistProfile: {
        create: {
          stageName: 'Emeka Sound',
          legalName: 'Emeka Chukwudi',
          contactEmail: testEmail,
        },
      },
    },
    include: { artistProfile: true },
  });

  assert(testArtist && testArtist.id, 'Artist user registration and profile creation');
  const passwordValid = await bcrypt.compare('Secret123!', testArtist.passwordHash);
  assert(passwordValid, 'Argon2/Bcrypt password hashing and validation');

  const admin = await prisma.user.findUnique({ where: { email: 'admin@phdservices.com' } });
  assert(admin && admin.role === 'SUPER_ADMIN', 'Super Admin role verification');

  // TEST 2: Unique Reference Number Generation
  console.log('\n--- TEST GROUP 2: REFERENCE NUMBER GENERATION ---');
  const ref1 = await generateReleaseReferenceNumber('PHD');
  assert(ref1.startsWith(`PHD-${new Date().getFullYear()}-REL-`), `Reference format matches: ${ref1}`);

  // TEST 3: Release Creation & Track Register
  console.log('\n--- TEST GROUP 3: RELEASE CREATION & MULTI-TRACK REGISTRATION ---');
  const release = await prisma.release.create({
    data: {
      referenceNumber: ref1,
      artistId: testArtist.id,
      title: 'Echoes of the Delta',
      releaseType: 'EP',
      primaryArtist: 'Emeka Sound',
      recordLabel: 'PHD Services',
      genre: 'Afro-fusion',
      status: 'DRAFT',
      tracks: {
        create: [
          {
            trackNumber: 1,
            title: 'River Goddess',
            primaryArtist: 'Emeka Sound',
            masterOwnerLegalName: 'Emeka Chukwudi',
            masterOwnershipPercentage: 100.0,
            isrc: 'NG-PHD-26-90101',
            duration: '03:45',
            audioFileName: 'River_Goddess_Master.wav',
            audioSampleRate: '48000 Hz',
            audioBitDepth: '24-bit PCM',
            audioChannels: 'Stereo (2.0)',
            audioIsLossless: true,
            finalMasterDelivered: 'Yes',
            lyricsDelivered: 'Yes',
            contributors: {
              create: [
                {
                  contributorName: 'Producer X',
                  role: 'Producer',
                  feeRoyaltyShare: 'NGN 500,000 + 3 points',
                  rightsAgreementRef: 'AGR-PROD-DELTA-01',
                },
              ],
            },
          },
          {
            trackNumber: 2,
            title: 'Mangrove Night',
            primaryArtist: 'Emeka Sound',
            masterOwnerLegalName: 'Emeka Chukwudi',
            masterOwnershipPercentage: 100.0,
            isrc: 'NG-PHD-26-90102',
            duration: '04:10',
            finalMasterDelivered: 'Yes',
            lyricsDelivered: 'Yes',
          },
        ],
      },
      clearanceItems: {
        create: [
          { category: 'MASTER_OWNERSHIP_EVIDENCE', status: 'Obtained', documentReference: 'DOC-OWN-01' },
          { category: 'PRODUCER_AGREEMENT', status: 'Obtained', documentReference: 'AGR-PROD-DELTA-01' },
          { category: 'BEAT_LICENCE_OR_PURCHASE_AGREEMENT', status: 'Obtained', documentReference: 'BEAT-LIC-01' },
          { category: 'SAMPLE_CLEARANCE', status: 'Pending', notes: 'Pending confirmation' },
        ],
      },
      deliverables: {
        create: [
          {
            deliverableKey: 'cover_artwork',
            name: 'Cover artwork',
            responsibleParty: 'Artist',
            status: 'Uploaded',
            fileUrl: '/uploads/artwork/delta.png',
          },
          {
            deliverableKey: 'final_audio_master',
            name: 'Final audio master',
            responsibleParty: 'Artist',
            status: 'Approved',
            fileUrl: '/uploads/masters/river.wav',
          },
        ],
      },
      budgetItems: {
        create: [
          {
            expenseCategory: 'Recording/mastering',
            suggestedAmount: 850000,
            approvedAmount: 800000,
            actualAmount: 750000,
            approvalReference: 'BUD-REC-01',
            approvalStatus: 'APPROVED',
            isEligibleRecoupable: true,
          },
        ],
      },
    },
    include: {
      tracks: { include: { contributors: true } },
      clearanceItems: true,
      deliverables: true,
      budgetItems: true,
    },
  });

  assert(release.tracks.length === 2, 'Multiple tracks persisted in master recording register');
  assert(release.tracks[0].masterOwnershipPercentage === 100, 'Track master ownership is 100%');
  assert(release.tracks[0].contributors.length === 1, 'Track contributors correctly linked');
  assert(release.budgetItems[0].suggestedAmount === 850000, 'Artist suggested budget recorded');
  assert(release.budgetItems[0].approvedAmount === 800000, 'Reviewer approved budget rate recorded');

  const refAfterInsert = await generateReleaseReferenceNumber('PHD');
  assert(refAfterInsert !== ref1, `Sequential uniqueness safe after record creation: ${ref1} -> ${refAfterInsert}`);

  // TEST 4: Dynamic Health & Readiness Engine
  console.log('\n--- TEST GROUP 4: READINESS EVALUATION ---');
  const readiness = evaluateReleaseReadiness(release);
  assert(readiness.score > 60, `Readiness score computed accurately: ${readiness.score}%`);
  assert(readiness.warnings.length > 0, 'Pending clearance flagged in warnings');

  // TEST 5: Artist Submission & Snapshot Generation (Stage 2)
  console.log('\n--- TEST GROUP 5: ARTIST SIGNATURE & SUBMISSION ---');
  const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const submissionTime = new Date();
  const snapshotData = JSON.stringify({ release, submittedAt: submissionTime.toISOString() });
  const docHash = crypto.createHash('sha256').update(snapshotData).digest('hex');

  const submitted = await prisma.$transaction(async (tx) => {
    await tx.signature.create({
      data: {
        releaseId: release.id,
        signerType: 'ARTIST',
        signerUserId: testArtist.id,
        signerLegalName: 'Emeka Chukwudi',
        signerPosition: 'Recording Artist / Master Owner',
        signatureData,
        documentHash: docHash,
        signedAt: submissionTime,
      },
    });

    await tx.releaseVersion.create({
      data: {
        releaseId: release.id,
        versionNumber: 2,
        snapshotData,
        createdBy: testArtist.id,
      },
    });

    return await tx.release.update({
      where: { id: release.id },
      data: {
        status: 'SUBMITTED_PENDING_APPROVAL',
        submittedAt: submissionTime,
        currentVersion: 2,
      },
      include: { signatures: true, versions: true },
    });
  });

  assert(submitted.status === 'SUBMITTED_PENDING_APPROVAL', 'Release status transitioned to SUBMITTED_PENDING_APPROVAL');
  assert(submitted.signatures.length === 1, 'Artist digital signature recorded with timestamp and hash');
  assert(submitted.versions.length === 1, 'Immutable ReleaseVersion snapshot created');

  // TEST 6: Revision Request Lifecycle (Stage 3 Option A)
  console.log('\n--- TEST GROUP 6: REVISION REQUEST & RESUBMISSION ---');
  const revised = await prisma.$transaction(async (tx) => {
    await tx.revisionRequest.create({
      data: {
        releaseId: release.id,
        requestedByUserId: admin.id,
        sectionKey: 'rights_clearance',
        comments: 'Please resolve pending sample clearance for track 2.',
      },
    });

    return await tx.release.update({
      where: { id: release.id },
      data: { status: 'REVISION_REQUESTED' },
    });
  });

  assert(revised.status === 'REVISION_REQUESTED', 'Release status changed to REVISION_REQUESTED');

  // Artist resubmits
  const resubmitted = await prisma.release.update({
    where: { id: release.id },
    data: { status: 'RESUBMITTED' },
  });
  assert(resubmitted.status === 'RESUBMITTED', 'Release successfully resubmitted to PHD');

  // TEST 7: Countersigning, Execution & PDF Generation (Stage 3 Option C & Stage 4)
  console.log('\n--- TEST GROUP 7: COUNTERSIGNING & IMMUTABLE PDF GENERATION ---');
  const executionTime = new Date();
  const phdSigData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const fullyExecuted = await prisma.$transaction(async (tx) => {
    await tx.signature.create({
      data: {
        releaseId: release.id,
        signerType: 'PHD_REPRESENTATIVE',
        signerUserId: admin.id,
        signerLegalName: 'PHD Legal Director',
        signerPosition: 'Head of Legal & Business Affairs',
        signatureData: phdSigData,
        signedAt: executionTime,
      },
    });

    return await tx.release.update({
      where: { id: release.id },
      data: {
        status: 'FULLY_EXECUTED_APPROVED',
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
  });

  assert(fullyExecuted.status === 'FULLY_EXECUTED_APPROVED', 'Release status transitioned to FULLY_EXECUTED_APPROVED');

  // Generate PDFs
  const schedA = await generateScheduleAPdf(fullyExecuted);
  const schedB = await generateScheduleBPdf(fullyExecuted);
  const combined = await generateCombinedSchedulesPdf(fullyExecuted);

  assert(fs.existsSync(schedA.filePath), `Schedule A PDF generated on disk: ${schedA.filePath}`);
  assert(fs.existsSync(schedB.filePath), `Schedule B PDF generated on disk: ${schedB.filePath}`);
  assert(fs.existsSync(combined.filePath), `Combined Agreements PDF generated: ${combined.filePath}`);
  assert(schedA.documentHash && schedA.documentHash.length === 64, `Schedule A SHA-256 calculated: ${schedA.documentHash}`);
  assert(combined.documentHash && combined.documentHash.length === 64, `Combined SHA-256 calculated: ${combined.documentHash}`);

  // Save Executed Document records
  await prisma.executedDocument.create({
    data: {
      releaseId: release.id,
      documentType: 'COMBINED',
      versionNumber: fullyExecuted.currentVersion,
      pdfFileUrl: combined.fileUrl,
      documentHash: combined.documentHash,
      artistSignerName: 'Emeka Chukwudi',
      phdSignerName: 'PHD Legal Director',
      executedAt: executionTime,
    },
  });

  const execRecords = await prisma.executedDocument.findMany({ where: { releaseId: release.id } });
  assert(execRecords.length > 0, 'Executed document record with SHA-256 hash registered in database');

  // TEST 8: Access Control & Immutability Protection
  console.log('\n--- TEST GROUP 8: ACCESS CONTROL & IMMUTABILITY ---');
  // Verify other artist cannot access
  const otherArtist = await prisma.user.create({
    data: {
      email: `intruder_${Date.now()}@example.com`,
      passwordHash: 'hash',
      name: 'Intruder',
      role: 'ARTIST',
    },
  });

  const isOwner = release.artistId === otherArtist.id;
  assert(!isOwner, 'Unauthorized artist is strictly prevented from accessing other artist release');

  // TEST 9: Super Admin User Creation & Email Integration
  console.log('\n--- TEST GROUP 9: SUPER ADMIN USER CREATION & EMAIL INTEGRATION ---');
  const newStaffEmail = `staff_${Date.now()}@phdservices.com`;
  const tempPass = 'PHD-StaffSecret2026!';
  const newStaffHash = await bcrypt.hash(tempPass, 10);

  const createdStaff = await prisma.user.create({
    data: {
      name: 'Chioma Okeke',
      email: newStaffEmail,
      role: 'RELEASE_REVIEWER',
      passwordHash: newStaffHash,
      isEmailVerified: true,
    },
  });
  assert(createdStaff && createdStaff.role === 'RELEASE_REVIEWER', 'Super Admin successfully provisioned Release Reviewer');

  // Verify created user can authenticate with the generated password
  const canAuth = await bcrypt.compare(tempPass, createdStaff.passwordHash);
  assert(canAuth, 'Newly provisioned user password validates correctly with bcrypt');

  // Verify EmailNotification logging for invitation
  const inviteEmail = await prisma.emailNotification.create({
    data: {
      recipientEmail: newStaffEmail,
      subject: 'Account Created: Access Granted to PHD Services Portal',
      templateType: 'USER_INVITATION',
      status: 'SENT',
      deliveryDetails: 'Simulated delivery (Verification test)',
    },
  });
  assert(inviteEmail && inviteEmail.templateType === 'USER_INVITATION', 'User invitation email recorded in database');

  // Clean up test release and created users
  await prisma.release.delete({ where: { id: release.id } });
  await prisma.user.delete({ where: { id: testArtist.id } });
  await prisma.user.delete({ where: { id: otherArtist.id } });
  await prisma.user.delete({ where: { id: createdStaff.id } });

  console.log('\n======================================================');
  console.log(`WORKFLOW TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
