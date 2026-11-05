import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { ContractsConsole } from '@/components/ContractsConsole';

export default async function AdminContractsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const contracts = await prisma.artistContract.findMany({
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const claimedUserIds = contracts
    .map((c) => c.claimedByUserId)
    .filter(Boolean) as string[];

  const claimedUsers =
    claimedUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: claimedUserIds } },
          select: { id: true, name: true, email: true, createdAt: true },
        })
      : [];

  const userMap = new Map(claimedUsers.map((u) => [u.id, u]));

  const serializedContracts = contracts.map((c) => {
    const claimedUser = c.claimedByUserId ? userMap.get(c.claimedByUserId) || null : null;
    return {
      id: c.id,
      contractNumber: c.contractNumber,
      artistName: c.artistName,
      contractTitle: c.contractTitle,
      fileUrl: c.fileUrl,
      fileName: c.fileName,
      status: c.status,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
      uploadedBy: c.uploadedBy,
      claimedByUser: claimedUser
        ? {
            ...claimedUser,
            createdAt: claimedUser.createdAt.toISOString(),
          }
        : null,
    };
  });

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ContractsConsole initialContracts={serializedContracts} currentUser={user} />
      </main>
    </div>
  );
}
