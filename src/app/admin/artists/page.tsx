import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppLayout } from '@/components/AppLayout';
import { AdminArtistsConsole } from '@/components/AdminArtistsConsole';

export default async function AdminArtistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const artists = await prisma.user.findMany({
    where: { role: 'ARTIST' },
    include: {
      artistProfile: true,
      releases: {
        select: {
          id: true,
          title: true,
          referenceNumber: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <AppLayout user={user} breadcrumb="Artist Registry">
      <AdminArtistsConsole initialArtists={artists} />
    </AppLayout>
  );
}
