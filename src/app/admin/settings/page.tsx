import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { SettingsForm } from '@/components/SettingsForm';

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'default' },
  });

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="p-6 rounded-2xl bg-[#12151B] border border-[#1F2430]">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            System Administration
          </span>
          <h1 className="text-xl font-bold text-white mt-1">Application Configuration</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure PHD operational parameters, default legal representatives, reference number formats, and currencies.
          </p>
        </div>

        <SettingsForm initialSettings={settings} />
      </main>
    </div>
  );
}

