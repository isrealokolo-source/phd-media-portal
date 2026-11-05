import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppLayout } from '@/components/AppLayout';
import { Activity } from 'lucide-react';

export default async function AdminAuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return (
    <AppLayout user={user} breadcrumb="Audit Trail">
      <div className="space-y-6 select-none">
        <div className="p-6 sm:p-8 rounded-lg bg-white border border-[#E8E8E8] shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
            System Compliance & Integrity
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] mt-1">Audit Trail & Event Log</h1>
          <p className="text-xs text-[#777777] mt-1 max-w-xl">
            Immutable legal log of user registrations, release submissions, digital signatures, approvals, and system events.
          </p>
        </div>

        <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F4F2] border-b border-[#E8E8E8] text-[#777777] uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Entity</th>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                  <th className="py-3 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#777777] text-xs">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F4F4F2] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#777777] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#171717]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-[#777777] font-mono text-[11px]">
                        {log.entityType} ({log.entityId?.slice(0, 8)}...)
                      </td>
                      <td className="py-3 px-4 text-[#171717]">
                        {log.userEmail || log.userId || 'System'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#777777]">
                        {log.ipAddress || '—'}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-[11px] text-[#777777] font-mono">
                        {log.newValue || log.previousValue || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
