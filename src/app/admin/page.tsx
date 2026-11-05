import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { AppLayout } from '@/components/AppLayout';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Search,
  Filter,
  Eye,
  ArrowRight,
  Disc3,
  Calendar,
  Users,
  UserPlus,
  ShieldAlert,
  FileDown,
} from 'lucide-react';

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const where: any = {};
  if (searchParams.status && searchParams.status !== 'ALL') {
    where.status = searchParams.status;
  }
  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { referenceNumber: { contains: searchParams.search, mode: 'insensitive' } },
      { primaryArtist: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  const allReleases = await prisma.release.findMany({
    include: {
      artist: { select: { name: true, email: true, artistProfile: true } },
      tracks: true,
      clearanceItems: true,
      deliverables: true,
      executedDocuments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalReleases = allReleases.length;
  const pendingReviews = allReleases.filter(
    (r) => r.status === 'SUBMITTED_PENDING_APPROVAL' || r.status === 'RESUBMITTED'
  ).length;
  const revisionAwaiting = allReleases.filter((r) => r.status === 'REVISION_REQUESTED').length;
  const fullyExecuted = allReleases.filter((r) => r.status === 'FULLY_EXECUTED_APPROVED').length;
  const onHold = allReleases.filter((r) => r.status === 'ON_HOLD').length;

  const filteredReleases = allReleases.filter((r) => {
    if (searchParams.status && searchParams.status !== 'ALL') {
      if (r.status !== searchParams.status) return false;
    }
    if (searchParams.search) {
      const q = searchParams.search.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchRef = r.referenceNumber.toLowerCase().includes(q);
      const matchArtist = r.primaryArtist.toLowerCase().includes(q);
      if (!matchTitle && !matchRef && !matchArtist) return false;
    }
    return true;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'FULLY_EXECUTED_APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#269568] border border-[#A7F3D0]">
            Executed
          </span>
        );
      case 'SUBMITTED_PENDING_APPROVAL':
      case 'RESUBMITTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            Pending Review
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#D69E36] border border-[#FDE68A]">
            Revision
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#D64B4B] border border-[#FECACA]">
            On Hold
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F4F4F2] text-[#777777] border border-[#E8E8E8]">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F4F4F2] text-[#777777] border border-[#E8E8E8]">
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <AppLayout user={user} breadcrumb="Submissions Queue">
      <div className="space-y-6 select-none">
        {/* Top Header Card */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
              Administrative & Legal Affairs
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-[#171717] mt-1">
              Release Submissions & Rights Review
            </h1>
            <p className="text-xs text-[#777777] mt-1 max-w-2xl leading-relaxed">
              Inspect submitted Schedule A & B master registers, audit contributor splits, review technical WAV deliverables, and execute countersignatures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`/api/admin/export/releases${searchParams.status ? `?status=${searchParams.status}` : ''}`}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#F4F4F2] text-[#171717] rounded-md text-xs font-medium border border-[#E8E8E8] transition-colors shadow-sm"
              title="Export release catalogue metadata to standard CSV"
            >
              <FileDown className="w-4 h-4 text-[#777777]" />
              <span>Export CSV</span>
            </a>

            {user.role === 'SUPER_ADMIN' && (
              <Link
                href="/admin/users?create=true"
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-md text-xs font-medium transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User</span>
              </Link>
            )}
          </div>
        </div>

        {/* Quantitative Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {[
            { label: 'Total Registered', count: totalReleases, desc: 'All releases' },
            { label: 'Pending Review', count: pendingReviews, desc: 'Awaiting action' },
            { label: 'Awaiting Revision', count: revisionAwaiting, desc: 'Returned to artist' },
            { label: 'Fully Executed', count: fullyExecuted, desc: 'Approved & live' },
            { label: 'On Hold', count: onHold, desc: 'Legal clearance pause' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-lg bg-white border border-[#E8E8E8] shadow-sm">
              <span className="text-[11px] text-[#777777] font-medium block">{stat.label}</span>
              <p className="text-2xl font-bold font-mono text-[#171717] mt-1">{stat.count}</p>
              <p className="text-[10px] text-[#999999] mt-0.5">{stat.desc}</p>
            </div>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white border border-[#E8E8E8] rounded-lg shadow-sm">
          <form className="relative flex-1 max-w-md" method="GET">
            <Search className="w-4 h-4 text-[#777777] absolute left-3 top-2.5" />
            <input
              type="text"
              name="search"
              defaultValue={searchParams.search || ''}
              placeholder="Search by title, reference (PHD-2026-REL-...) or artist..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#E8E8E8] rounded-md text-xs text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
            />
          </form>

          <div className="flex items-center space-x-1.5 text-xs overflow-x-auto pb-1 md:pb-0">
            <span className="text-[#777777] text-[11px] pr-1 hidden sm:inline">Status:</span>
            {[
              { key: 'ALL', label: 'All' },
              { key: 'SUBMITTED_PENDING_APPROVAL', label: 'Pending' },
              { key: 'REVISION_REQUESTED', label: 'Revision' },
              { key: 'FULLY_EXECUTED_APPROVED', label: 'Executed' },
              { key: 'ON_HOLD', label: 'On Hold' },
            ].map((f) => (
              <Link
                key={f.key}
                href={`/admin?status=${f.key}`}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  (searchParams.status || 'ALL') === f.key
                    ? 'bg-[#171717] text-white shadow-sm'
                    : 'bg-[#F4F4F2] text-[#777777] hover:text-[#171717] border border-[#E8E8E8]'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Professional Submissions Table */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F4F2] border-b border-[#E8E8E8] text-[#777777] uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Release Title</th>
                  <th className="py-3 px-4 font-semibold">Artist</th>
                  <th className="py-3 px-4 font-semibold">Planned Date</th>
                  <th className="py-3 px-4 font-semibold">Tracks</th>
                  <th className="py-3 px-4 font-semibold">Clearances</th>
                  <th className="py-3 px-4 font-semibold">Readiness</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E8]">
                {filteredReleases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#777777] text-xs">
                      No release submissions match your active filter.
                    </td>
                  </tr>
                ) : (
                  filteredReleases.map((release) => {
                    const readiness = evaluateReleaseReadiness(release);
                    const pendingClearances = release.clearanceItems.filter(
                      (c) => c.status === 'Pending'
                    ).length;

                    return (
                      <tr
                        key={release.id}
                        className="hover:bg-[#F4F4F2] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#171717]">
                          {release.referenceNumber}
                          {release.isDemo && (
                            <span className="ml-1 text-[8px] bg-[#F4F4F2] text-[#777777] px-1 py-0.5 rounded border border-[#E8E8E8] font-mono uppercase">
                              DEMO
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#171717]">
                          {release.title}
                        </td>
                        <td className="py-3.5 px-4 text-[#171717]">
                          {release.primaryArtist}
                        </td>
                        <td className="py-3.5 px-4 text-[#777777] font-mono">
                          {release.plannedReleaseDate
                            ? new Date(release.plannedReleaseDate).toLocaleDateString('en-GB')
                            : 'TBD'}
                        </td>
                        <td className="py-3.5 px-4 text-[#777777] font-mono">
                          {release.tracks.length} track(s)
                        </td>
                        <td className="py-3.5 px-4">
                          {pendingClearances === 0 ? (
                            <span className="text-[10px] font-medium text-[#269568] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                              All Cleared
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-[#D69E36] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                              {pendingClearances} Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-semibold text-[#171717]">
                              {readiness.score}%
                            </span>
                            <div className="w-12 h-1.5 bg-[#F4F4F2] rounded-full overflow-hidden border border-[#E8E8E8]">
                              <div
                                className="h-full bg-[#171717] rounded-full"
                                style={{ width: `${readiness.score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(release.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <a
                              href={`/api/releases/${release.id}/download?type=bundle`}
                              className="p-1.5 rounded-md bg-white hover:bg-[#EAEAEA] text-[#777777] hover:text-[#171717] border border-[#E8E8E8] transition-colors"
                              title="Download Master Assets (.ZIP)"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              href={`/admin/releases/${release.id}/review`}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-[#171717] hover:bg-[#262626] text-white rounded-md text-[11px] font-medium transition-colors shadow-sm"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
