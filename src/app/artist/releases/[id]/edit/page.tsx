import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
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
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReleaseWizard initialRelease={release} user={user} />
      </main>
    </div>
  );
}

