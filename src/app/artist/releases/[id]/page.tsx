import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ArtworkPreview } from '@/components/ArtworkPreview';
import {
  FileDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  PenTool,
  Layers,
  ShieldCheck,
  Disc3,
  Hash,
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

  const artistSig = release.signatures.find((s) => s.signerType === 'ARTIST');
  const phdSig = release.signatures.find((s) => s.signerType === 'PHD_REPRESENTATIVE');

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/artist"
            className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {!isExecuted && release.status !== 'SUBMITTED_PENDING_APPROVAL' && (
            <Link
              href={`/artist/releases/${release.id}/edit`}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
            >
              Resume Editing
            </Link>
          )}
        </div>

        {/* Status Callout Banner */}
        <div
          className={`p-6 rounded-2xl border ${
            isExecuted
              ? 'bg-emerald-950/20 border-emerald-800/40'
              : isRevisionRequested
              ? 'bg-amber-950/20 border-amber-800/40'
              : 'bg-[#12151B] border-[#1F2430]'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  {release.referenceNumber}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    isExecuted
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : isRevisionRequested
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                  }`}
                >
                  {release.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-2">{release.title}</h1>
              <p className="text-xs text-zinc-400 mt-1">
                {release.releaseType} • Primary Artist: {release.primaryArtist}
              </p>
            </div>

            {/* Document Download Actions if Executed */}
            {isExecuted && (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/releases/${release.id}/pdf?type=schedA`}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-200 rounded-lg text-xs font-medium border border-[#2A3142] transition-colors"
                >
                  <FileDown className="w-4 h-4 text-indigo-400" />
                  <span>Download Schedule A PDF</span>
                </a>
                <a
                  href={`/api/releases/${release.id}/pdf?type=schedB`}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-200 rounded-lg text-xs font-medium border border-[#2A3142] transition-colors"
                >
                  <FileDown className="w-4 h-4 text-indigo-400" />
                  <span>Download Schedule B PDF</span>
                </a>
                <a
                  href={`/api/releases/${release.id}/pdf?type=combined`}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-900/30"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Combined Agreement PDF</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Revision Feedback if Requested */}
        {isRevisionRequested && release.revisionRequests.length > 0 && (
          <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-3">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Administrative Revision Feedback from PHD Services</span>
            </div>
            <p className="text-xs text-zinc-200 whitespace-pre-line leading-relaxed">
              {release.revisionRequests[0].comments}
            </p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                Sections to revise: {release.revisionRequests[0].sectionKey}
              </span>
              <Link
                href={`/artist/releases/${release.id}/edit`}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-lg text-xs"
              >
                Open Editor & Make Revisions
              </Link>
            </div>
          </div>
        )}

        {/* Release Metadata & Artwork */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Cover Artwork
              </h3>
              <ArtworkPreview url={artwork?.fileUrl} width={3000} height={3000} />
            </div>

            {/* Execution Signatures Card */}
            <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-5 space-y-3 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-zinc-400 text-[11px]">
                Execution Audit Records
              </h3>

              <div className="p-3 bg-[#0E1015] rounded-xl border border-[#1F2430] space-y-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">
                  Artist Execution
                </span>
                <span className="font-semibold text-zinc-200">
                  {artistSig?.signerLegalName || 'Declared in Form'}
                </span>
                <p className="text-[10px] text-zinc-400">
                  Signed: {artistSig?.signedAt ? new Date(artistSig.signedAt).toLocaleString('en-GB') : 'Pending'}
                </p>
                {artistSig?.documentHash && (
                  <p className="text-[9px] font-mono text-zinc-500 truncate">
                    Hash: {artistSig.documentHash}
                  </p>
                )}
              </div>

              <div className="p-3 bg-[#0E1015] rounded-xl border border-[#1F2430] space-y-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">
                  PHD Representative
                </span>
                <span className="font-semibold text-zinc-200">
                  {phdSig?.signerLegalName || (isExecuted ? 'Authorised Representative' : 'Awaiting Countersign')}
                </span>
                <p className="text-[10px] text-zinc-400">
                  {phdSig?.signerPosition || 'Head of Legal & Business Affairs'}
                </p>
                {phdSig?.signedAt && (
                  <p className="text-[10px] text-emerald-400">
                    Executed: {new Date(phdSig.signedAt).toLocaleString('en-GB')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Master Recordings & Audio Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <Disc3 className="w-4 h-4 text-indigo-400" />
                <span>Master Recordings ({release.tracks.length})</span>
              </h3>

              <div className="space-y-4">
                {release.tracks.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-[#0E1015] border border-[#1F2430] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-indigo-400 mr-2">
                          0{t.trackNumber}
                        </span>
                        <span className="text-sm font-bold text-zinc-200">{t.title}</span>
                        {t.versionRemix && (
                          <span className="text-xs text-zinc-500 ml-1.5">({t.versionRemix})</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-zinc-400">{t.duration || '03:20'}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-[#1F2430]">
                      <div>
                        <span className="text-zinc-500 block">Producer</span>
                        <span className="text-zinc-200">{t.producerBeatmaker || 'Disclosed'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">ISRC</span>
                        <span className="text-zinc-200 font-mono">{t.isrc || 'Pending'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Master Owner</span>
                        <span className="text-zinc-200">{t.masterOwnerLegalName || 'Artist'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Ownership Share</span>
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
          </div>
        </div>
      </main>
    </div>
  );
}

