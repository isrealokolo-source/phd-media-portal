import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { Navbar } from '@/components/Navbar';
import { AdminReviewConsole } from '@/components/AdminReviewConsole';

export default async function AdminReviewPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: { include: { artistProfile: true } },
      tracks: {
        include: { contributors: true },
        orderBy: { trackNumber: 'asc' },
      },
      clearanceItems: {
        orderBy: { createdAt: 'asc' },
      },
      deliverables: {
        orderBy: { createdAt: 'asc' },
      },
      budgetItems: true,
      signatures: true,
      auditLogs: {
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!release) redirect('/admin');

  const readiness = evaluateReleaseReadiness(release);
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminReviewConsole
          release={release}
          user={user}
          readiness={readiness}
          settings={settings}
        />
      </main>
    </div>
  );
}

