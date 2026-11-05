'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Disc3,
  Users,
  FileCheck,
  Upload,
  DollarSign,
  PenTool,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowLeft,
  FileDown,
  ShieldCheck,
  Music,
  Eye,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ArtworkPreview } from '@/components/ArtworkPreview';
import { SignaturePad } from '@/components/SignaturePad';
import { RevenueSimulator } from '@/components/RevenueSimulator';
import { CLEARANCE_CATEGORIES, PENDING_CLEARANCE_WARNING } from '@/lib/constants';

interface AdminReviewConsoleProps {
  release: any;
  user: any;
  readiness: any;
  settings: any;
}

const REVIEW_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'release_info', label: 'Release Info' },
  { id: 'track_register', label: 'Track Register' },
  { id: 'ownership_contributors', label: 'Ownership & Splits' },
  { id: 'rights_clearance', label: 'Rights Clearances' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'budget', label: 'Budget & Recoupment' },
  { id: 'signatures', label: 'Signatures' },
  { id: 'audit', label: 'Audit History' },
];

export function AdminReviewConsole({
  release,
  user,
  readiness,
  settings,
}: AdminReviewConsoleProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showCountersignModal, setShowCountersignModal] = useState(false);

  // Revision Form State
  const [revisionComments, setRevisionComments] = useState('');
  const [revisionSection, setRevisionSection] = useState('rights_clearance');
  const [revisionTrackId, setRevisionTrackId] = useState<string>('');
  const [selectedRequestedDocs, setSelectedRequestedDocs] = useState<string[]>([]);

  // Hold Form State
  const [holdReason, setHoldReason] = useState('');

  // Countersign Form State
  const [repName, setRepName] = useState(
    settings?.defaultAuthorizedRep || user.name || 'Authorised Representative'
  );
  const [repPosition, setRepPosition] = useState(
    settings?.defaultRepPosition || 'Head of Legal & Business Affairs'
  );
  const [phdSignature, setPhdSignature] = useState('');
  const [phdSigType, setPhdSigType] = useState<'DRAWN' | 'TYPED'>('DRAWN');
  const [confirmedInspection, setConfirmedInspection] = useState(false);

  // Loading & error
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Budget Approval State (Reviewer Rate Controls)
  const [adminBudgetItems, setAdminBudgetItems] = useState<any[]>(
    release.budgetItems?.map((b: any) => ({
      ...b,
      suggestedAmount: b.suggestedAmount ?? b.approvedAmount ?? 0,
      approvedAmount: b.approvedAmount ?? 0,
      approvalReference: b.approvalReference || `PHD-APPR-${b.id?.slice(-4) || '01'}`,
      approvalStatus: b.approvalStatus || (b.approvedAmount > 0 ? 'APPROVED' : 'PENDING_REVIEW'),
      reviewerNotes: b.reviewerNotes || '',
    })) || []
  );
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSavedSuccess, setBudgetSavedSuccess] = useState(false);

  const handleSaveBudgetRates = async () => {
    setSavingBudget(true);
    setBudgetSavedSuccess(false);
    try {
      const res = await fetch(`/api/releases/${release.id}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: adminBudgetItems }),
      });
      const data = await res.json();
      if (data.success) {
        setBudgetSavedSuccess(true);
        setTimeout(() => setBudgetSavedSuccess(false), 4000);
        router.refresh();
      } else {
        alert(data.error || 'Failed to save approved budget rates');
      }
    } catch (err: any) {
      alert('Error updating budget rates: ' + err.message);
    } finally {
      setSavingBudget(false);
    }
  };

  const artwork = release.deliverables.find((d: any) => d.deliverableKey === 'cover_artwork');
  const isExecuted = release.status === 'FULLY_EXECUTED_APPROVED';

  // Request Revisions Action
  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_REVISION',
          comments: revisionComments,
          sections: [revisionSection],
          trackId: revisionTrackId || undefined,
          requestedDocuments: selectedRequestedDocs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revision request failed');
      setShowRevisionModal(false);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Place on Hold Action
  const handlePlaceOnHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PLACE_ON_HOLD',
          reason: holdReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hold request failed');
      setShowHoldModal(false);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Countersign & Execute Action
  const handleCountersign = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    if (!phdSignature) {
      setActionError('PHD digital signature is required');
      return;
    }
    if (!confirmedInspection) {
      setActionError('You must confirm inspection and statutory authority');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/releases/${release.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COUNTERSIGN_EXECUTE',
          representativeName: repName,
          position: repPosition,
          signatureData: phdSignature,
          signatureType: phdSigType,
          confirmedInspection,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Countersigning failed');
      setShowCountersignModal(false);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const artistSig = release.signatures?.find((s: any) => s.signerType === 'ARTIST');
  const phdSig = release.signatures?.find((s: any) => s.signerType === 'PHD_REPRESENTATIVE');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12151B] border border-[#1F2430]">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/admin"
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 mr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Submissions</span>
            </Link>
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
              {release.referenceNumber}
            </span>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                isExecuted
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : release.status === 'REVISION_REQUESTED'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-indigo-950 text-indigo-300 border-indigo-800'
              }`}
            >
              {release.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1.5">{release.title}</h1>
          <p className="text-xs text-zinc-400">
            Artist: {release.primaryArtist} • Submitted:{' '}
            {release.submittedAt ? new Date(release.submittedAt).toLocaleDateString('en-GB') : 'Draft'}
          </p>
        </div>

        {/* Action Controls for PHD Reviewer */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/releases/${release.id}/download?type=bundle`}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-semibold transition-colors shadow-sm"
            title="Download formatted cover art, all audio masters, and clearance PDFs (.ZIP)"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download Assets (.ZIP)</span>
          </a>

          {!isExecuted && (
            <>
              <button
                type="button"
                onClick={() => setShowHoldModal(true)}
                className="px-3 py-1.5 rounded-lg bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-300 border border-[#2A3142] text-xs font-medium transition-colors"
              >
                Place On Hold
              </button>

              <button
                type="button"
                onClick={() => setShowRevisionModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
              >
                Request Revisions
              </button>

              <button
                type="button"
                onClick={() => setShowCountersignModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-900/30"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Countersign & Execute</span>
              </button>
            </>
          )}

          {isExecuted && (
            <div className="flex items-center space-x-2">
              <a
                href={`/api/releases/${release.id}/pdf?type=combined`}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Executed Agreement PDF</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto border-b border-[#1F2430] pb-2 text-xs">
        {REVIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1F2B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Executive Review Summary</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-[#0E1015] rounded-xl border border-[#1F2430]">
                  <span className="text-zinc-500 block">Total Masters</span>
                  <span className="text-base font-bold font-mono text-zinc-100 mt-1 block">
                    {release.tracks.length} recording(s)
                  </span>
                </div>

                <div className="p-3 bg-[#0E1015] rounded-xl border border-[#1F2430]">
                  <span className="text-zinc-500 block">Clearance Health</span>
                  <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                    {release.clearanceItems.filter((c: any) => c.status === 'Obtained').length} /{' '}
                    {release.clearanceItems.length}
                  </span>
                </div>

                <div className="p-3 bg-[#0E1015] rounded-xl border border-[#1F2430]">
                  <span className="text-zinc-500 block">Readiness Score</span>
                  <span className="text-base font-bold font-mono text-indigo-400 mt-1 block">
                    {readiness.score}%
                  </span>
                </div>
              </div>

              {readiness.criticalBlockers.length > 0 && (
                <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>Identified Critical Blockers ({readiness.criticalBlockers.length})</span>
                  </span>
                  <ul className="text-xs text-zinc-300 list-disc pl-4 space-y-1">
                    {readiness.criticalBlockers.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {readiness.warnings.length > 0 && (
                <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Pending Items & Clearances ({readiness.warnings.length})</span>
                  </span>
                  <ul className="text-xs text-zinc-300 list-disc pl-4 space-y-1">
                    {readiness.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Quick Track Audio Inspection */}
            <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <Music className="w-4 h-4 text-indigo-400" />
                <span>Audio Master QA & Metadata Playback</span>
              </h3>

              <div className="space-y-3">
                {release.tracks.map((t: any) => (
                  <div key={t.id} className="space-y-2">
                    {t.audioFileUrl ? (
                      <AudioPlayer
                        url={t.audioFileUrl}
                        title={t.title}
                        sampleRate={t.audioSampleRate}
                        bitDepth={t.audioBitDepth}
                        channels={t.audioChannels}
                        isLossless={t.audioIsLossless}
                      />
                    ) : (
                      <div className="p-3 bg-[#0E1015] border border-[#1F2430] rounded-xl text-xs text-amber-400 flex items-center justify-between">
                        <span>{t.title} — No master audio file uploaded</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
                          Missing Master
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar: Artwork & Execution Data */}
          <div className="space-y-6">
            <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Cover Artwork Deliverable
                </h4>
                {artwork?.fileUrl && (
                  <a
                    href={`/api/releases/${release.id}/download?type=artwork`}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium"
                    title="Download clean formatted cover artwork"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>
              <ArtworkPreview url={artwork?.fileUrl} width={3000} height={3000} />
            </div>

            <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-5 space-y-3 text-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Signing Information
              </h4>
              <div className="p-3 bg-[#0E1015] rounded-xl border border-[#1F2430] space-y-1">
                <span className="text-zinc-500 text-[10px] block">Artist Signatory</span>
                <p className="font-semibold text-zinc-200">
                  {artistSig?.signerLegalName || 'Declared in Form'}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {artistSig?.signedAt ? new Date(artistSig.signedAt).toLocaleString('en-GB') : 'Pending'}
                </p>
              </div>

              <div className="p-3 bg-[#0E1015] rounded-xl border border-[#1F2430] space-y-1">
                <span className="text-zinc-500 text-[10px] block">PHD Signatory</span>
                <p className="font-semibold text-zinc-200">
                  {phdSig?.signerLegalName || (isExecuted ? 'Authorised Officer' : 'Not yet countersigned')}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {phdSig?.signerPosition || 'Head of Legal & Business Affairs'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RELEASE INFO */}
      {activeTab === 'release_info' && (
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-zinc-100">Schedule A – Part I: Release Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Release Title</span>
              <span className="text-zinc-100 font-medium">{release.title}</span>
            </div>
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Reference Number</span>
              <span className="font-mono text-indigo-400 font-bold">{release.referenceNumber}</span>
            </div>
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Release Type</span>
              <span className="text-zinc-100">{release.releaseType}</span>
            </div>
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Primary Artist</span>
              <span className="text-zinc-100">{release.primaryArtist}</span>
            </div>
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Featured Artists</span>
              <span className="text-zinc-100">{release.featuredArtists || 'None'}</span>
            </div>
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Genre / Subgenre</span>
              <span className="text-zinc-100">
                {release.genre} {release.subgenre ? `/ ${release.subgenre}` : ''}
              </span>
            </div>
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Territory</span>
              <span className="text-zinc-100">
                {release.territoryType === 'Worldwide' ? 'Worldwide' : release.territoryDetails}
              </span>
            </div>
            <div className="p-3 bg-[#0E1015] rounded-lg border border-[#1F2430]">
              <span className="text-zinc-500 block">Planned Release Date</span>
              <span className="font-mono text-zinc-100">
                {release.plannedReleaseDate
                  ? new Date(release.plannedReleaseDate).toLocaleDateString('en-GB')
                  : 'TBD'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRACK REGISTER */}
      {activeTab === 'track_register' && (
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-zinc-100">
            Schedule A – Part II: Master Recording Register ({release.tracks.length} tracks)
          </h3>

          <div className="space-y-4">
            {release.tracks.map((t: any) => (
              <div key={t.id} className="p-4 rounded-xl bg-[#0E1015] border border-[#1F2430] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-400">0{t.trackNumber}</span>
                    <span className="text-sm font-bold text-zinc-100">{t.title}</span>
                    {t.versionRemix && (
                      <span className="text-xs text-zinc-500">({t.versionRemix})</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2.5">
                    {t.audioFileUrl && (
                      <a
                        href={`/api/releases/${release.id}/download?type=track&trackId=${t.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#1A1F2B] hover:bg-[#252C3D] text-indigo-300 text-[11px] font-medium border border-[#2B3447] transition-colors"
                        title={`Download audio master for ${t.title}`}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download Master WAV</span>
                      </a>
                    )}
                    <span className="text-xs font-mono text-zinc-400">{t.duration || '03:20'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-[#1F2430]">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Producer</span>
                    <span className="text-zinc-200">{t.producerBeatmaker || 'Disclosed'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Songwriters</span>
                    <span className="text-zinc-200">{t.songwritersComposers || 'Disclosed'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Master Owner</span>
                    <span className="text-zinc-200">{t.masterOwnerLegalName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Ownership Share</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {t.masterOwnershipPercentage}%
                    </span>
                  </div>
                </div>

                {t.audioFileUrl && (
                  <AudioPlayer
                    url={t.audioFileUrl}
                    title={t.title}
                    sampleRate={t.audioSampleRate}
                    bitDepth={t.audioBitDepth}
                    channels={t.audioChannels}
                    isLossless={t.audioIsLossless}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. OWNERSHIP & CONTRIBUTORS */}
      {activeTab === 'ownership_contributors' && (
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-6">
          <div className="border-b border-[#1F2430] pb-3">
            <h3 className="text-sm font-bold text-zinc-100">
              Schedule B – Part III: Producer & Contributor Splits Register
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Strictly verify the legal distinction between Master ownership, songwriting shares, and producer fees.
            </p>
          </div>

          <div className="divide-y divide-[#1F2430] border border-[#1F2430] rounded-xl overflow-hidden bg-[#0E1015] text-xs">
            {release.tracks.flatMap((t: any) =>
              t.contributors.map((c: any, i: number) => (
                <div key={c.id || i} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-200">{c.contributorName}</span>
                    <p className="text-[11px] text-zinc-400">
                      Role: <strong className="text-indigo-400">{c.role}</strong> • Track: {t.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-200 font-medium">{c.feeRoyaltyShare || 'Agreed'}</span>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Ref: {c.rightsAgreementRef || 'On File'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. RIGHTS CLEARANCES (14 Categories) */}
      {activeTab === 'rights_clearance' && (
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-5">
          <div className="border-b border-[#1F2430] pb-3">
            <h3 className="text-sm font-bold text-zinc-100">
              Schedule B – Part II: 14-Point Statutory Rights Clearance Checklist
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{PENDING_CLEARANCE_WARNING}</p>
          </div>

          <div className="space-y-3">
            {release.clearanceItems.map((item: any, idx: number) => {
              const catDef = CLEARANCE_CATEGORIES.find((c) => c.id === item.category);
              const isObtained = item.status === 'Obtained';

              return (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl bg-[#0E1015] border border-[#1F2430] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-zinc-200">
                      {idx + 1}. {catDef?.label || item.category}
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Ref: {item.documentReference || 'No reference'} • Holder: {item.rightsHolder || 'None declared'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.supportingDocUrl && (
                      <a
                        href={`/api/releases/${release.id}/download?type=clearance&clearanceId=${item.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1A1F2B] hover:bg-[#252C3D] text-emerald-300 text-[11px] font-medium border border-emerald-900/40 transition-colors"
                        title="Download signed clearance agreement PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        isObtained
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. DELIVERABLES & ASSET DOWNLOAD CENTER */}
      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          {/* Admin Asset Download Hub */}
          <div className="bg-[#12151B] border border-indigo-900/50 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2430] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                  Production Asset Distribution
                </span>
                <h3 className="text-base font-bold text-white mt-0.5 flex items-center space-x-2">
                  <FileDown className="w-5 h-5 text-indigo-400" />
                  <span>Release Asset Archive & Audio Masters</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Download all release assets bundled into a structured ZIP file or download individual clean-named files.
                </p>
              </div>

              <a
                href={`/api/releases/${release.id}/download?type=bundle`}
                className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/40 flex-shrink-0"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Complete Archive (.ZIP)</span>
              </a>
            </div>

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cover Artwork Card */}
              <div className="p-4 bg-[#0E1015] border border-[#1F2430] rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-[#141820] border border-[#222836] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {artwork?.fileUrl ? (
                      <img src={artwork.fileUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Disc3 className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-100 block truncate">
                      Cover Artwork (3000×3000)
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono block">
                      {artwork?.fileUrl ? 'Standard DSP Square Artwork' : 'Not Uploaded'}
                    </span>
                  </div>
                </div>

                {artwork?.fileUrl && (
                  <a
                    href={`/api/releases/${release.id}/download?type=artwork`}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1F2B] hover:bg-[#252C3D] text-indigo-300 rounded-lg text-xs font-semibold border border-[#2B3447] transition-colors flex-shrink-0"
                    title="Download clean formatted cover artwork"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>

              {/* Master Audio Summary Card */}
              <div className="p-4 bg-[#0E1015] border border-[#1F2430] rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-indigo-950/60 border border-indigo-800/50 flex-shrink-0 flex items-center justify-center text-indigo-400">
                    <Music className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-100 block">
                      {release.tracks.length} Master Recording{release.tracks.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono block">
                      {release.tracks.filter((t: any) => t.audioFileUrl).length} of {release.tracks.length} master files ready
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/releases/${release.id}/download?type=bundle`}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1F2B] hover:bg-[#252C3D] text-indigo-300 rounded-lg text-xs font-semibold border border-[#2B3447] transition-colors flex-shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download All</span>
                </a>
              </div>
            </div>

            {/* Individual Audio Masters List */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Individual Audio Masters
              </span>
              <div className="divide-y divide-[#1F2430] border border-[#1F2430] rounded-xl bg-[#0E1015] overflow-hidden">
                {release.tracks.map((t: any, idx: number) => (
                  <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="font-mono text-indigo-400 font-bold w-6">0{t.trackNumber || idx + 1}</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-200 block truncate">{t.title}</span>
                        <span className="text-[11px] text-zinc-500 font-mono block">
                          {t.primaryArtist || release.primaryArtist} {t.isrc ? `• ISRC: ${t.isrc}` : ''}
                        </span>
                      </div>
                    </div>

                    {t.audioFileUrl ? (
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                          WAV / Lossless
                        </span>
                        <a
                          href={`/api/releases/${release.id}/download?type=track&trackId=${t.id}`}
                          className="flex items-center space-x-1 px-3 py-1 bg-[#1A1F2B] hover:bg-[#252C3D] text-indigo-300 rounded-lg text-xs font-medium border border-[#2B3447] transition-colors"
                          title={`Download master WAV for ${t.title}`}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Download Audio</span>
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-500 italic">No audio master uploaded</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Attached Signed Clearance Agreements List */}
            {release.clearanceItems.some((c: any) => c.supportingDocUrl) && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Signed Rights Clearance Agreements (PDF)
                </span>
                <div className="divide-y divide-[#1F2430] border border-[#1F2430] rounded-xl bg-[#0E1015] overflow-hidden">
                  {release.clearanceItems
                    .filter((c: any) => c.supportingDocUrl)
                    .map((c: any) => (
                      <div key={c.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-3 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-200 block truncate">{c.category}</span>
                            <span className="text-[11px] text-zinc-500 font-mono block">
                              Ref: {c.documentReference || 'N/A'} {c.rightsHolder ? `• Licensor: ${c.rightsHolder}` : ''}
                            </span>
                          </div>
                        </div>

                        <a
                          href={`/api/releases/${release.id}/download?type=clearance&clearanceId=${c.id}`}
                          className="flex items-center space-x-1 px-3 py-1 bg-[#1A1F2B] hover:bg-[#252C3D] text-emerald-300 rounded-lg text-xs font-medium border border-emerald-900/50 transition-colors flex-shrink-0"
                          title="Download signed PDF document"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule A – Part III Checklist */}
          <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">
              Schedule A – Part III: Deliverables Verification Checklist
            </h3>
            <div className="divide-y divide-[#1F2430] border border-[#1F2430] rounded-xl overflow-hidden bg-[#0E1015] text-xs">
              {release.deliverables.map((d: any) => (
                <div key={d.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-200">{d.name}</span>
                    <p className="text-[11px] text-zinc-500">Party: {d.responsibleParty}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        d.status === 'Approved'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : d.status === 'Uploaded'
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {d.status}
                    </span>
                    {d.fileUrl && (
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. BUDGET & RECOUPMENT */}
      {activeTab === 'budget' && (
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2430] pb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-indigo-400" />
                <span>Schedule A – Part IV: Reviewer Budget Rate Approval Console</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect each suggested budget figure submitted by the Artist and determine the approved rate and reference.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveBudgetRates}
              disabled={savingBudget}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/30 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingBudget ? 'Saving Rates...' : 'Save Approved Rates'}</span>
            </button>
          </div>

          {budgetSavedSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Approved budget rates successfully updated and locked in release register.</span>
            </div>
          )}

          {/* Budget Line Items */}
          <div className="space-y-4">
            {adminBudgetItems.map((b: any, idx: number) => (
              <div
                key={b.id || idx}
                className="p-4 rounded-xl bg-[#0E1015] border border-[#1F2430] space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2430] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-zinc-100">{b.expenseCategory}</span>
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                        b.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : b.approvalStatus === 'ADJUSTED'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : b.approvalStatus === 'REJECTED'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {b.approvalStatus || 'PENDING_REVIEW'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...adminBudgetItems];
                        updated[idx].approvedAmount = updated[idx].suggestedAmount;
                        updated[idx].approvalStatus = 'APPROVED';
                        setAdminBudgetItems(updated);
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/40 transition-colors"
                    >
                      Match Suggested ({release.currency} {Number(b.suggestedAmount || 0).toLocaleString()})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Artist Suggested (Read-only) */}
                  <div className="p-2.5 bg-[#12151B] rounded-lg border border-[#1F2430]">
                    <span className="text-[10px] text-zinc-500 block">Artist Suggested Budget</span>
                    <span className="font-mono text-zinc-200 font-semibold text-xs mt-0.5 block">
                      {release.currency} {Number(b.suggestedAmount ?? b.approvedAmount ?? 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Reviewer Approved Rate (Input) */}
                  <div>
                    <label className="block text-[10px] font-medium text-emerald-400 mb-1">
                      PHD Approved Rate ({release.currency}) *
                    </label>
                    <input
                      type="number"
                      value={b.approvedAmount || 0}
                      onChange={(e) => {
                        const updated = [...adminBudgetItems];
                        const val = Number(e.target.value);
                        updated[idx].approvedAmount = val;
                        if (val !== updated[idx].suggestedAmount && val > 0) {
                          updated[idx].approvalStatus = 'ADJUSTED';
                        } else if (val === updated[idx].suggestedAmount) {
                          updated[idx].approvalStatus = 'APPROVED';
                        }
                        setAdminBudgetItems(updated);
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#141820] border border-emerald-700/60 rounded text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Rate Decision / Status */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Approval Decision</label>
                    <select
                      value={b.approvalStatus || 'PENDING_REVIEW'}
                      onChange={(e) => {
                        const updated = [...adminBudgetItems];
                        updated[idx].approvalStatus = e.target.value;
                        if (e.target.value === 'REJECTED') {
                          updated[idx].approvedAmount = 0;
                        }
                        setAdminBudgetItems(updated);
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#141820] border border-[#262D3D] rounded text-zinc-200"
                    >
                      <option value="APPROVED">Approved in Full</option>
                      <option value="ADJUSTED">Adjusted / Capped Rate</option>
                      <option value="REJECTED">Disallowed / Rejected</option>
                      <option value="PENDING_REVIEW">Pending Review</option>
                    </select>
                  </div>

                  {/* Approval Reference */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Approval Reference</label>
                    <input
                      type="text"
                      value={b.approvalReference || ''}
                      onChange={(e) => {
                        const updated = [...adminBudgetItems];
                        updated[idx].approvalReference = e.target.value;
                        setAdminBudgetItems(updated);
                      }}
                      placeholder="e.g. PHD-APPR-01"
                      className="w-full px-2.5 py-1.5 bg-[#141820] border border-[#262D3D] rounded text-zinc-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      Reviewer Feedback / Conditions
                    </label>
                    <input
                      type="text"
                      value={b.reviewerNotes || ''}
                      onChange={(e) => {
                        const updated = [...adminBudgetItems];
                        updated[idx].reviewerNotes = e.target.value;
                        setAdminBudgetItems(updated);
                      }}
                      placeholder="e.g. Capped at standard mastering rate; receipts required"
                      className="w-full px-2.5 py-1.5 bg-[#141820] border border-[#262D3D] rounded text-zinc-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-4">
                    <label className="flex items-center space-x-2 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.isEligibleRecoupable !== false}
                        onChange={(e) => {
                          const updated = [...adminBudgetItems];
                          updated[idx].isEligibleRecoupable = e.target.checked;
                          setAdminBudgetItems(updated);
                        }}
                        className="accent-indigo-600 rounded"
                      />
                      <span>Eligible Recoupable Cost (70/30 Waterfall)</span>
                    </label>
                  </div>
                </div>

                {b.notes && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Artist Justification: "{b.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Real-time Simulator based on Reviewer's Approved Rates */}
          {(() => {
            const totalApprovedRecoupable = adminBudgetItems
              .filter((b: any) => b.isEligibleRecoupable)
              .reduce((acc: number, b: any) => acc + (Number(b.approvedAmount) || 0), 0);
            return (
              <RevenueSimulator
                currency={release.currency || 'NGN'}
                totalApprovedRecoupableCosts={totalApprovedRecoupable}
              />
            );
          })()}
        </div>
      )}

      {/* 8. SIGNATURES */}
      {activeTab === 'signatures' && (
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-zinc-100">Digital Execution Audit Records</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#0E1015] border border-[#1F2430] space-y-2">
              <span className="text-[10px] uppercase font-mono text-indigo-400 block font-bold">
                Artist Digital Signature
              </span>
              <p className="text-sm font-bold text-zinc-100">{artistSig?.signerLegalName || 'Declared'}</p>
              <p className="text-zinc-400">Position: Recording Artist / Master Owner</p>
              <p className="text-zinc-400">
                Timestamp: {artistSig?.signedAt ? new Date(artistSig.signedAt).toLocaleString('en-GB') : 'Pending'}
              </p>
              <p className="text-[10px] font-mono text-zinc-500 break-all">
                Hash: {artistSig?.documentHash || 'Verified snapshot'}
              </p>
              {artistSig?.signatureData && (
                <div className="p-2 bg-white rounded border mt-2 max-w-[200px]">
                  <img src={artistSig.signatureData} alt="Artist Signature" className="max-h-12 mx-auto" />
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#0E1015] border border-[#1F2430] space-y-2">
              <span className="text-[10px] uppercase font-mono text-emerald-400 block font-bold">
                PHD Representative Countersignature
              </span>
              <p className="text-sm font-bold text-zinc-100">
                {phdSig?.signerLegalName || (isExecuted ? 'Authorised Representative' : 'Awaiting Countersign')}
              </p>
              <p className="text-zinc-400">
                Position: {phdSig?.signerPosition || 'Head of Legal & Business Affairs'}
              </p>
              <p className="text-zinc-400">
                Timestamp: {phdSig?.signedAt ? new Date(phdSig.signedAt).toLocaleString('en-GB') : 'Pending'}
              </p>
              {phdSig?.signatureData && (
                <div className="p-2 bg-white rounded border mt-2 max-w-[200px]">
                  <img src={phdSig.signatureData} alt="PHD Signature" className="max-h-12 mx-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-zinc-100">Release Audit Trail</h3>
          <div className="divide-y divide-[#1F2430] text-xs">
            {release.auditLogs.map((log: any) => (
              <div key={log.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-zinc-200">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    User: {log.userEmail || 'System'} • Entity: {log.entityType} ({log.ipAddress})
                  </p>
                </div>
                <span className="text-zinc-500 font-mono text-[11px]">
                  {new Date(log.timestamp).toLocaleString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION MODAL A: REQUEST REVISION */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-amber-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Request Release Revisions</span>
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/40 rounded-lg text-xs text-rose-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleRequestRevision} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Relevant Section</label>
                <select
                  value={revisionSection}
                  onChange={(e) => setRevisionSection(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
                >
                  <option value="release_info">Release Information (Schedule A – Part I)</option>
                  <option value="track_register">Master Recording Register (Part II)</option>
                  <option value="ownership_contributors">Ownership & Split Percentages (Schedule B)</option>
                  <option value="rights_clearance">Rights Documentation Checklist (Schedule B)</option>
                  <option value="deliverables">Deliverables & Audio Masters (Part III)</option>
                  <option value="budget">Budget Ledger (Part IV)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Pick Specific Agreements & Documents to Request:
                </label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto p-2 bg-[#0E1015] border border-[#262D3D] rounded-lg">
                  {[
                    'Producer Split Sheet Agreement',
                    'Featured-Artist Consent / Release',
                    'Songwriter & Composer Split Agreement',
                    'Master Recording Assignment',
                    'Sample / Beat Clearance License',
                    'Cover Artwork (3000x3000px High-Res)',
                    'Lossless WAV Audio Master',
                    'Explicit Content Lyrics Declaration',
                  ].map((docName) => {
                    const isChecked = selectedRequestedDocs.includes(docName);
                    return (
                      <label
                        key={docName}
                        className={`flex items-center space-x-2 p-1.5 rounded cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-950/40 text-indigo-300' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRequestedDocs([...selectedRequestedDocs, docName]);
                            } else {
                              setSelectedRequestedDocs(selectedRequestedDocs.filter((d) => d !== docName));
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                        />
                        <span className="text-[11px] font-medium">{docName}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Selected documents will be clearly flagged on the artist&apos;s portal with download links for statutory templates.
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Specific Feedback / Required Corrections *
                </label>
                <textarea
                  required
                  rows={4}
                  value={revisionComments}
                  onChange={(e) => setRevisionComments(e.target.value)}
                  placeholder="Detail exact missing documentation, metadata errors or split percentage corrections required..."
                  className="w-full px-3.5 py-2.5 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
                />
              </div>

              <div className="pt-3 border-t border-[#1F2430] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 bg-[#1A1F2B] text-zinc-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg"
                >
                  {submittingAction ? 'Dispatching...' : 'Send Revision Request to Artist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTION MODAL B: PLACE ON HOLD */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-rose-400 flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4" />
              <span>Place Release On Hold</span>
            </h3>

            <form onSubmit={handlePlaceOnHold} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Reason for Administrative Hold *</label>
                <textarea
                  required
                  rows={3}
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="e.g. Legal dispute or pending trademark verification..."
                  className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
                />
              </div>

              <div className="pt-3 border-t border-[#1F2430] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowHoldModal(false)}
                  className="px-4 py-2 bg-[#1A1F2B] text-zinc-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
                >
                  {submittingAction ? 'Updating...' : 'Confirm Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTION MODAL C: COUNTERSIGN & EXECUTE */}
      {showCountersignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="border-b border-[#1F2430] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <PenTool className="w-4 h-4 text-indigo-400" />
                <span>PHD Countersignature & Legal Execution</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Execute Schedule A & B agreements for {release.referenceNumber}.
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/40 rounded-lg text-xs text-rose-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCountersign} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Authorized Representative Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Position / Office *</label>
                  <input
                    type="text"
                    required
                    value={repPosition}
                    onChange={(e) => setRepPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Representative Signature Pad *
                </label>
                <SignaturePad
                  initialName={repName}
                  onSignatureChange={(sig, type) => {
                    setPhdSignature(sig);
                    setPhdSigType(type);
                  }}
                />
              </div>

              <label className="flex items-start space-x-2.5 p-3 rounded-lg bg-[#0E1015] border border-[#1F2430] cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={confirmedInspection}
                  onChange={(e) => setConfirmedInspection(e.target.checked)}
                  className="mt-0.5 accent-indigo-600 rounded"
                />
                <span className="text-zinc-300 leading-relaxed font-medium">
                  I certify that I have inspected the release deliverables, rights documentation, and contributor splits, and am duly authorized to execute Schedules A & B on behalf of PHD Services.
                </span>
              </label>

              <div className="pt-3 border-t border-[#1F2430] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCountersignModal(false)}
                  className="px-4 py-2 bg-[#1A1F2B] text-zinc-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md shadow-indigo-900/30"
                >
                  {submittingAction ? 'Executing & Generating PDFs...' : 'Confirm Execution & Generate Signed PDFs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

