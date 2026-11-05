import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppLayout } from '@/components/AppLayout';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ArtworkPreview } from '@/components/ArtworkPreview';
import { ReleaseTimeline } from '@/components/ReleaseTimeline';
import {
  FileDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Disc3,
  FileText,
  Music,
} from 'lucide-react';

export default async function ArtistReleaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      tracks: {
        include: { contributors: true },
        orderBy: { trackNumber: 'asc' },
      },
      clearanceItems: true,
      deliverables: true,
      budgetItems: true,
      signatures: true,
      executedDocuments: true,
      revisionRequests: {
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
    },
  });

  if (!release) redirect('/artist');
  if (user.role === 'ARTIST' && release.artistId !== user.id) redirect('/artist');

  const artwork = release.deliverables.find((d) => d.deliverableKey === 'cover_artwork');
  const isExecuted = release.status === 'FULLY_EXECUTED_APPROVED';
  const isRevisionRequested = release.status === 'REVISION_REQUESTED';
  const isDraft = release.status === 'DRAFT';

  const artistSig = release.signatures.find((s) => s.signerType === 'ARTIST');
  const phdSig = release.signatures.find((s) => s.signerType === 'PHD_REPRESENTATIVE');

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
    <AppLayout user={user} breadcrumb={`Releases / ${release.referenceNumber}`}>
      <div className="space-y-6 select-none">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/artist"
            className="flex items-center space-x-1.5 text-xs text-[#777777] hover:text-[#171717] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Releases Catalogue</span>
          </Link>

          <div className="flex items-center space-x-2">
            {!isExecuted && release.status !== 'SUBMITTED_PENDING_APPROVAL' && (
              <Link
                href={`/artist/releases/${release.id}/edit`}
                className="px-3.5 py-1.5 bg-[#171717] hover:bg-[#262626] text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                {isDraft ? 'Resume Editing' : 'Complete Revisions'}
              </Link>
            )}
          </div>
        </div>

        {/* Status Callout Banner */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-[#171717] bg-[#F4F4F2] px-2 py-0.5 rounded border border-[#E8E8E8]">
                  {release.referenceNumber}
                </span>
                {renderStatusBadge(release.status)}
              </div>
              <h1 className="text-2xl font-bold text-[#171717] mt-2">{release.title}</h1>
              <p className="text-xs text-[#777777] mt-1">
                {release.releaseType} • Primary Artist: <strong className="text-[#171717]">{release.primaryArtist}</strong>
              </p>
            </div>

            {/* Document & Production Asset Download Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/releases/${release.id}/download?type=bundle`}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                title="Download complete archive of cover art and master audio tracks"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Assets (.ZIP)</span>
              </a>

              {isExecuted && (
                <>
                  <a
                    href={`/api/releases/${release.id}/pdf?type=schedA`}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#F4F4F2] text-[#171717] rounded-md text-xs font-medium border border-[#E8E8E8] transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-[#777777]" />
                    <span>Schedule A PDF</span>
                  </a>
                  <a
                    href={`/api/releases/${release.id}/pdf?type=schedB`}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#F4F4F2] text-[#171717] rounded-md text-xs font-medium border border-[#E8E8E8] transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-[#777777]" />
                    <span>Schedule B PDF</span>
                  </a>
                  <a
                    href={`/api/releases/${release.id}/pdf?type=combined`}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#269568] hover:bg-[#1f7e57] text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Combined Agreement PDF</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Release Lifecycle Timeline */}
        <ReleaseTimeline
          status={release.status}
          createdAt={release.createdAt}
          submittedAt={release.submittedAt}
          executedAt={release.executedAt}
          onHoldReason={release.onHoldReason}
        />

        {/* Revision Feedback if Requested */}
        {isRevisionRequested && release.revisionRequests.length > 0 && (
          <div className="p-5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] space-y-3">
            <div className="flex items-center space-x-2 text-[#D69E36] font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Administrative Revision Feedback from PHD Services</span>
            </div>
            <p className="text-xs text-[#171717] whitespace-pre-line leading-relaxed">
              {release.revisionRequests[0].comments}
            </p>
            {release.revisionRequests[0].requestedDocuments && (
              <div className="pt-2 border-t border-[#FDE68A]">
                <span className="text-[11px] font-semibold text-[#D69E36] block mb-1.5">
                  Requested Split Agreements & Documents:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    try {
                      const docs = JSON.parse(release.revisionRequests[0].requestedDocuments);
                      return Array.isArray(docs)
                        ? docs.map((d: string) => (
                            <span
                              key={d}
                              className="px-2.5 py-1 rounded bg-white text-[#D69E36] border border-[#FDE68A] text-xs font-medium"
                            >
                              {d}
                            </span>
                          ))
                        : null;
                    } catch {
                      return (
                        <span className="text-xs text-[#D69E36]">
                          {release.revisionRequests[0].requestedDocuments}
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#777777]">
                Sections to revise: {release.revisionRequests[0].sectionKey}
              </span>
              <Link
                href={`/artist/releases/${release.id}/edit`}
                className="px-3 py-1.5 bg-[#171717] hover:bg-[#262626] text-white font-medium rounded-md text-xs transition-colors"
              >
                Open Editor & Complete Revisions
              </Link>
            </div>
          </div>
        )}

        {/* Release Metadata & Artwork */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                  Cover Artwork
                </h3>
                {artwork?.fileUrl && (
                  <a
                    href={`/api/releases/${release.id}/download?type=artwork`}
                    className="text-[11px] text-[#171717] hover:underline flex items-center space-x-1"
                    title="Download Cover Art"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>
              <ArtworkPreview url={artwork?.fileUrl} width={3000} height={3000} />
            </div>

            {/* Execution Signatures Card */}
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-5 space-y-3 text-xs shadow-sm">
              <h3 className="font-bold uppercase tracking-wider text-[#777777] text-[11px]">
                Execution Audit Records
              </h3>

              <div className="p-3 bg-[#F4F4F2] rounded-md border border-[#E8E8E8] space-y-1">
                <span className="text-[10px] text-[#777777] block uppercase font-mono">
                  Artist Execution
                </span>
                <span className="font-semibold text-[#171717]">
                  {artistSig?.signerLegalName || 'Declared in Form'}
                </span>
                <p className="text-[10px] text-[#777777]">
                  Signed: {artistSig?.signedAt ? new Date(artistSig.signedAt).toLocaleString('en-GB') : 'Pending'}
                </p>
                {artistSig?.documentHash && (
                  <p className="text-[9px] font-mono text-[#999999] truncate">
                    Hash: {artistSig.documentHash}
                  </p>
                )}
              </div>

              <div className="p-3 bg-[#F4F4F2] rounded-md border border-[#E8E8E8] space-y-1">
                <span className="text-[10px] text-[#777777] block uppercase font-mono">
                  PHD Representative
                </span>
                <span className="font-semibold text-[#171717]">
                  {phdSig?.signerLegalName || (isExecuted ? 'Authorised Representative' : 'Awaiting Countersign')}
                </span>
                <p className="text-[10px] text-[#777777]">
                  {phdSig?.signerPosition || 'Head of Legal & Business Affairs'}
                </p>
                {phdSig?.signedAt && (
                  <p className="text-[10px] text-[#269568] font-medium">
                    Executed: {new Date(phdSig.signedAt).toLocaleString('en-GB')}
                  </p>
                )}
              </div>
            </div>

            {/* Attached Rights Clearances Overview */}
            {release.clearanceItems.some((c) => c.supportingDocUrl) && (
              <div className="bg-white border border-[#E8E8E8] rounded-lg p-5 space-y-3 text-xs shadow-sm">
                <h3 className="font-bold uppercase tracking-wider text-[#777777] text-[11px] flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#269568]" />
                  <span>Executed Clearance Documents</span>
                </h3>

                <div className="space-y-2">
                  {release.clearanceItems
                    .filter((c) => c.supportingDocUrl)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-md bg-[#F4F4F2] border border-[#E8E8E8] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-[#171717] font-semibold block truncate">{c.category}</span>
                          <span className="text-[10px] text-[#777777] font-mono block">
                            Ref: {c.documentReference || 'N/A'}
                          </span>
                        </div>
                        <a
                          href={`/api/releases/${release.id}/download?type=clearance&clearanceId=${c.id}`}
                          className="px-2 py-1 rounded bg-white hover:bg-[#EAEAEA] text-[#269568] text-[11px] font-medium border border-[#A7F3D0] flex items-center space-x-1 flex-shrink-0 transition-colors"
                          title="Download PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Master Recordings & Audio Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                <h3 className="text-sm font-bold text-[#171717] flex items-center space-x-2">
                  <Disc3 className="w-4 h-4 text-[#171717]" />
                  <span>Master Recordings ({release.tracks.length})</span>
                </h3>

                <span className="text-xs font-mono text-[#777777]">
                  {release.tracks.filter((t) => t.audioFileUrl).length} of {release.tracks.length} audio masters ready
                </span>
              </div>

              <div className="space-y-4">
                {release.tracks.map((t) => (
                  <div key={t.id} className="p-4 rounded-md bg-[#F4F4F2] border border-[#E8E8E8] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#171717] mr-2">
                          0{t.trackNumber}
                        </span>
                        <span className="text-sm font-semibold text-[#171717]">{t.title}</span>
                        {t.versionRemix && (
                          <span className="text-xs text-[#777777] ml-1.5 font-mono">({t.versionRemix})</span>
                        )}
                        <div className="text-[11px] text-[#777777] mt-0.5">
                          <span>Primary: <strong className="text-[#171717]">{t.primaryArtist || release.primaryArtist}</strong></span>
                          {t.featuredArtists && (
                            <span className="ml-2">feat. <strong className="text-[#171717]">{t.featuredArtists}</strong></span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        {t.audioFileUrl && (
                          <a
                            href={`/api/releases/${release.id}/download?type=track&trackId=${t.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#EAEAEA] text-[#171717] text-[11px] font-medium border border-[#E8E8E8] transition-colors"
                            title={`Download master WAV for ${t.title}`}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Download WAV</span>
                          </a>
                        )}
                        <span className="text-xs font-mono text-[#777777]">{t.duration || '03:20'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-[#777777] pt-2 border-t border-[#E8E8E8]">
                      <div>
                        <span className="text-[#999999] block text-[10px]">Producer</span>
                        <span className="text-[#171717]">{t.producerBeatmaker || 'Disclosed'}</span>
                      </div>
                      <div>
                        <span className="text-[#999999] block text-[10px]">ISRC Code</span>
                        <span className="text-[#171717] font-mono">{t.isrc || 'Pending'}</span>
                      </div>
                      <div>
                        <span className="text-[#999999] block text-[10px]">Master Owner</span>
                        <span className="text-[#171717]">{t.masterOwnerLegalName || 'Artist'}</span>
                      </div>
                      <div>
                        <span className="text-[#999999] block text-[10px]">Ownership Share</span>
                        <span className="text-[#269568] font-bold font-mono">
                          {t.masterOwnershipPercentage}%
                        </span>
                      </div>
                    </div>

                    {t.lyricsText && (
                      <div className="p-3 bg-white border border-[#E8E8E8] rounded-md space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#777777] tracking-wider">Track Lyrics</span>
                        <p className="text-xs text-[#171717] whitespace-pre-line leading-relaxed font-sans max-h-36 overflow-y-auto pr-1">
                          {t.lyricsText}
                        </p>
                      </div>
                    )}

                    {t.audioFileUrl && (
                      <AudioPlayer
                        url={t.audioFileUrl}
                        downloadUrl={`/api/releases/${release.id}/download?type=track&trackId=${t.id}`}
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
