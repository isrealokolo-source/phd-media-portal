import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppLayout } from '@/components/AppLayout';
import { ReleaseWizard } from '@/components/ReleaseWizard';

export default async function EditReleasePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      tracks: {
        include: { contributors: true },
        orderBy: { trackNumber: 'asc' },
      },
      clearanceItems: true,
      deliverables: true,
      budgetItems: true,
      signatures: true,
      revisionRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!release) redirect('/artist');
  if (user.role === 'ARTIST' && release.artistId !== user.id) redirect('/artist');

  return (
    <AppLayout
      user={user}
      breadcrumb={`Release Registration / ${release.referenceNumber}`}
    >
      <ReleaseWizard initialRelease={release} user={user} />
    </AppLayout>
  );
}
