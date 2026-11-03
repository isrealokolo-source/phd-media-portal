import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateReleaseReadiness } from '@/lib/readiness';
import { Navbar } from '@/components/Navbar';
import {
  PlusCircle,
  Disc3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default async function ArtistDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ARTIST') redirect('/admin');

  const releases = await prisma.release.findMany({
    where: { artistId: user.id },
    include: {
      tracks: true,
      deliverables: true,
      clearanceItems: true,
      executedDocuments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const enrichedReleases = releases.map((rel) => {
    const readiness = evaluateReleaseReadiness(rel);
    const artwork = rel.deliverables.find((d) => d.deliverableKey === 'cover_artwork');
    return {
      ...rel,
      readiness,
      artworkUrl: artwork?.fileUrl,
    };
  });

  const draftCount = enrichedReleases.filter((r) => r.status === 'DRAFT').length;
  const pendingCount = enrichedReleases.filter(
    (r) => r.status === 'SUBMITTED_PENDING_APPROVAL' || r.status === 'RESUBMITTED'
  ).length;
  const revisionCount = enrichedReleases.filter((r) => r.status === 'REVISION_REQUESTED').length;
  const approvedCount = enrichedReleases.filter((r) => r.status === 'FULLY_EXECUTED_APPROVED').length;

  const recentAudit = await prisma.auditLog.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { timestamp: 'desc' },
    take: 6,
  });

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#12151B] via-[#161B24] to-[#12151B] border border-[#1F2430]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-mono tracking-widest text-indigo-400">
                Artist Portal & Master Vault
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Welcome back, {user.artistProfile?.stageName || user.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Manage your release registrations, execute Schedule A & B agreements, and track legal clearance status.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/artist/releases/new"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-900/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Release</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#12151B] border border-[#1F2430]">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Draft Releases</span>
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono text-zinc-100 mt-2">{draftCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#12151B] border border-[#1F2430]">
            <div className="flex items-center justify-between text-indigo-400">
              <span className="text-xs font-medium">Pending PHD Approval</span>
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono text-indigo-300 mt-2">{pendingCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#12151B] border border-[#1F2430]">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-medium">Revision Requests</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono text-amber-300 mt-2">{revisionCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#12151B] border border-[#1F2430]">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-medium">Executed & Approved</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-300 mt-2">{approvedCount}</p>
          </div>
        </div>

        {/* Releases List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Your Release Registrations ({enrichedReleases.length})</span>
            </h2>
            <Link
              href="/artist/releases/new"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              + Create Release
            </Link>
          </div>

          {enrichedReleases.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-[#12151B] border border-dashed border-[#262D3D] space-y-4">
              <Disc3 className="w-12 h-12 text-zinc-600 mx-auto" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-300">No releases registered yet</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Start by registering a new single, EP or album to generate your Schedule A & B agreements.
                </p>
              </div>
              <Link
                href="/artist/releases/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Release</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrichedReleases.map((release) => {
                const isExecuted = release.status === 'FULLY_EXECUTED_APPROVED';
                const isLocked =
                  release.status === 'SUBMITTED_PENDING_APPROVAL' ||
                  release.status === 'RESUBMITTED' ||
                  isExecuted;

                return (
                  <div
                    key={release.id}
                    className="flex flex-col justify-between rounded-xl bg-[#12151B] border border-[#1F2430] hover:border-[#2E374A] transition-all p-5 shadow-lg group"
                  >
                    <div className="space-y-4">
                      {/* Top Bar with Artwork & Badge */}
                      <div className="flex items-start space-x-3.5">
                        <div className="w-16 h-16 rounded-lg bg-[#0E1015] border border-[#222836] overflow-hidden flex-shrink-0 flex items-center justify-center text-zinc-600">
                          {release.artworkUrl ? (
                            <img
                              src={release.artworkUrl}
                              alt={release.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Disc3 className="w-8 h-8 text-zinc-700" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                              {release.referenceNumber}
                            </span>
                            {release.isDemo && (
                              <span className="text-[9px] font-bold uppercase px-1 rounded bg-amber-950 text-amber-400 border border-amber-800">
                                DEMO
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-zinc-100 truncate mt-1 group-hover:text-indigo-300 transition-colors">
                            {release.title}
                          </h3>
                          <p className="text-xs text-zinc-400 truncate">
                            {release.releaseType} • {release.primaryArtist}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Details */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-[#1F2430]">
                        <div>
                          <span className="text-zinc-500 block">Tracks</span>
                          <span className="text-zinc-200 font-medium">
                            {release.tracks.length} recording(s)
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Planned Date</span>
                          <span className="text-zinc-200 font-medium">
                            {release.plannedReleaseDate
                              ? new Date(release.plannedReleaseDate).toLocaleDateString('en-GB')
                              : 'TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Status & Readiness */}
                      <div className="space-y-2 pt-2 border-t border-[#1F2430]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] text-zinc-500">Status</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              release.status === 'FULLY_EXECUTED_APPROVED'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : release.status === 'REVISION_REQUESTED'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : release.status === 'SUBMITTED_PENDING_APPROVAL' ||
                                  release.status === 'RESUBMITTED'
                                ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {release.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">Readiness Score</span>
                            <span className="font-mono font-bold text-indigo-400">
                              {release.readiness.score}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#0E1015] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${release.readiness.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-4 border-t border-[#1F2430] flex items-center justify-between">
                      <Link
                        href={`/artist/releases/${release.id}`}
                        className="text-xs text-zinc-300 hover:text-white flex items-center space-x-1"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {!isLocked ? (
                        <Link
                          href={`/artist/releases/${release.id}/edit`}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
                        >
                          Edit & Submit
                        </Link>
                      ) : isExecuted ? (
                        <Link
                          href={`/artist/releases/${release.id}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-xs font-medium"
                        >
                          Vault Documents
                        </Link>
                      ) : (
                        <span className="text-[11px] text-zinc-500 italic">Locked in Review</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        {recentAudit.length > 0 && (
          <div className="rounded-xl bg-[#12151B] border border-[#1F2430] p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Recent Activity Audit Trail</span>
            </h3>

            <div className="divide-y divide-[#1F2430] text-xs">
              {recentAudit.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-mono font-medium text-zinc-200">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <p className="text-[11px] text-zinc-500">
                      Entity: {log.entityType} • {log.ipAddress}
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {new Date(log.timestamp).toLocaleDateString('en-GB')}{' '}
                    {new Date(log.timestamp).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

