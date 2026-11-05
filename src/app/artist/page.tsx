import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { AppLayout } from '@/components/AppLayout';
import { ArtistDashboardConsole } from '@/components/ArtistDashboardConsole';

export default async function ArtistDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ARTIST') redirect('/admin');

  const releases = await prisma.release.findMany({
    where: { artistId: user.id },
    include: {
      tracks: true,
      deliverables: true,
      clearanceItems: true,
      executedDocuments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const enrichedReleases = releases.map((rel) => {
    const readiness = evaluateReleaseReadiness(rel);
    const artwork = rel.deliverables.find((d) => d.deliverableKey === 'cover_artwork');
    return {
      ...rel,
      readiness,
      artworkUrl: artwork?.fileUrl || null,
    };
  });

  return (
    <AppLayout
      user={user}
      breadcrumb="Releases Catalogue"
    >
      <ArtistDashboardConsole
        initialReleases={enrichedReleases}
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          artistProfile: user.artistProfile,
        }}
      />
    </AppLayout>
  );
}
