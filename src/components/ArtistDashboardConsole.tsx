'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Disc3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  Copy,
  Check,
  FileDown,
  CopyPlus,
  Trash2,
  ExternalLink,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface ReleaseItem {
  id: string;
  referenceNumber: string;
  title: string;
  releaseType: string;
  primaryArtist: string;
  recordLabel?: string | null;
  genre?: string | null;
  status: string;
  plannedReleaseDate?: string | Date | null;
  createdAt: string | Date;
  isDemo?: boolean;
  artworkUrl?: string | null;
  readiness: {
    score: number;
    submissionReady: boolean;
    criticalBlockers: string[];
    warnings: string[];
  };
  tracks: any[];
}

interface ArtistDashboardConsoleProps {
  initialReleases: ReleaseItem[];
  user: {
    id: string;
    name: string;
    email: string;
    artistProfile?: {
      stageName?: string | null;
    } | null;
  };
}

export function ArtistDashboardConsole({ initialReleases, user }: ArtistDashboardConsoleProps) {
  const router = useRouter();
  const [releases, setReleases] = useState<ReleaseItem[]>(initialReleases);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Modal / Action state
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [releaseToDelete, setReleaseToDelete] = useState<ReleaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Counts
  const draftCount = releases.filter((r) => r.status === 'DRAFT').length;
  const pendingCount = releases.filter(
    (r) => r.status === 'SUBMITTED_PENDING_APPROVAL' || r.status === 'RESUBMITTED'
  ).length;
  const revisionCount = releases.filter((r) => r.status === 'REVISION_REQUESTED').length;
  const approvedCount = releases.filter((r) => r.status === 'FULLY_EXECUTED_APPROVED').length;

  // Filtered releases
  const filteredReleases = releases.filter((rel) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PENDING') {
        if (rel.status !== 'SUBMITTED_PENDING_APPROVAL' && rel.status !== 'RESUBMITTED') return false;
      } else if (rel.status !== statusFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = rel.title.toLowerCase().includes(q);
      const matchRef = rel.referenceNumber.toLowerCase().includes(q);
      const matchArtist = rel.primaryArtist.toLowerCase().includes(q);
      const matchGenre = rel.genre?.toLowerCase().includes(q);
      const matchTracks = rel.tracks.some((t: any) => t.title?.toLowerCase().includes(q));
      if (!matchTitle && !matchRef && !matchArtist && !matchGenre && !matchTracks) return false;
    }

    return true;
  });

  const handleCopyRef = (refNum: string) => {
    navigator.clipboard.writeText(refNum);
    setCopiedRef(refNum);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleDuplicate = async (releaseId: string) => {
    setDuplicatingId(releaseId);
    setActionError('');
    try {
      const res = await fetch(`/api/releases/${releaseId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate release');

      // Refresh and navigate to newly created draft
      router.push(`/artist/releases/${data.release.id}/edit`);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || 'Duplication failed');
      setDuplicatingId(null);
    }
  };

  const handleDeleteDraft = async () => {
    if (!releaseToDelete) return;
    setIsDeleting(true);
    setActionError('');
    try {
      const res = await fetch(`/api/releases/${releaseToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete release draft');

      setReleases((prev) => prev.filter((r) => r.id !== releaseToDelete.id));
      setReleaseToDelete(null);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#12151B] via-[#161B24] to-[#12151B] border border-[#1F2430] shadow-xl">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-indigo-400">
            Artist Portal & Master Vault
          </span>
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

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className="text-rose-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Interactive Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Draft Releases', count: draftCount, filter: 'DRAFT', icon: FileText, color: 'text-zinc-400' },
          { label: 'Pending Approval', count: pendingCount, filter: 'PENDING', icon: Clock, color: 'text-indigo-400' },
          { label: 'Revision Requests', count: revisionCount, filter: 'REVISION_REQUESTED', icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Executed & Approved', count: approvedCount, filter: 'FULLY_EXECUTED_APPROVED', icon: CheckCircle2, color: 'text-emerald-400' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = statusFilter === item.filter;
          return (
            <button
              key={item.filter}
              type="button"
              onClick={() => setStatusFilter(isActive ? 'ALL' : item.filter)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-indigo-950/40 border-indigo-600/70 shadow-md shadow-indigo-950/40'
                  : 'bg-[#12151B] border-[#1F2430] hover:border-[#2F374A]'
              }`}
            >
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">{item.label}</span>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100 mt-2">{item.count}</p>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, reference, track, or genre..."
            className="w-full pl-10 pr-4 py-2 bg-[#12151B] border border-[#1F2430] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Releases' },
            { id: 'DRAFT', label: 'Drafts' },
            { id: 'PENDING', label: 'In Review' },
            { id: 'REVISION_REQUESTED', label: 'Revisions' },
            { id: 'FULLY_EXECUTED_APPROVED', label: 'Executed' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === pill.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#12151B] text-zinc-400 hover:text-zinc-200 border border-[#1F2430]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Releases Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>
              Your Releases ({filteredReleases.length}{releases.length !== filteredReleases.length ? ` of ${releases.length}` : ''})
            </span>
          </h2>
          {statusFilter !== 'ALL' || searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Reset Filters
            </button>
          ) : null}
        </div>

        {filteredReleases.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-[#12151B] border border-dashed border-[#262D3D] space-y-4">
            <Disc3 className="w-12 h-12 text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">No releases found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No releases match your current search or filter criteria.'
                  : 'Start by registering a new single, EP or album to generate your Schedule A & B agreements.'}
              </p>
            </div>
            {searchQuery || statusFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-200 text-xs font-medium"
              >
                <span>Clear Filters</span>
              </button>
            ) : (
              <Link
                href="/artist/releases/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Release</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReleases.map((release) => {
              const isExecuted = release.status === 'FULLY_EXECUTED_APPROVED';
              const isDraft = release.status === 'DRAFT';
              const isRevision = release.status === 'REVISION_REQUESTED';
              const isSubmitted =
                release.status === 'SUBMITTED_PENDING_APPROVAL' || release.status === 'RESUBMITTED';

              return (
                <div
                  key={release.id}
                  className="flex flex-col justify-between rounded-xl bg-[#12151B] border border-[#1F2430] hover:border-[#2E374A] transition-all p-5 shadow-lg group space-y-4"
                >
                  <div className="space-y-4">
                    {/* Top Bar with Artwork & Badge */}
                    <div className="flex items-start space-x-3.5">
                      <div className="w-16 h-16 rounded-lg bg-[#0E1015] border border-[#222836] overflow-hidden flex-shrink-0 flex items-center justify-center text-zinc-600 shadow-md">
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
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleCopyRef(release.referenceNumber)}
                            className="inline-flex items-center space-x-1 text-[10px] font-mono text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-800/40 transition-colors"
                            title="Click to copy Reference Number"
                          >
                            <span>{release.referenceNumber}</span>
                            {copiedRef === release.referenceNumber ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-zinc-500" />
                            )}
                          </button>
                          {release.isDemo && (
                            <span className="text-[9px] font-bold uppercase px-1 rounded bg-amber-950 text-amber-400 border border-amber-800">
                              DEMO
                            </span>
                          )}
                        </div>

                        <Link
                          href={isDraft || isRevision ? `/artist/releases/${release.id}/edit` : `/artist/releases/${release.id}`}
                          className="block mt-1"
                        >
                          <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
                            {release.title}
                          </h3>
                        </Link>
                        <p className="text-xs text-zinc-400 truncate">
                          {release.releaseType} • {release.primaryArtist}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-[#1F2430]">
                      <div>
                        <span className="text-zinc-500 block">Recordings</span>
                        <span className="text-zinc-200 font-medium">
                          {release.tracks.length} track(s)
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
                            isExecuted
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : isRevision
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : isSubmitted
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
                        <div className="w-full h-1.5 bg-[#0E1015] rounded-full overflow-hidden border border-[#1F2430]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              release.readiness.score >= 80
                                ? 'bg-emerald-500'
                                : release.readiness.score >= 50
                                ? 'bg-amber-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${release.readiness.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="pt-3 border-t border-[#1F2430] flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      {/* Asset Download */}
                      <a
                        href={`/api/releases/${release.id}/download?type=bundle`}
                        className="p-1.5 rounded-lg bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-300 hover:text-indigo-300 border border-[#252C3D] transition-colors"
                        title="Download Complete Assets (.ZIP)"
                      >
                        <FileDown className="w-4 h-4" />
                      </a>

                      {/* Duplicate Release */}
                      <button
                        type="button"
                        disabled={duplicatingId === release.id}
                        onClick={() => handleDuplicate(release.id)}
                        className="p-1.5 rounded-lg bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-300 hover:text-indigo-300 border border-[#252C3D] transition-colors disabled:opacity-50"
                        title="Duplicate as New Release Draft"
                      >
                        {duplicatingId === release.id ? (
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CopyPlus className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete Draft Button (Drafts Only) */}
                      {isDraft && (
                        <button
                          type="button"
                          onClick={() => setReleaseToDelete(release)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors"
                          title="Delete Draft Release"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <Link
                      href={
                        isDraft || isRevision
                          ? `/artist/releases/${release.id}/edit`
                          : `/artist/releases/${release.id}`
                      }
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isDraft || isRevision
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                          : 'bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-200 border border-[#2B3447]'
                      }`}
                    >
                      <span>{isDraft ? 'Resume Draft' : isRevision ? 'Complete Revision' : 'View Release'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE DRAFT CONFIRMATION MODAL */}
      {releaseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151B] border border-rose-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Draft Release</h3>
                <p className="text-xs text-rose-300/80">Permanent removal</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Are you sure you want to permanently discard the draft release for{' '}
              <strong className="text-white">"{releaseToDelete.title}"</strong> (
              <span className="font-mono text-zinc-400">{releaseToDelete.referenceNumber}</span>)?
              Any unsaved audio uploads and draft Schedule A configurations will be removed.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReleaseToDelete(null)}
                className="px-4 py-2 bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteDraft}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-950/50 flex items-center space-x-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
