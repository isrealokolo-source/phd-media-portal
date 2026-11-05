import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
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
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminArtistsConsole initialArtists={artists} />
      </main>
    </div>
  );
}
