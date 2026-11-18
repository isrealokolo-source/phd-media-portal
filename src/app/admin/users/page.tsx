import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppLayout } from '@/components/AppLayout';
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
    <AppLayout user={user} breadcrumb="Users & Access Controls">
      <Suspense fallback={<div className="p-8 text-xs text-[#777777]">Loading user management console...</div>}>
        <UserManagementConsole currentUser={user} initialUsers={users as any} />
      </Suspense>
    </AppLayout>
  );
}
