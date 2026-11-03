import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateReleaseReferenceNumber } from '@/lib/reference';
import { CLEARANCE_CATEGORIES, DELIVERABLES_CONFIG } from '@/lib/constants';

export default async function NewReleasePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const referencePrefix = settings?.releaseReferencePrefix || 'PHD';
  const referenceNumber = await generateReleaseReferenceNumber(referencePrefix);

  const stageName = user.artistProfile?.stageName || user.name;

  const newRelease = await prisma.release.create({
    data: {
      referenceNumber,
      artistId: user.id,
      title: 'New Release Registration',
      releaseType: 'Single',
      primaryArtist: stageName,
      recordLabel: 'Independent / PHD Services',
      genre: 'Afrobeats',
      currency: 'NGN',
      status: 'DRAFT',
      clearanceItems: {
        create: CLEARANCE_CATEGORIES.map((cat) => ({
          category: cat.id,
          status: 'Pending',
          notes: `Schedule B Clearance: ${cat.label}`,
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
  });

  redirect(`/artist/releases/${newRelease.id}/edit`);
}

