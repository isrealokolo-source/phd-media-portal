import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppLayout } from '@/components/AppLayout';
import { SettingsForm } from '@/components/SettingsForm';

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'default' },
  });

  return (
    <AppLayout user={user} breadcrumb="Application Settings">
      <div className="max-w-4xl mx-auto space-y-6 select-none">
        <div className="p-6 sm:p-8 rounded-lg bg-white border border-[#E8E8E8] shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
            System Administration
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] mt-1">Application Configuration</h1>
          <p className="text-xs text-[#777777] mt-1">
            Configure PHD operational parameters, default legal representatives, reference number formats, and settlement currencies.
          </p>
        </div>

        <SettingsForm initialSettings={settings} />
      </div>
    </AppLayout>
  );
}
