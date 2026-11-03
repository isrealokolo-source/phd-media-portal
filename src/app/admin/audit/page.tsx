import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { Activity, Clock } from 'lucide-react';

export default async function AdminAuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="p-6 rounded-2xl bg-[#12151B] border border-[#1F2430]">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            System Compliance & Integrity
          </span>
          <h1 className="text-xl font-bold text-white mt-1">Audit Trail & Event Log</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable log of all user registrations, release submissions, digital signatures, approvals, and system events.
          </p>
        </div>

        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0E1015] border-b border-[#1F2430] text-zinc-400 uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2430]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#151922] transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">
                      {log.userEmail || 'System'}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 max-w-xs truncate font-mono text-[10px]">
                      {log.newValue || log.previousValue || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

