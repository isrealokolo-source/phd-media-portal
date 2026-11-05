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
  Download,
  Calendar,
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

  // Counts derived from actual database records
  const totalCount = releases.length;
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

  // Status Badge Helper using Swiss Functional Colors
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'FULLY_EXECUTED_APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#269568] border border-[#A7F3D0]">
            Approved & Executed
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
            Action Required
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
    <div className="space-y-8 select-none">
      {/* Top Editorial Welcome Header */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
            Artist Administration & Vault
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#171717] mt-1">
            {user.artistProfile?.stageName || user.name}
          </h1>
          <p className="text-xs text-[#777777] mt-1 max-w-xl leading-relaxed">
            Manage your master recording catalogue, monitor review milestones, execute statutory Schedule A & B agreements, and access cleared delivery assets.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/artist/releases/new"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-[#171717] hover:bg-[#262626] text-white font-medium text-xs transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Release</span>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#D64B4B] text-xs font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className="text-[#D64B4B] underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Quantitative Metric Cards (Swiss Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Catalog', count: totalCount, filter: 'ALL', icon: Disc3, desc: 'Registered releases' },
          { label: 'Pending Review', count: pendingCount, filter: 'PENDING', icon: Clock, desc: 'Awaiting execution' },
          { label: 'Action Required', count: revisionCount, filter: 'REVISION_REQUESTED', icon: AlertTriangle, desc: 'Revisions requested' },
          { label: 'Approved & Active', count: approvedCount, filter: 'FULLY_EXECUTED_APPROVED', icon: CheckCircle2, desc: 'Fully cleared' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = statusFilter === item.filter;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setStatusFilter(isActive ? 'ALL' : item.filter)}
              className={`p-5 rounded-lg border text-left transition-colors ${
                isActive
                  ? 'bg-white border-[#171717] ring-1 ring-[#171717] shadow-sm'
                  : 'bg-white border-[#E8E8E8] hover:border-[#777777]'
              }`}
            >
              <div className="flex items-center justify-between text-[#777777]">
                <span className="text-xs font-medium text-[#171717]">{item.label}</span>
                <Icon className="w-4 h-4 text-[#777777]" />
              </div>
              <p className="text-2xl font-bold font-mono text-[#171717] mt-2">{item.count}</p>
              <p className="text-[11px] text-[#999999] mt-0.5">{item.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalogue by title, reference, track, or genre..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E8E8E8] rounded-md text-xs text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
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
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === pill.id
                  ? 'bg-[#171717] text-white shadow-sm'
                  : 'bg-white text-[#777777] hover:text-[#171717] border border-[#E8E8E8]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Releases Catalogue Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-[#171717] flex items-center space-x-2">
            <span>Catalogue Records</span>
            <span className="text-xs font-mono font-normal text-[#777777]">
              ({filteredReleases.length}{releases.length !== filteredReleases.length ? ` of ${releases.length}` : ''})
            </span>
          </h2>
          {(statusFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-[#171717] underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredReleases.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-lg bg-white border border-dashed border-[#E8E8E8] space-y-4">
            <Disc3 className="w-10 h-10 text-[#999999] mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">No release records found</h3>
              <p className="text-xs text-[#777777] mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No releases match your current search criteria or active filter.'
                  : 'Start by registering a new single, EP, or album to generate legal documentation and track clearances.'}
              </p>
            </div>
            {searchQuery || statusFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#F4F4F2] hover:bg-[#EAEAEA] text-[#171717] text-xs font-medium border border-[#E8E8E8]"
              >
                <span>Clear Filters</span>
              </button>
            ) : (
              <Link
                href="/artist/releases/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-[#171717] hover:bg-[#262626] text-white text-xs font-medium"
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
              const editUrl = isDraft || isRevision ? `/artist/releases/${release.id}/edit` : `/artist/releases/${release.id}`;

              return (
                <div
                  key={release.id}
                  className="bg-white border border-[#E8E8E8] rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-[#777777] transition-colors shadow-sm"
                >
                  <div className="space-y-4">
                    {/* Top Row: Artwork + Title + Ref */}
                    <div className="flex items-start space-x-3.5">
                      <div className="w-16 h-16 rounded-md bg-[#F4F4F2] border border-[#E8E8E8] overflow-hidden flex-shrink-0 flex items-center justify-center text-[#777777]">
                        {release.artworkUrl ? (
                          <img
                            src={release.artworkUrl}
                            alt={release.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Disc3 className="w-8 h-8 text-[#999999]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleCopyRef(release.referenceNumber)}
                            className="inline-flex items-center space-x-1 text-[11px] font-mono text-[#171717] bg-[#F4F4F2] hover:bg-[#EAEAEA] px-2 py-0.5 rounded border border-[#E8E8E8] transition-colors"
                            title="Click to copy Reference Number"
                          >
                            <span>{release.referenceNumber}</span>
                            {copiedRef === release.referenceNumber ? (
                              <Check className="w-3 h-3 text-[#269568]" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#777777]" />
                            )}
                          </button>

                          {release.isDemo && (
                            <span className="text-[9px] font-mono uppercase px-1 rounded bg-[#F4F4F2] text-[#777777] border border-[#E8E8E8]">
                              DEMO
                            </span>
                          )}
                        </div>

                        <Link href={editUrl} className="block mt-1 group">
                          <h3 className="text-sm font-semibold text-[#171717] truncate group-hover:underline">
                            {release.title}
                          </h3>
                        </Link>
                        <p className="text-xs text-[#777777] truncate">
                          {release.releaseType} • {release.primaryArtist}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Overview */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#777777] pt-2 border-t border-[#E8E8E8]">
                      <div>
                        <span className="text-[#999999] block text-[10px]">Track Recordings</span>
                        <span className="text-[#171717] font-medium font-mono">
                          {release.tracks.length} track(s)
                        </span>
                      </div>
                      <div>
                        <span className="text-[#999999] block text-[10px]">Planned Release</span>
                        <span className="text-[#171717] font-medium font-mono">
                          {release.plannedReleaseDate
                            ? new Date(release.plannedReleaseDate).toLocaleDateString('en-GB')
                            : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Status & Readiness */}
                    <div className="space-y-2 pt-2 border-t border-[#E8E8E8]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[#777777]">Legal Status</span>
                        {renderStatusBadge(release.status)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#777777]">Submission Readiness</span>
                          <span className="font-mono font-semibold text-[#171717]">
                            {release.readiness.score}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#F4F4F2] rounded-full overflow-hidden border border-[#E8E8E8]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              release.readiness.score >= 80
                                ? 'bg-[#269568]'
                                : release.readiness.score >= 50
                                ? 'bg-[#D69E36]'
                                : 'bg-[#171717]'
                            }`}
                            style={{ width: `${release.readiness.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      {/* Bundle Download */}
                      <a
                        href={`/api/releases/${release.id}/download?type=bundle`}
                        className="p-1.5 rounded-md bg-white hover:bg-[#F4F4F2] text-[#777777] hover:text-[#171717] border border-[#E8E8E8] transition-colors"
                        title="Download Master Assets (.ZIP)"
                      >
                        <FileDown className="w-4 h-4" />
                      </a>

                      {/* Duplicate Draft */}
                      <button
                        type="button"
                        disabled={duplicatingId === release.id}
                        onClick={() => handleDuplicate(release.id)}
                        className="p-1.5 rounded-md bg-white hover:bg-[#F4F4F2] text-[#777777] hover:text-[#171717] border border-[#E8E8E8] transition-colors disabled:opacity-50"
                        title="Duplicate as New Draft"
                      >
                        {duplicatingId === release.id ? (
                          <div className="w-4 h-4 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CopyPlus className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete Draft Button (Drafts Only) */}
                      {isDraft && (
                        <button
                          type="button"
                          onClick={() => setReleaseToDelete(release)}
                          className="p-1.5 rounded-md text-[#777777] hover:text-[#D64B4B] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] transition-colors"
                          title="Delete Draft Release"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <Link
                      href={editUrl}
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isDraft || isRevision
                          ? 'bg-[#171717] hover:bg-[#262626] text-white shadow-sm'
                          : 'bg-white hover:bg-[#F4F4F2] text-[#171717] border border-[#E8E8E8]'
                      }`}
                    >
                      <span>{isDraft ? 'Resume Draft' : isRevision ? 'Complete Revision' : 'Inspect'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TYPE SHEETS & STANDARD AGREEMENTS (Prominent Position as Requested) */}
      <div id="agreements" className="bg-white border border-[#E8E8E8] rounded-lg p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E8E8E8] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
              Legal Documentation Library
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-[#171717] mt-0.5">
              Type Sheets & Standard Clearance Agreements
            </h2>
            <p className="text-xs text-[#777777] mt-0.5">
              Official PHD Services standardized contracts with pre-assigned reference codes. Download, execute with contributors, and submit under Step 3 Rights Clearances.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Producer Agreement',
              ref: 'PHD-DOC-AGR-001',
              desc: 'Master production rights assignment, producer royalty points, and beat clearance.',
              file: '/sample-documents/Producer-Agreement-Sample.pdf',
            },
            {
              title: 'Featured Artist Consent / Release',
              ref: 'PHD-DOC-FEAT-002',
              desc: 'Side-artist vocal clearance, name & likeness consent, and performance waivers.',
              file: '/sample-documents/Featured-Artist-Consent-Sample.pdf',
            },
            {
              title: 'Songwriter / Composer Split Sheet',
              ref: 'PHD-DOC-SPLIT-003',
              desc: 'Publishing and underlying musical composition share allocations among lyricists and composers.',
              file: '/sample-documents/Songwriter-Split-Agreement-Sample.pdf',
            },
          ].map((doc) => (
            <div
              key={doc.ref}
              className="p-4 rounded-md border border-[#E8E8E8] bg-[#F4F4F2] flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#777777] bg-white px-2 py-0.5 rounded border border-[#E8E8E8]">
                    {doc.ref}
                  </span>
                  <FileText className="w-4 h-4 text-[#777777]" />
                </div>
                <h3 className="text-xs font-semibold text-[#171717] mt-2">{doc.title}</h3>
                <p className="text-[11px] text-[#777777] mt-1 leading-relaxed">{doc.desc}</p>
              </div>

              <a
                href={doc.file}
                download
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample PDF</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* DELETE DRAFT CONFIRMATION MODAL */}
      {releaseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E8E8] rounded-lg w-full max-w-md p-6 shadow-modal relative">
            <div className="flex items-center space-x-3 text-[#D64B4B] mb-4">
              <div className="w-10 h-10 rounded-md bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#D64B4B]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#171717]">Delete Draft Release</h3>
                <p className="text-xs text-[#777777]">Permanent removal</p>
              </div>
            </div>

            <p className="text-xs text-[#777777] leading-relaxed mb-4">
              Are you sure you want to permanently discard the draft release for{' '}
              <strong className="text-[#171717]">"{releaseToDelete.title}"</strong> (
              <span className="font-mono text-[#171717]">{releaseToDelete.referenceNumber}</span>)?
              Any unsaved audio uploads and draft Schedule A configurations will be removed.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReleaseToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-[#F4F4F2] text-[#171717] border border-[#E8E8E8] rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteDraft}
                className="px-4 py-2 bg-[#D64B4B] hover:bg-[#b83b3b] text-white rounded-md text-xs font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50"
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
