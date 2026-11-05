import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { Navbar } from '@/components/Navbar';
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

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#12151B] via-[#151922] to-[#12151B] border border-[#1F2430]">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
              Executive Administration & Legal Affairs
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Release Submissions & Rights Clearance
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Inspect submitted Schedule A & B registers, verify contributor splits, review technical deliverables, and execute countersignatures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`/api/admin/export/releases${searchParams.status ? `?status=${searchParams.status}` : ''}`}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-800/60 transition-all shadow-sm"
              title="Export release catalogue metadata to standard CSV"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>Export Catalogue (.CSV)</span>
            </a>

            {user.role === 'SUPER_ADMIN' && (
              <Link
                href="/admin/users?create=true"
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-900/30"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User</span>
              </Link>
            )}
            <Link
              href="/admin/users"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-200 rounded-lg text-xs font-medium border border-[#2A3142] transition-colors"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Users & Team</span>
            </Link>
            <Link
              href="/admin/artists"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-200 rounded-lg text-xs font-medium border border-[#2A3142] transition-colors"
            >
              <Users className="w-4 h-4 text-zinc-400" />
              <span>Artist Registry</span>
            </Link>
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-[#12151B] border border-[#1F2430]">
            <span className="text-[11px] text-zinc-400 font-medium">Total Registered</span>
            <p className="text-2xl font-bold font-mono text-zinc-100 mt-1">{totalReleases}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#12151B] border border-indigo-900/40">
            <span className="text-[11px] text-indigo-400 font-medium">Pending Review</span>
            <p className="text-2xl font-bold font-mono text-indigo-300 mt-1">{pendingReviews}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#12151B] border border-amber-900/40">
            <span className="text-[11px] text-amber-400 font-medium">Awaiting Revision</span>
            <p className="text-2xl font-bold font-mono text-amber-300 mt-1">{revisionAwaiting}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#12151B] border border-emerald-900/40">
            <span className="text-[11px] text-emerald-400 font-medium">Fully Executed</span>
            <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{fullyExecuted}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#12151B] border border-rose-900/40">
            <span className="text-[11px] text-rose-400 font-medium">On Hold</span>
            <p className="text-2xl font-bold font-mono text-rose-300 mt-1">{onHold}</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#12151B] border border-[#1F2430]">
          <form className="relative flex-1 max-w-md" method="GET">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              name="search"
              defaultValue={searchParams.search || ''}
              placeholder="Search by title, reference (PHD-2026-REL-...) or artist..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-[#0E1015] border border-[#262D3D] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </form>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-zinc-500">Filter Status:</span>
            {[
              { key: 'ALL', label: 'All' },
              { key: 'SUBMITTED_PENDING_APPROVAL', label: 'Pending Approval' },
              { key: 'REVISION_REQUESTED', label: 'Revision' },
              { key: 'FULLY_EXECUTED_APPROVED', label: 'Executed' },
              { key: 'ON_HOLD', label: 'On Hold' },
            ].map((f) => (
              <Link
                key={f.key}
                href={`/admin?status=${f.key}`}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  (searchParams.status || 'ALL') === f.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#1A1F2B] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Submissions Management Table */}
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0E1015] border-b border-[#1F2430] text-zinc-400 uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Release Title</th>
                  <th className="py-3 px-4">Artist</th>
                  <th className="py-3 px-4">Planned Date</th>
                  <th className="py-3 px-4">Tracks</th>
                  <th className="py-3 px-4">Clearance Status</th>
                  <th className="py-3 px-4">Readiness</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2430]">
                {filteredReleases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500 text-xs">
                      No releases found matching the selected filters.
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
                        className="hover:bg-[#151922] transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                          {release.referenceNumber}
                          {release.isDemo && (
                            <span className="ml-1 text-[8px] bg-amber-950 text-amber-400 px-1 py-0.2 rounded border border-amber-800">
                              DEMO
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-100">
                          {release.title}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          {release.primaryArtist}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 font-mono">
                          {release.plannedReleaseDate
                            ? new Date(release.plannedReleaseDate).toLocaleDateString('en-GB')
                            : 'TBD'}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          {release.tracks.length} track(s)
                        </td>
                        <td className="py-3.5 px-4">
                          {pendingClearances === 0 ? (
                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                              All Assessed
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                              {pendingClearances} Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-zinc-200">
                              {readiness.score}%
                            </span>
                            <div className="w-12 h-1.5 bg-[#0E1015] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${readiness.score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              release.status === 'FULLY_EXECUTED_APPROVED'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : release.status === 'REVISION_REQUESTED'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : release.status === 'SUBMITTED_PENDING_APPROVAL' ||
                                  release.status === 'RESUBMITTED'
                                ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                : release.status === 'ON_HOLD'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {release.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <a
                              href={`/api/releases/${release.id}/download?type=bundle`}
                              className="p-1.5 rounded-lg bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-400 hover:text-indigo-300 border border-[#252C3D] transition-colors"
                              title="Download Assets Archive (.ZIP)"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              href={`/admin/releases/${release.id}/review`}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-[11px] font-medium border border-indigo-500/30 transition-all"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Review Console</span>
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
      </main>
    </div>
  );
}

