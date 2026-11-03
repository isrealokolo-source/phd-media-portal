import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { UserManagementConsole } from '@/components/UserManagementConsole';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      artistProfile: {
        select: {
          stageName: true,
          legalName: true,
          label: true,
          country: true,
          phone: true,
        },
      },
      _count: {
        select: {
          releases: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserManagementConsole currentUser={user} initialUsers={users as any} />
      </main>
    </div>
  );
}

