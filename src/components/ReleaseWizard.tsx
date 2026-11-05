'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Disc3,
  Layers,
  FileCheck,
  ShieldAlert,
  Upload,
  DollarSign,
  PenTool,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Music,
  ArrowRight,
  ArrowLeft,
  Info,
  Calendar,
  Globe,
  Tag,
  Check,
  AlertTriangle,
  Lock,
  RefreshCw,
  Image as ImageIcon,
  ExternalLink,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  CLEARANCE_CATEGORIES,
  DELIVERABLES_CONFIG,
  EXPENSE_CATEGORIES,
  PENDING_CLEARANCE_WARNING,
  RECOUPMENT_LEGAL_NOTICE,
  ARTIST_DECLARATION_TEXT,
  ARTIST_CONFIRMATION_TEXT,
  CURRENCIES,
  DEFAULT_DSPS,
} from '@/lib/constants';
import { ReadinessMeter } from '@/components/ReadinessMeter';
import { SignaturePad } from '@/components/SignaturePad';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ArtworkPreview } from '@/components/ArtworkPreview';
import { RevenueSimulator } from '@/components/RevenueSimulator';
import { evaluateReleaseReadiness } from '@/lib/readiness';

interface ReleaseWizardProps {
  initialRelease: any;
  user: any;
}

const STEPS = [
  { id: 1, title: 'Release Info', desc: 'Schedule A – Part I' },
  { id: 2, title: 'Track Register', desc: 'Schedule A – Part II' },
  { id: 3, title: 'Rights Clearance', desc: 'Schedule B – Checklist & Licences' },
  { id: 4, title: 'Deliverables', desc: 'Schedule A – Part III' },
  { id: 5, title: 'Budget & Recoupment', desc: 'Schedule A – Part IV' },
  { id: 6, title: 'Review & Sign', desc: 'Execute & Submit to PHD' },
];

export function ReleaseWizard({ initialRelease, user }: ReleaseWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [release, setRelease] = useState(initialRelease);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [trackActionError, setTrackActionError] = useState('');

  // Upload progress & states
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});

  // Helper to ensure all 14 statutory categories are always represented in stable canonical order
  const getOrderedClearances = (items: any[]) => {
    const map = new Map((items || []).map((c) => [c.category, c]));
    return CLEARANCE_CATEGORIES.map((cat) => {
      if (map.has(cat.id)) {
        return map.get(cat.id);
      }
      return {
        id: `temp_${cat.id}`,
        category: cat.id,
        status: 'Pending',
        documentReference: '',
        rightsHolder: '',
        supportingDocUrl: null,
        notes: `Clearance category: ${cat.label}`,
      };
    });
  };

  // Form states
  const [tracks, setTracks] = useState<any[]>(initialRelease.tracks || []);
  const [clearanceItems, setClearanceItems] = useState<any[]>(() =>
    getOrderedClearances(initialRelease.clearanceItems || [])
  );
  const [deliverables, setDeliverables] = useState<any[]>(initialRelease.deliverables || []);
  const [budgetItems, setBudgetItems] = useState<any[]>(initialRelease.budgetItems || []);

  // Signing states
  const [artistLegalName, setArtistLegalName] = useState(
    user.artistProfile?.legalName || user.name || ''
  );
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>('DRAWN');
  const [confirmDeclarations, setConfirmDeclarations] = useState(false);

  // Compute live readiness dynamically based on current client state
  const currentReadiness = evaluateReleaseReadiness({
    ...release,
    tracks,
    clearanceItems,
    deliverables,
    budgetItems,
  });

  const artworkDeliverable = deliverables.find((d) => d.deliverableKey === 'cover_artwork');

  // Synchronous auto-save logic with explicit payload override
  const saveChanges = async (updates: any = {}) => {
    setIsSaving(true);
    try {
      const payload = {
        tracks: updates.tracks !== undefined ? updates.tracks : tracks,
        clearanceItems: updates.clearanceItems !== undefined ? updates.clearanceItems : clearanceItems,
        deliverables: updates.deliverables !== undefined ? updates.deliverables : deliverables,
        budgetItems: updates.budgetItems !== undefined ? updates.budgetItems : budgetItems,
        ...updates,
      };

      const res = await fetch(`/api/releases/${release.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.release) {
        setRelease(data.release);
        if (Array.isArray(data.release.tracks)) {
          setTracks(data.release.tracks);
        }
        if (Array.isArray(data.release.clearanceItems)) {
          setClearanceItems(getOrderedClearances(data.release.clearanceItems));
        }
        if (Array.isArray(data.release.deliverables)) {
          setDeliverables(data.release.deliverables);
        }
        if (Array.isArray(data.release.budgetItems)) {
          setBudgetItems(data.release.budgetItems);
        }
        setLastSaved(new Date());
        return data.release;
      } else {
        throw new Error(data.error || 'Failed to save changes');
      }
    } catch (err: any) {
      console.error('Auto-save error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Upload helper using XMLHttpRequest for real progress events
  const uploadWithProgress = (
    file: File,
    category: 'master' | 'artwork' | 'document' | 'lyrics' | 'clearance_pdf',
    onProgress: (percent: number) => void
  ): Promise<{ fileUrl: string; metadata: any }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              resolve({ fileUrl: data.fileUrl, metadata: data.metadata });
            } else {
              reject(new Error(data.error || 'Upload failed'));
            }
          } catch (err) {
            reject(new Error('Invalid response from upload server'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || `Upload failed (Status ${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (Status ${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload'));
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  };

  // Handle master audio file upload for track
  const handleAudioUpload = async (trackIdx: number, file: File) => {
    const trackKey = `track_${trackIdx}`;
    setIsUploading((prev) => ({ ...prev, [trackKey]: true }));
    setUploadProgress((prev) => ({ ...prev, [trackKey]: 0 }));
    setUploadError((prev) => ({ ...prev, [trackKey]: '' }));

    try {
      const { fileUrl, metadata } = await uploadWithProgress(
        file,
        'master',
        (percent) => setUploadProgress((prev) => ({ ...prev, [trackKey]: percent }))
      );

      const updatedTracks = tracks.map((t, i) =>
        i === trackIdx
          ? {
              ...t,
              audioFileUrl: fileUrl,
              audioFileName: file.name,
              audioFileSize: file.size,
              finalMasterDelivered: 'Yes',
              audioSampleRate: metadata?.sampleRate || t.audioSampleRate,
              audioBitDepth: metadata?.bitDepth || t.audioBitDepth,
              audioChannels: metadata?.channels || t.audioChannels,
              audioIsLossless: metadata?.isLossless !== undefined ? metadata.isLossless : true,
            }
          : t
      );

      setTracks(updatedTracks);
      await saveChanges({ tracks: updatedTracks });
    } catch (err: any) {
      setUploadError((prev) => ({ ...prev, [trackKey]: err.message || 'Audio upload failed' }));
    } finally {
      setIsUploading((prev) => ({ ...prev, [trackKey]: false }));
    }
  };

  // Handle master audio deletion for track
  const handleAudioDelete = async (trackIdx: number) => {
    if (!confirm(`Are you sure you want to remove the audio master for "${tracks[trackIdx]?.title || 'Track'}"?`)) {
      return;
    }

    const updatedTracks = tracks.map((t, i) =>
      i === trackIdx
        ? {
            ...t,
            audioFileUrl: null,
            audioFileName: null,
            audioFileSize: null,
            finalMasterDelivered: 'No',
            audioSampleRate: null,
            audioBitDepth: null,
            audioChannels: null,
            audioIsLossless: null,
          }
        : t
    );

    setTracks(updatedTracks);
    await saveChanges({ tracks: updatedTracks });
  };

  // Handle cover artwork upload
  const handleArtworkUpload = async (file: File) => {
    setIsUploading((prev) => ({ ...prev, artwork: true }));
    setUploadProgress((prev) => ({ ...prev, artwork: 0 }));
    setUploadError((prev) => ({ ...prev, artwork: '' }));

    try {
      const { fileUrl, metadata } = await uploadWithProgress(
        file,
        'artwork',
        (percent) => setUploadProgress((prev) => ({ ...prev, artwork: percent }))
      );

      const existingIdx = deliverables.findIndex((d) => d.deliverableKey === 'cover_artwork');
      const artworkItem = {
        deliverableKey: 'cover_artwork',
        name: 'Cover Artwork (Front)',
        responsibleParty: 'Artist / agreed designer',
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        status: 'Uploaded',
        metadataJson: JSON.stringify(metadata || {}),
      };

      let updatedDeliverables;
      if (existingIdx >= 0) {
        updatedDeliverables = deliverables.map((d, i) =>
          i === existingIdx ? { ...d, ...artworkItem } : d
        );
      } else {
        updatedDeliverables = [...deliverables, artworkItem];
      }

      setDeliverables(updatedDeliverables);
      await saveChanges({ deliverables: updatedDeliverables });
    } catch (err: any) {
      setUploadError((prev) => ({ ...prev, artwork: err.message || 'Artwork upload failed' }));
    } finally {
      setIsUploading((prev) => ({ ...prev, artwork: false }));
    }
  };

  // Handle cover artwork delete
  const handleArtworkDelete = async () => {
    if (!confirm('Are you sure you want to remove the cover artwork?')) return;

    const updatedDeliverables = deliverables.map((d) =>
      d.deliverableKey === 'cover_artwork'
        ? {
            ...d,
            fileUrl: null,
            fileName: null,
            fileSize: null,
            status: 'Not Started',
            metadataJson: null,
          }
        : d
    );

    setDeliverables(updatedDeliverables);
    await saveChanges({ deliverables: updatedDeliverables });
  };

  const [isGeneratingIsrcs, setIsGeneratingIsrcs] = useState(false);

  // Auto-generate single track ISRC: Pattern NGB77{YY}{SEQ5} starting from 00300
  const handleGenerateSingleIsrc = async (trackIdx: number) => {
    setIsGeneratingIsrcs(true);
    setTrackActionError('');
    try {
      const res = await fetch('/api/isrc/generate?count=1');
      const data = await res.json();
      if (data.success && data.isrcs?.[0]) {
        const nextIsrc = data.isrcs[0];
        const updated = tracks.map((t, i) => (i === trackIdx ? { ...t, isrc: nextIsrc } : t));
        setTracks(updated);
        await saveChanges({ tracks: updated });
      } else {
        setTrackActionError(data.error || 'Failed to generate ISRC');
      }
    } catch {
      setTrackActionError('Error generating ISRC');
    } finally {
      setIsGeneratingIsrcs(false);
    }
  };

  // Auto-generate sequential ISRCs for all tracks missing an ISRC (or all tracks)
  const handleBatchGenerateIsrcs = async () => {
    const missingIndices = tracks
      .map((t, i) => (!t.isrc || !t.isrc.trim() ? i : -1))
      .filter((i) => i !== -1);
    const countToGenerate = missingIndices.length > 0 ? missingIndices.length : tracks.length;

    if (missingIndices.length === 0) {
      if (!confirm('All tracks already have assigned ISRCs. Do you want to re-allocate sequential ISRCs for all tracks?')) {
        return;
      }
    }

    setIsGeneratingIsrcs(true);
    setTrackActionError('');
    try {
      const res = await fetch(`/api/isrc/generate?count=${countToGenerate}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.isrcs)) {
        let isrcIdx = 0;
        const updated = tracks.map((t, i) => {
          if (missingIndices.length > 0) {
            if ((!t.isrc || !t.isrc.trim()) && isrcIdx < data.isrcs.length) {
              const code = data.isrcs[isrcIdx++];
              return { ...t, isrc: code };
            }
            return t;
          } else {
            const code = data.isrcs[i];
            return { ...t, isrc: code };
          }
        });
        setTracks(updated);
        await saveChanges({ tracks: updated });
      } else {
        setTrackActionError(data.error || 'Failed to allocate ISRCs');
      }
    } catch {
      setTrackActionError('Error allocating ISRCs');
    } finally {
      setIsGeneratingIsrcs(false);
    }
  };

  // Track helpers
  const addTrack = async () => {
    const newTrackNumber = tracks.length + 1;
    let autoIsrc = '';
    try {
      const res = await fetch('/api/isrc/generate?count=1');
      const data = await res.json();
      if (data.success && data.isrcs?.[0]) {
        autoIsrc = data.isrcs[0];
      }
    } catch {}

    const newTrack = {
      id: `temp_${Date.now()}`,
      trackNumber: newTrackNumber,
      title: `Track ${newTrackNumber}`,
      versionRemix: 'Original Mix',
      primaryArtist: release.primaryArtist,
      featuredArtists: '',
      producerBeatmaker: '',
      songwritersComposers: '',
      masterOwnerLegalName: artistLegalName,
      masterOwnershipPercentage: 100,
      isrc: autoIsrc,
      explicitContent: false,
      language: 'English',
      duration: '',
      lyricsText: '',
      lyricsDelivered: 'No',
      finalMasterDelivered: 'No',
      rightsClearanceStatus: 'Pending',
      contributors: [],
    };
    const updated = [...tracks, newTrack];
    setTracks(updated);
    saveChanges({ tracks: updated });
  };

  const removeTrack = (index: number) => {
    const updated = tracks.filter((_, i) => i !== index);
    setTracks(updated);
    saveChanges({ tracks: updated });
  };

  const updateTrack = (index: number, field: string, val: any) => {
    const updated = [...tracks];
    updated[index] = { ...updated[index], [field]: val };
    setTracks(updated);
  };

  // General document deliverable upload helper
  const handleDeliverableUpload = async (index: number, file: File) => {
    const key = `deliverable_${index}`;
    setIsUploading((prev) => ({ ...prev, [key]: true }));
    setUploadProgress((prev) => ({ ...prev, [key]: 0 }));

    try {
      const { fileUrl } = await uploadWithProgress(
        file,
        'document',
        (percent) => setUploadProgress((prev) => ({ ...prev, [key]: percent }))
      );

      const updated = [...deliverables];
      updated[index] = {
        ...updated[index],
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        status: 'Uploaded',
      };

      setDeliverables(updated);
      await saveChanges({ deliverables: updated });
    } catch (err: any) {
      setUploadError((prev) => ({ ...prev, [key]: err.message || 'Document upload failed' }));
    } finally {
      setIsUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle clearance document PDF upload (PDF only strictly enforced)
  const handleClearancePdfUpload = async (clearanceIdx: number, file: File) => {
    const key = `clearance_${clearanceIdx}`;
    
    // Strict client-side PDF verification
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError((prev) => ({ ...prev, [key]: 'Only PDF documents (.pdf) are permitted for signed clearance agreements.' }));
      return;
    }

    setIsUploading((prev) => ({ ...prev, [key]: true }));
    setUploadProgress((prev) => ({ ...prev, [key]: 0 }));
    setUploadError((prev) => ({ ...prev, [key]: '' }));

    try {
      const { fileUrl } = await uploadWithProgress(
        file,
        'clearance_pdf',
        (percent) => setUploadProgress((prev) => ({ ...prev, [key]: percent }))
      );

      const updated = [...clearanceItems];
      updated[clearanceIdx] = {
        ...updated[clearanceIdx],
        supportingDocUrl: fileUrl,
      };
      setClearanceItems(updated);
      await saveChanges({ clearanceItems: updated });
    } catch (err: any) {
      setUploadError((prev) => ({ ...prev, [key]: err.message || 'PDF upload failed' }));
    } finally {
      setIsUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle clearance document removal
  const handleClearancePdfDelete = async (clearanceIdx: number) => {
    if (!confirm('Are you sure you want to remove this attached clearance agreement PDF?')) return;
    const updated = [...clearanceItems];
    updated[clearanceIdx] = {
      ...updated[clearanceIdx],
      supportingDocUrl: null,
    };
    setClearanceItems(updated);
    await saveChanges({ clearanceItems: updated });
  };

  // Submit Release with robust validation and blocker feedback
  const handleSubmitRelease = async () => {
    setSubmitError('');

    // Pre-flight check against critical blockers
    if (currentReadiness.criticalBlockers.length > 0) {
      setSubmitError(
        `Cannot submit release. The following items must be resolved first:\n• ${currentReadiness.criticalBlockers.join('\n• ')}`
      );
      return;
    }

    if (!signatureData) {
      setSubmitError('Digital signature is required to execute Schedule A and B.');
      return;
    }
    if (!artistLegalName.trim()) {
      setSubmitError('Artist legal name is required for legal execution.');
      return;
    }
    if (!confirmDeclarations) {
      setSubmitError('You must confirm the statutory Schedule A & B declarations.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Force explicit database synchronization of all latest client states
      await saveChanges({
        tracks,
        clearanceItems,
        deliverables,
        budgetItems,
      });

      // 2. Submit to execution endpoint
      const res = await fetch(`/api/releases/${release.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName: artistLegalName.trim(),
          signatureData,
          signatureType,
          confirmDeclarations,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Submission failed';
        if (Array.isArray(data.criticalBlockers) && data.criticalBlockers.length > 0) {
          msg = `Cannot submit release: ${data.criticalBlockers.join(' • ')}`;
        }
        throw new Error(msg);
      }

      router.push(`/artist/releases/${release.id}`);
      router.refresh();
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg bg-white border border-[#E8E8E8]">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] overflow-hidden flex-shrink-0 flex items-center justify-center text-[#999999] shadow-md">
            {artworkDeliverable?.fileUrl ? (
              <img
                src={artworkDeliverable.fileUrl}
                alt={release.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Disc3 className="w-7 h-7 text-[#999999] animate-spin-slow" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#171717] bg-[#F4F4F2] px-2 py-0.5 rounded border border-[#E8E8E8]">
                {release.referenceNumber}
              </span>
              <span className="text-xs text-[#777777] font-mono">
                Version {release.currentVersion} • Draft
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#171717] mt-1">{release.title}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right text-xs">
            <span className="text-[#999999] block">
              {isSaving ? 'Saving changes...' : 'All changes saved'}
            </span>
            <span className="text-[#777777] text-[10px] font-mono">
              {lastSaved ? lastSaved.toLocaleTimeString('en-GB') : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              saveChanges({
                ...release,
                tracks,
                clearanceItems,
                deliverables,
                budgetItems,
              })
            }
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAEAEA] text-[#171717] text-xs font-medium border border-[#E8E8E8] transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-[#171717]" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Persistent Step Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              saveChanges();
              setCurrentStep(s.id);
            }}
            className={`text-left p-3 rounded-lg border transition-all ${
              currentStep === s.id
                ? 'bg-[#171717] border-[#171717] text-white shadow-sm'
                : currentStep > s.id
                ? 'bg-white border-[#E8E8E8] text-[#171717] hover:border-[#777777]'
                : 'bg-[#F4F4F2] border-[#E8E8E8] text-[#777777] hover:border-[#999999]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold">STEP 0{s.id}</span>
              {currentStep > s.id && <Check className="w-3 h-3 text-[#269568]" />}
            </div>
            <p className="text-xs font-semibold text-[#171717] mt-1 truncate">{s.title}</p>
            <p className="text-[10px] text-[#999999] truncate mt-0.5">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Main Form Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: RELEASE INFORMATION */}
          {currentStep === 1 && (
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-5">
              <div className="border-b border-[#E8E8E8] pb-3">
                <h2 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-[#171717]" />
                  <span>Release Information (Schedule A – Part I)</span>
                </h2>
                <p className="text-xs text-[#777777] mt-0.5">
                  General legal metadata for this release schedule.
                </p>
              </div>

              {/* Cover Artwork Quick Card in Step 1 */}
              <div className="p-4 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-white border border-[#E8E8E8] overflow-hidden flex-shrink-0 flex items-center justify-center text-[#999999] shadow-md">
                  {artworkDeliverable?.fileUrl ? (
                    <img
                      src={artworkDeliverable.fileUrl}
                      alt="Cover Artwork"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-[#999999]">
                      <ImageIcon className="w-6 h-6 mb-1 text-[#999999]" />
                      <span className="text-[9px]">No Artwork</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2 w-full">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-[#171717]">Cover Artwork (Schedule A – Part III Deliverable)</h4>
                      {artworkDeliverable?.fileUrl && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ECFDF5] text-[#269568] border border-[#A7F3D0]">
                          ✓ Uploaded (3000×3000)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#777777] mt-0.5">
                      DSPs strictly require a square 1:1 image, at least 3000 × 3000 px in RGB format (PNG / JPG).
                    </p>
                  </div>

                  {isUploading.artwork ? (
                    <div className="space-y-1.5 p-2 bg-white rounded-lg border border-[#E8E8E8]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#171717] flex items-center space-x-1.5 font-medium">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Uploading cover artwork...</span>
                        </span>
                        <span className="font-mono text-[#171717] font-bold">{uploadProgress.artwork || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#171717] rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress.artwork || 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{artworkDeliverable?.fileUrl ? 'Replace Artwork' : 'Upload Cover Artwork'}</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleArtworkUpload(f);
                          }}
                        />
                      </label>
                      {artworkDeliverable?.fileUrl && (
                        <button
                          type="button"
                          onClick={handleArtworkDelete}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#D64B4B] border border-[#FECACA] rounded-lg text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  )}

                  {uploadError.artwork && (
                    <p className="text-[11px] text-[#D64B4B]">{uploadError.artwork}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Release Title *
                  </label>
                  <input
                    type="text"
                    value={release.title}
                    onChange={(e) => setRelease({ ...release, title: e.target.value })}
                    onBlur={() => saveChanges({ title: release.title })}
                    placeholder="e.g. Midnight in Lagos EP"
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Release Type *
                  </label>
                  <select
                    value={release.releaseType}
                    onChange={(e) => {
                      setRelease({ ...release, releaseType: e.target.value });
                      saveChanges({ releaseType: e.target.value });
                    }}
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  >
                    <option value="Single">Single</option>
                    <option value="EP">EP</option>
                    <option value="Album">Album</option>
                    <option value="Mixtape">Mixtape</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Primary Artist *
                  </label>
                  <input
                    type="text"
                    value={release.primaryArtist}
                    onChange={(e) => setRelease({ ...release, primaryArtist: e.target.value })}
                    onBlur={() => saveChanges({ primaryArtist: release.primaryArtist })}
                    placeholder="e.g. Dekaf"
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Record Label / Imprint
                  </label>
                  <input
                    type="text"
                    value={release.recordLabel || ''}
                    onChange={(e) => setRelease({ ...release, recordLabel: e.target.value })}
                    onBlur={() => saveChanges({ recordLabel: release.recordLabel })}
                    placeholder="e.g. Independent / Starfleet Records"
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Planned Release Date
                  </label>
                  <input
                    type="date"
                    value={
                      release.plannedReleaseDate
                        ? new Date(release.plannedReleaseDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) => {
                      const d = e.target.value ? new Date(e.target.value) : null;
                      setRelease({ ...release, plannedReleaseDate: d });
                      saveChanges({ plannedReleaseDate: d });
                    }}
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Genre</label>
                  <input
                    type="text"
                    value={release.genre || ''}
                    onChange={(e) => setRelease({ ...release, genre: e.target.value })}
                    onBlur={() => saveChanges({ genre: release.genre })}
                    placeholder="e.g. Afrobeats"
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">Subgenre</label>
                  <input
                    type="text"
                    value={release.subgenre || ''}
                    onChange={(e) => setRelease({ ...release, subgenre: e.target.value })}
                    onBlur={() => saveChanges({ subgenre: release.subgenre })}
                    placeholder="e.g. Afro-fusion / Alté"
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Territory
                </label>
                <div className="flex items-center space-x-4 mb-2">
                  <label className="flex items-center space-x-2 text-xs text-[#171717]">
                    <input
                      type="radio"
                      name="territoryType"
                      checked={release.territoryType === 'Worldwide'}
                      onChange={() => {
                        setRelease({ ...release, territoryType: 'Worldwide' });
                        saveChanges({ territoryType: 'Worldwide' });
                      }}
                      className="accent-[#171717]"
                    />
                    <span>Worldwide</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-[#171717]">
                    <input
                      type="radio"
                      name="territoryType"
                      checked={release.territoryType !== 'Worldwide'}
                      onChange={() => {
                        setRelease({ ...release, territoryType: 'Specific' });
                        saveChanges({ territoryType: 'Specific' });
                      }}
                      className="accent-[#171717]"
                    />
                    <span>Specific Territories</span>
                  </label>
                </div>
                {release.territoryType !== 'Worldwide' && (
                  <input
                    type="text"
                    value={release.territoryDetails || ''}
                    onChange={(e) => setRelease({ ...release, territoryDetails: e.target.value })}
                    onBlur={() => saveChanges({ territoryDetails: release.territoryDetails })}
                    placeholder="Specify territories (e.g. UK, Nigeria, Ghana, South Africa)"
                    className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Release Description & Operational Notes
                </label>
                <textarea
                  rows={3}
                  value={release.releaseDescription || ''}
                  onChange={(e) => setRelease({ ...release, releaseDescription: e.target.value })}
                  onBlur={() => saveChanges({ releaseDescription: release.releaseDescription })}
                  placeholder="Outline key project concepts, marketing angles or operational guidelines..."
                  className="w-full px-3.5 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                />
              </div>

              <div className="pt-4 border-t border-[#E8E8E8] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    saveChanges({
                      title: release.title,
                      releaseType: release.releaseType,
                      primaryArtist: release.primaryArtist,
                      recordLabel: release.recordLabel,
                      plannedReleaseDate: release.plannedReleaseDate,
                      genre: release.genre,
                      subgenre: release.subgenre,
                      territoryType: release.territoryType,
                      territoryDetails: release.territoryDetails,
                      releaseDescription: release.releaseDescription,
                    });
                    setCurrentStep(2);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <span>Continue to Master Recording Register</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MASTER RECORDING REGISTER */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                    <Disc3 className="w-4 h-4 text-[#171717]" />
                    <span>Master Recording Register (Schedule A – Part II)</span>
                  </h2>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Register all individual sound recordings covered by the Agreement.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {tracks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchGenerateIsrcs}
                      disabled={isGeneratingIsrcs}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#EAEAEA] text-[#171717] rounded-lg text-xs font-semibold border border-[#E8E8E8] transition-colors"
                      title="Auto-generate sequential ISRCs (Pattern: NGB772600300...)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#171717]" />
                      <span>{isGeneratingIsrcs ? 'Allocating ISRCs...' : 'Auto-Generate ISRCs'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={addTrack}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Track</span>
                  </button>
                </div>
              </div>

              {trackActionError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#D64B4B] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{trackActionError}</span>
                </div>
              )}

              {tracks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#E8E8E8] rounded-lg p-6 space-y-3">
                  <Music className="w-8 h-8 text-[#999999] mx-auto" />
                  <p className="text-xs text-[#777777]">
                    No tracks in master recording register. Click "Add Track" to register your first master.
                  </p>
                  <button
                    type="button"
                    onClick={addTrack}
                    className="px-3.5 py-1.5 bg-[#171717] text-white rounded-lg text-xs font-medium"
                  >
                    Add Track 1
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {tracks.map((track, idx) => (
                    <div
                      key={track.id || idx}
                      className="p-5 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-[#171717]/20 text-[#171717] font-mono text-xs flex items-center justify-center font-bold">
                            {track.trackNumber}
                          </span>
                          <span className="text-sm font-bold text-[#171717]">
                            {track.title || `Track ${track.trackNumber}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTrack(idx)}
                          className="text-xs text-[#999999] hover:text-[#D64B4B] transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-[#777777] mb-1">Track Title *</label>
                          <input
                            type="text"
                            value={track.title}
                            onChange={(e) => updateTrack(idx, 'title', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] text-[#777777]">Primary Artist *</label>
                            {tracks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const artist = track.primaryArtist || release.primaryArtist;
                                  const updated = tracks.map((t) => ({ ...t, primaryArtist: artist }));
                                  setTracks(updated);
                                  saveChanges({ tracks: updated });
                                }}
                                className="text-[10px] text-[#171717] hover:text-[#171717] font-semibold transition-colors"
                              >
                                Apply to all tracks
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={track.primaryArtist || release.primaryArtist || ''}
                            onChange={(e) => updateTrack(idx, 'primaryArtist', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder={release.primaryArtist || 'Primary Artist'}
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#777777] mb-1">Featured Artist(s)</label>
                          <input
                            type="text"
                            value={track.featuredArtists || ''}
                            onChange={(e) => updateTrack(idx, 'featuredArtists', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder="e.g. Tems, Burna Boy"
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#777777] mb-1">Version / Remix</label>
                          <input
                            type="text"
                            value={track.versionRemix || ''}
                            onChange={(e) => updateTrack(idx, 'versionRemix', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder="e.g. Original Master, Club Mix"
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] text-[#777777]">Producer / Beatmaker</label>
                            {tracks.length > 1 && track.producerBeatmaker && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prod = track.producerBeatmaker;
                                  const updated = tracks.map((t) => ({ ...t, producerBeatmaker: prod }));
                                  setTracks(updated);
                                  saveChanges({ tracks: updated });
                                }}
                                className="text-[10px] text-[#171717] hover:text-[#171717] font-semibold transition-colors"
                              >
                                Apply to all
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={track.producerBeatmaker || ''}
                            onChange={(e) => updateTrack(idx, 'producerBeatmaker', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder="e.g. Kel-P, Sarz"
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] text-[#777777]">Songwriters / Composers</label>
                            {tracks.length > 1 && track.songwritersComposers && (
                              <button
                                type="button"
                                onClick={() => {
                                  const sw = track.songwritersComposers;
                                  const updated = tracks.map((t) => ({ ...t, songwritersComposers: sw }));
                                  setTracks(updated);
                                  saveChanges({ tracks: updated });
                                }}
                                className="text-[10px] text-[#171717] hover:text-[#171717] font-semibold transition-colors"
                              >
                                Apply to all
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={track.songwritersComposers || ''}
                            onChange={(e) => updateTrack(idx, 'songwritersComposers', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder="e.g. Dekaf, Kel-P"
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] text-[#777777]">ISRC Code</label>
                            <button
                              type="button"
                              onClick={() => handleGenerateSingleIsrc(idx)}
                              disabled={isGeneratingIsrcs}
                              className="text-[10px] text-[#171717] hover:text-[#171717] font-mono transition-colors"
                              title="Auto-generate official sequential ISRC (Pattern: NGB772600300...)"
                            >
                              {track.isrc ? 'Regenerate' : 'Auto-Generate ISRC'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={track.isrc || ''}
                            onChange={(e) => updateTrack(idx, 'isrc', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder="e.g. NGB772600300"
                            maxLength={12}
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] font-mono uppercase tracking-wider"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#777777] mb-1">Duration (MM:SS)</label>
                          <input
                            type="text"
                            value={track.duration || ''}
                            onChange={(e) => updateTrack(idx, 'duration', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder="03:24"
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] font-mono"
                          />
                        </div>
                      </div>

                      {/* Track Lyrics (Optional) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] text-[#777777]">
                            Track Lyrics (Optional)
                          </label>
                          <span className="text-[10px] text-[#999999]">
                            Used for lyrics synchronization and DSP delivery
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={track.lyricsText || ''}
                          onChange={(e) => updateTrack(idx, 'lyricsText', e.target.value)}
                          onBlur={() => saveChanges({ tracks })}
                          placeholder="Type or paste lyrics for this track here..."
                          className="w-full px-3 py-2 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] font-sans"
                        />
                      </div>

                      {/* Master Ownership Percentage & Legal Owner */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-[#E8E8E8]">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-medium text-[#171717]">
                              Legal Master Owner Name *
                            </label>
                            {tracks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const owner = track.masterOwnerLegalName || artistLegalName;
                                  const updated = tracks.map((t) => ({ ...t, masterOwnerLegalName: owner }));
                                  setTracks(updated);
                                  saveChanges({ tracks: updated });
                                }}
                                className="text-[10px] text-[#171717] hover:text-[#171717] font-semibold transition-colors"
                              >
                                Apply to all tracks
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={track.masterOwnerLegalName || artistLegalName}
                            onChange={(e) => updateTrack(idx, 'masterOwnerLegalName', e.target.value)}
                            onBlur={() => saveChanges({ tracks })}
                            placeholder="Legal Entity or Artist Legal Name"
                            className="w-full px-3 py-1.5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-medium text-[#171717]">
                              Master Ownership Share (%) *
                            </label>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                Number(track.masterOwnershipPercentage) === 100
                                  ? 'text-[#269568]'
                                  : 'text-[#D69E36]'
                              }`}
                            >
                              {track.masterOwnershipPercentage || 100}%
                            </span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={track.masterOwnershipPercentage || 100}
                            onChange={(e) => updateTrack(idx, 'masterOwnershipPercentage', Number(e.target.value))}
                            onBlur={() => saveChanges({ tracks })}
                            className="w-full px-3 py-1.5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] font-mono"
                          />
                        </div>
                      </div>

                      {/* Audio Master Upload & Preview */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-medium text-[#171717]">
                          Final Audio Master (Uncompressed WAV / AIFF) *
                        </label>

                        {isUploading[`track_${idx}`] ? (
                          <div className="p-4 bg-white border border-[#E8E8E8] rounded-lg space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center space-x-2 text-[#171717] font-medium">
                                <Disc3 className="w-4 h-4 animate-spin text-[#171717]" />
                                <span>Uploading WAV Audio Master for "{track.title}"...</span>
                              </span>
                              <span className="font-mono font-bold text-[#171717]">
                                {uploadProgress[`track_${idx}`] || 0}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-200"
                                style={{ width: `${uploadProgress[`track_${idx}`] || 0}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-[#999999]">
                              Uploading lossless audio master directly to secure Cloudflare R2 object storage...
                            </p>
                          </div>
                        ) : track.audioFileUrl ? (
                          <div className="space-y-2">
                            <AudioPlayer
                              url={track.audioFileUrl}
                              downloadUrl={track.id && !track.id.startsWith('temp_') ? `/api/releases/${release.id}/download?type=track&trackId=${track.id}` : undefined}
                              title={track.title}
                              artist={track.primaryArtist}
                              fileName={track.audioFileName}
                              fileSize={track.audioFileSize}
                              sampleRate={track.audioSampleRate}
                              bitDepth={track.audioBitDepth}
                              channels={track.audioChannels}
                              isLossless={track.audioIsLossless}
                              onDelete={() => handleAudioDelete(idx)}
                              onReplace={() => {
                                const input = document.getElementById(`audio_replace_input_${idx}`) as HTMLInputElement;
                                input?.click();
                              }}
                            />
                            <input
                              id={`audio_replace_input_${idx}`}
                              type="file"
                              accept=".wav,.aif,.aiff,.flac"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAudioUpload(idx, f);
                              }}
                            />
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-5 border border-dashed border-[#E8E8E8] hover:border-indigo-500/50 rounded-lg cursor-pointer bg-white transition-colors text-center group">
                            <div className="w-10 h-10 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] flex items-center justify-center text-[#171717] mb-2 group-hover:scale-105 transition-transform">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-[#171717]">
                              Upload WAV Audio Master for {track.title}
                            </span>
                            <span className="text-[10px] text-[#999999] mt-1">
                              Accepts uncompressed WAV / AIFF (24-bit 44.1kHz or higher)
                            </span>
                            <input
                              type="file"
                              accept=".wav,.aif,.aiff,.flac"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAudioUpload(idx, f);
                              }}
                            />
                          </label>
                        )}

                        {uploadError[`track_${idx}`] && (
                          <p className="text-[11px] text-[#D64B4B] flex items-center space-x-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{uploadError[`track_${idx}`]}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[#E8E8E8] flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveChanges({ tracks });
                    setCurrentStep(3);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <span>Continue to Rights Clearance Register</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RIGHTS CLEARANCE & DOCUMENTATION */}
          {currentStep === 3 && (
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-6">
              <div className="border-b border-[#E8E8E8] pb-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-[#171717]" />
                    <span>Rights Clearance & Agreements (Schedule B)</span>
                  </h2>
                  <span className="text-[11px] font-semibold text-[#269568] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full">
                    Optional at Initial Submission
                  </span>
                </div>
                <p className="text-xs text-[#777777] mt-0.5">
                  Download sample statutory split sheets, execute with collaborators, and attach documentation. Reviewers will verify before final DSP store delivery.
                </p>
              </div>

              {/* Reviewer Feedback / Document Request Notice if Revision Requested */}
              {release.status === 'REVISION_REQUESTED' && release.revisionRequests?.[0] && (
                <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg space-y-2.5">
                  <div className="flex items-center space-x-2 text-[#D69E36] font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reviewer Revision Instructions</span>
                  </div>
                  <p className="text-xs text-amber-200/90 whitespace-pre-line pl-6">
                    {release.revisionRequests[0].comments}
                  </p>
                  {release.revisionRequests[0].requestedDocuments && (
                    <div className="mt-2 pl-6">
                      <span className="text-[11px] font-semibold text-[#D69E36] block mb-1">
                        Specific Agreements Requested by Reviewer:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          try {
                            const docs = JSON.parse(release.revisionRequests[0].requestedDocuments);
                            return Array.isArray(docs)
                              ? docs.map((d: string) => (
                                  <span
                                    key={d}
                                    className="px-2.5 py-1 rounded bg-amber-900/60 text-amber-200 border border-amber-700/60 text-xs font-semibold"
                                  >
                                    {d}
                                  </span>
                                ))
                              : null;
                          } catch {
                            return (
                              <span className="text-xs text-amber-200">
                                {release.revisionRequests[0].requestedDocuments}
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Informational Non-Compulsory Notice */}
              <div className="p-3.5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg flex items-start space-x-3 text-xs text-[#171717]">
                <Info className="w-4 h-4 text-[#171717] flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#171717]">Non-Compulsory for Initial Submission:</span>
                  <p className="text-[11px] text-[#171717] leading-relaxed">
                    You can submit this release now with or without attached clearance documents. The PHD review team makes the final decision on whether the release proceeds to stores without documents, or they will request specific signed agreements from you.
                  </p>
                </div>
              </div>

              {/* SAMPLE AGREEMENTS DOWNLOAD & IDENTIFICATION CARDS */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-[#171717] flex items-center space-x-1.5 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-[#171717]" />
                    <span>Download Official Sample Split Sheets & Agreements</span>
                  </h3>
                  <p className="text-[11px] text-[#777777] mt-0.5">
                    Each sample agreement is tagged with a unique document reference number for easy identification. Download, sign with your collaborators, and attach below.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Card 1: Producer Agreement */}
                  <div className="bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg p-4 flex flex-col justify-between space-y-3 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#171717] bg-white border border-[#E8E8E8] px-2 py-0.5 rounded font-bold">
                          {release.referenceNumber}-DOC-PROD
                        </span>
                        <span className="text-[10px] text-[#777777] font-medium">Producer Split</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#171717] mt-2">Music Producer Split Sheet</h4>
                      <p className="text-[11px] text-[#777777] mt-1 line-clamp-3">
                        Statutory agreement establishing producer master ownership share, publishing percentage, advance fees, and production credits.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E8E8E8]">
                      <a
                        href="/templates/agreements/PHD-Producer-Split-Sheet.pdf"
                        download="PHD-Producer-Split-Sheet.pdf"
                        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Download Sample Template</span>
                      </a>
                    </div>
                  </div>

                  {/* Card 2: Featured Artist Consent */}
                  <div className="bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg p-4 flex flex-col justify-between space-y-3 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#171717] bg-white border border-[#E8E8E8] px-2 py-0.5 rounded font-bold">
                          {release.referenceNumber}-DOC-FEAT
                        </span>
                        <span className="text-[10px] text-[#777777] font-medium">Guest Artist Release</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#171717] mt-2">Featured-Artist Consent / Release</h4>
                      <p className="text-[11px] text-[#777777] mt-1 line-clamp-3">
                        Commercial consent and release granting name, image, and likeness rights along with agreed featured artist royalty shares.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E8E8E8]">
                      <a
                        href="/templates/agreements/PHD-Collaboration-Featured-Artist-Split-Sheet.pdf"
                        download="PHD-Collaboration-Featured-Artist-Split-Sheet.pdf"
                        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Download Sample Template</span>
                      </a>
                    </div>
                  </div>

                  {/* Card 3: Songwriter Split Sheet */}
                  <div className="bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg p-4 flex flex-col justify-between space-y-3 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#171717] bg-white border border-[#E8E8E8] px-2 py-0.5 rounded font-bold">
                          {release.referenceNumber}-DOC-SPLIT
                        </span>
                        <span className="text-[10px] text-[#777777] font-medium">Composition Split</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#171717] mt-2">Songwriter / Composer Split Agreement</h4>
                      <p className="text-[11px] text-[#777777] mt-1 line-clamp-3">
                        Legal composition split defining lyrical and musical publishing splits across co-writers, composers, and lyricists.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E8E8E8]">
                      <a
                        href="/templates/agreements/PHD-Songwriter-Composer-Split-Sheet.pdf"
                        download="PHD-Songwriter-Composer-Split-Sheet.pdf"
                        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Download Sample Template</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* 14 Categories Checklist */}
              <div className="pt-2 border-t border-[#E8E8E8]">
                <h3 className="text-xs font-bold text-[#171717] mb-2 uppercase tracking-wider">
                  Schedule B – Clearance Checklist (14 Categories)
                </h3>
              </div>

              {/* 14 Categories List */}
              <div className="space-y-3">
                {clearanceItems.map((item, idx) => {
                  const catDef = CLEARANCE_CATEGORIES.find((c) => c.id === item.category);
                  const isObtained = item.status === 'Obtained';
                  const isPending = item.status === 'Pending';

                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#171717]">
                            {idx + 1}. {catDef?.label || item.category}
                          </span>
                          <p className="text-[11px] text-[#999999] mt-0.5">
                            {catDef?.description || 'Mandatory clearance item'}
                          </p>
                        </div>

                        {/* Status selector */}
                        <div className="flex items-center space-x-1.5">
                          {['Obtained', 'Pending', 'N/A'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={async () => {
                                const updated = [...clearanceItems];
                                updated[idx] = { ...updated[idx], status: st };
                                setClearanceItems(updated);
                                await saveChanges({ clearanceItems: updated });
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                item.status === st
                                  ? st === 'Obtained'
                                    ? 'bg-[#269568] text-white shadow-sm'
                                    : st === 'Pending'
                                    ? 'bg-[#D69E36] text-white shadow-sm'
                                    : 'bg-[#171717] text-white'
                                  : 'bg-white text-[#777777] border border-[#E8E8E8] hover:text-[#171717]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#E8E8E8]/60">
                        <div>
                          <label className="block text-[10px] text-[#777777] mb-1">
                            Document Reference Number
                          </label>
                          <input
                            type="text"
                            value={item.documentReference || ''}
                            onChange={(e) => {
                              const updated = [...clearanceItems];
                              updated[idx] = { ...updated[idx], documentReference: e.target.value };
                              setClearanceItems(updated);
                            }}
                            onBlur={() => saveChanges({ clearanceItems })}
                            placeholder="e.g. REF-AGR-2026-001"
                            className="w-full px-3 py-1 bg-white border border-[#E8E8E8] rounded text-xs text-[#171717] font-mono focus:outline-none focus:border-[#171717]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-[#777777] mb-1">
                            Rights Holder / Licensor Entity
                          </label>
                          <input
                            type="text"
                            value={item.rightsHolder || ''}
                            onChange={(e) => {
                              const updated = [...clearanceItems];
                              updated[idx] = { ...updated[idx], rightsHolder: e.target.value };
                              setClearanceItems(updated);
                            }}
                            onBlur={() => saveChanges({ clearanceItems })}
                            placeholder="e.g. Beatstars Licensor, Dekaf"
                            className="w-full px-3 py-1 bg-white border border-[#E8E8E8] rounded text-xs text-[#171717] focus:outline-none focus:border-[#171717]"
                          />
                        </div>
                      </div>

                      {/* PDF Clearance Agreement Upload - Strictly Required when status is 'Obtained' */}
                      {(isObtained || item.supportingDocUrl) && (
                        <div className="pt-3 border-t border-[#E8E8E8]/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#171717] flex items-center space-x-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#171717]" />
                              <span>Signed Clearance Agreement (PDF Only) {isObtained && '*'}</span>
                            </span>
                            {item.supportingDocUrl ? (
                              <span className="text-[10px] font-mono text-[#269568] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>PDF Document Attached</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-[#D69E36] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Mandatory Prior to Release</span>
                              </span>
                            )}
                          </div>

                          {!item.supportingDocUrl && isObtained && (
                            <div className="p-2.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#D69E36]/90 flex items-start space-x-2">
                              <AlertCircle className="w-4 h-4 text-[#D69E36] flex-shrink-0 mt-0.5" />
                              <p>
                                <strong>Document submission required:</strong> Because this clearance is marked <em>Obtained</em>, the executed and signed agreement must be uploaded in PDF format prior to release of the song.
                              </p>
                            </div>
                          )}

                          {isUploading[`clearance_${idx}`] ? (
                            <div className="p-3 bg-white border border-[#E8E8E8] rounded-lg space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center space-x-2 text-[#171717] font-medium">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#171717]" />
                                  <span>Uploading signed PDF agreement...</span>
                                </span>
                                <span className="font-mono font-bold text-[#171717]">
                                  {uploadProgress[`clearance_${idx}`] || 0}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#171717] rounded-full transition-all duration-200"
                                  style={{ width: `${uploadProgress[`clearance_${idx}`] || 0}%` }}
                                />
                              </div>
                            </div>
                          ) : item.supportingDocUrl ? (
                            <div className="p-3 bg-white border border-[#A7F3D0] rounded-lg flex items-center justify-between gap-3 shadow-sm">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#269568] flex-shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[#171717] truncate">
                                    {item.supportingDocUrl.split('/').pop() || 'Clearance_Agreement.pdf'}
                                  </p>
                                  <p className="text-[10px] text-[#777777] font-mono">
                                    Signed Legal PDF Document
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <a
                                  href={item.supportingDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded bg-white hover:bg-[#EAEAEA] text-[#171717] text-[11px] font-medium border border-[#E8E8E8] transition-colors flex items-center space-x-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View PDF</span>
                                </a>
                                <label className="px-2.5 py-1 rounded bg-white hover:bg-[#EAEAEA] text-[#171717] text-[11px] font-medium border border-[#E8E8E8] cursor-pointer transition-colors">
                                  <span>Replace</span>
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleClearancePdfUpload(idx, f);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleClearancePdfDelete(idx)}
                                  className="p-1.5 rounded text-[#D64B4B] hover:text-white hover:bg-[#D64B4B] border border-[#FECACA] transition-colors"
                                  title="Remove PDF"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-[#E8E8E8] hover:border-indigo-500/60 rounded-lg cursor-pointer bg-white transition-colors text-center group">
                                <Upload className="w-5 h-5 text-[#171717] mb-1 group-hover:scale-105 transition-transform" />
                                <span className="text-xs font-semibold text-[#171717]">
                                  Upload Signed Agreement (PDF Only) *
                                </span>
                                <span className="text-[10px] text-[#777777] mt-0.5">
                                  Only .pdf files are accepted (maximum 100MB)
                                </span>
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleClearancePdfUpload(idx, f);
                                  }}
                                />
                              </label>
                            </div>
                          )}

                          {uploadError[`clearance_${idx}`] && (
                            <p className="text-[11px] text-[#D64B4B] flex items-center space-x-1">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{uploadError[`clearance_${idx}`]}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Statutory Artist Declaration wording */}
              <div className="p-4 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg space-y-2">
                <span className="text-xs font-bold text-[#171717]">
                  Statutory Artist Rights Declaration
                </span>
                <p className="text-[11px] text-[#777777] leading-relaxed italic">
                  "{ARTIST_DECLARATION_TEXT}"
                </p>
              </div>

              <div className="pt-4 border-t border-[#E8E8E8] flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveChanges({ clearanceItems });
                    setCurrentStep(4);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium"
                >
                  <span>Continue to Release Deliverables</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DELIVERABLES */}
          {currentStep === 4 && (
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-6">
              <div className="border-b border-[#E8E8E8] pb-3">
                <h2 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-[#171717]" />
                  <span>Release Deliverables Schedule (Schedule A – Part III)</span>
                </h2>
                <p className="text-xs text-[#777777] mt-0.5">
                  Manage the 12 contractual delivery milestones and verify technical assets.
                </p>
              </div>

              {/* Artwork Inspection Callout */}
              <div className="p-5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg flex flex-col md:flex-row gap-5 items-start">
                <ArtworkPreview
                  url={artworkDeliverable?.fileUrl}
                  width={3000}
                  height={3000}
                />
                <div className="space-y-3 flex-1 w-full">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-[#171717]">Cover Artwork Delivery</h3>
                      {artworkDeliverable?.fileUrl && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ECFDF5] text-[#269568] border border-[#A7F3D0]">
                          ✓ Uploaded (3000×3000)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#777777] mt-1">
                      DSPs strictly require 1:1 square artwork, at least 3000 x 3000 pixels, in RGB format without unapproved promotional stickers.
                    </p>
                  </div>

                  {isUploading.artwork ? (
                    <div className="p-4 bg-white border border-[#E8E8E8] rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#171717] font-medium flex items-center space-x-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#171717]" />
                          <span>Uploading cover artwork to Cloudflare R2...</span>
                        </span>
                        <span className="font-mono text-[#171717] font-bold">{uploadProgress.artwork || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#171717] rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress.artwork || 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-sm">
                        <Upload className="w-4 h-4" />
                        <span>{artworkDeliverable?.fileUrl ? 'Replace Cover Artwork' : 'Upload Cover Artwork (PNG / JPG)'}</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleArtworkUpload(f);
                          }}
                        />
                      </label>
                      {artworkDeliverable?.fileUrl && (
                        <button
                          type="button"
                          onClick={handleArtworkDelete}
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#D64B4B] border border-[#FECACA] rounded-lg text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Artwork</span>
                        </button>
                      )}
                    </div>
                  )}

                  {uploadError.artwork && (
                    <p className="text-xs text-[#D64B4B]">{uploadError.artwork}</p>
                  )}
                </div>
              </div>

              {/* Deliverables Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                  Deliverable Milestones
                </h3>

                <div className="divide-y divide-[#E8E8E8] border border-[#E8E8E8] rounded-lg overflow-hidden bg-[#F4F4F2]">
                  {deliverables.map((d, idx) => (
                    <div key={d.id || idx} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#171717]">{d.name}</span>
                        <p className="text-[11px] text-[#999999]">
                          Responsible: {d.responsibleParty}
                          {d.fileName && <span className="text-[#777777] ml-2">({d.fileName})</span>}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                            d.status === 'Approved'
                              ? 'bg-[#ECFDF5] text-[#269568] border-[#A7F3D0]'
                              : d.status === 'Uploaded'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                              : 'bg-white text-[#777777] border-[#E8E8E8]'
                          }`}
                        >
                          {d.status}
                        </span>

                        {isUploading[`deliverable_${idx}`] ? (
                          <span className="text-[11px] text-[#171717] font-mono">
                            {uploadProgress[`deliverable_${idx}`] || 0}%
                          </span>
                        ) : (
                          <label className="text-[11px] text-[#171717] hover:text-[#171717] cursor-pointer font-medium">
                            {d.fileUrl ? 'Replace' : 'Upload File'}
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleDeliverableUpload(idx, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8E8E8] flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveChanges({ deliverables });
                    setCurrentStep(5);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <span>Continue to Budget & Recoupment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: BUDGET & RECOUPMENT */}
          {currentStep === 5 && (() => {
            const totalSuggested = budgetItems.reduce((acc, b) => acc + (Number(b.suggestedAmount) || 0), 0);
            const totalApproved = budgetItems.reduce((acc, b) => acc + (Number(b.approvedAmount) || 0), 0);
            const totalActual = budgetItems.reduce((acc, b) => acc + (Number(b.actualAmount) || 0), 0);
            const totalRecoupable = budgetItems
              .filter((b) => b.isEligibleRecoupable)
              .reduce((acc, b) => acc + (Number(b.approvedAmount || b.suggestedAmount) || 0), 0);

            return (
              <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E8E8] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-[#171717]" />
                      <span>Release Budget & Recoupment (Schedule A – Part IV)</span>
                    </h2>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Track approved recoupable costs and simulate the 70% Artist / 30% PHD allocation.
                    </p>
                  </div>

                  {/* Currency selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[#777777]">Currency:</span>
                    <select
                      value={release.currency || 'NGN'}
                      onChange={(e) => {
                        setRelease({ ...release, currency: e.target.value });
                        saveChanges({ currency: e.target.value });
                      }}
                      className="px-3 py-1.5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] font-mono font-bold focus:outline-none focus:border-[#171717]"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3-Card Aggregate Summary Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#777777]">
                      Total Suggested Budget
                    </span>
                    <p className="text-lg font-bold font-mono text-[#171717] mt-1">
                      {release.currency || 'NGN'} {totalSuggested.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-[#999999]">Proposed by Artist</span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#269568]">
                      Total Approved Rate
                    </span>
                    <p className="text-lg font-bold font-mono text-[#269568] mt-1">
                      {release.currency || 'NGN'} {totalApproved.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-[#269568]/80">Approved Recoupable Cap</span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#777777]">
                      Actual Incurred Spend
                    </span>
                    <p className="text-lg font-bold font-mono text-[#171717] mt-1">
                      {release.currency || 'NGN'} {totalActual.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-[#999999]">Logged Disbursed Receipts</span>
                  </div>
                </div>

                {/* Expense Ledger */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] text-xs text-[#171717] flex items-start space-x-3">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#171717]" />
                    <p className="leading-relaxed">
                      <strong className="font-semibold text-[#171717]">Suggested Budget Notice:</strong> All figures entered on this screen constitute the Artist&apos;s <strong>Suggested Budget</strong>. PHD Services review officers will evaluate each category and return an <strong>Approved Rate</strong> in accordance with Schedule A before execution.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                        Expense Ledger ({budgetItems.length} Categories)
                      </h3>
                      <p className="text-[11px] text-[#999999]">
                        Proposed expenses to be recouped prior to 70/30 distribution split
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const unusedCat = EXPENSE_CATEGORIES.find(
                          (c) => !budgetItems.some((b) => b.expenseCategory === c)
                        ) || EXPENSE_CATEGORIES[0];

                        const updated = [
                          ...budgetItems,
                          {
                            id: `temp_${Date.now()}`,
                            expenseCategory: unusedCat,
                            suggestedAmount: 0,
                            approvedAmount: 0,
                            actualAmount: 0,
                            approvalReference: `PHD-PROP-${Date.now().toString().slice(-4)}`,
                            approvalStatus: 'PENDING_REVIEW',
                            isEligibleRecoupable: true,
                            notes: '',
                          },
                        ];
                        setBudgetItems(updated);
                        saveChanges({ budgetItems: updated });
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#171717] hover:bg-[#262626] text-white rounded text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Expense Entry</span>
                    </button>
                  </div>

                  {budgetItems.length === 0 ? (
                    <div className="p-8 rounded-lg border border-dashed border-[#E8E8E8] text-center space-y-2 bg-[#F4F4F2]">
                      <DollarSign className="w-8 h-8 text-[#999999] mx-auto" />
                      <h4 className="text-xs font-semibold text-[#171717]">No Expense Entries Logged</h4>
                      <p className="text-[11px] text-[#777777] max-w-md mx-auto leading-relaxed">
                        If you have production, studio, mixing/mastering, or promotional costs that should be approved and recouped under Schedule A, add an expense item below.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [
                            {
                              id: `temp_${Date.now()}`,
                              expenseCategory: EXPENSE_CATEGORIES[0],
                              suggestedAmount: 0,
                              approvedAmount: 0,
                              actualAmount: 0,
                              approvalReference: `PHD-PROP-${Date.now().toString().slice(-4)}`,
                              approvalStatus: 'PENDING_REVIEW',
                              isEligibleRecoupable: true,
                              notes: '',
                            },
                          ];
                          setBudgetItems(updated);
                          saveChanges({ budgetItems: updated });
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Expense Entry</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {budgetItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-4 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] space-y-3 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E8E8] pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-[#171717]">{item.expenseCategory}</span>
                              <span
                                className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                                  item.approvalStatus === 'REJECTED'
                                    ? 'bg-[#FEF2F2] text-[#D64B4B] border-[#FECACA]'
                                    : item.approvalStatus === 'ADJUSTED'
                                    ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                                    : item.approvedAmount > 0 || item.approvalStatus === 'APPROVED'
                                    ? 'bg-[#ECFDF5] text-[#269568] border-[#A7F3D0]'
                                    : 'bg-[#FFFBEB] text-[#D69E36] border-[#FDE68A]'
                                }`}
                              >
                                {item.approvalStatus === 'REJECTED'
                                  ? 'Disallowed by PHD'
                                  : item.approvalStatus === 'ADJUSTED'
                                  ? `Adjusted Rate: ${release.currency} ${Number(item.approvedAmount).toLocaleString()}`
                                  : item.approvedAmount > 0 || item.approvalStatus === 'APPROVED'
                                  ? `Approved Rate: ${release.currency} ${Number(item.approvedAmount).toLocaleString()}`
                                  : 'Pending PHD Review'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3">
                              {item.approvalReference && (
                                <span className="text-[10px] font-mono text-[#777777]">
                                  Ref: {item.approvalReference}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove "${item.expenseCategory}" from budget items?`)) {
                                    const updated = budgetItems.filter((_, i) => i !== idx);
                                    setBudgetItems(updated);
                                    saveChanges({ budgetItems: updated });
                                  }
                                }}
                                className="p-1 rounded text-[#777777] hover:text-[#D64B4B] hover:bg-[#FEF2F2] transition-colors"
                                title="Remove expense entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] text-[#777777] mb-1">
                                Expense Category
                              </label>
                              <select
                                value={item.expenseCategory}
                                onChange={(e) => {
                                  const updated = [...budgetItems];
                                  updated[idx] = { ...updated[idx], expenseCategory: e.target.value };
                                  setBudgetItems(updated);
                                  saveChanges({ budgetItems: updated });
                                }}
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-[#171717] focus:outline-none focus:border-[#171717]"
                              >
                                {EXPENSE_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-[#171717] mb-1">
                                Artist Suggested Budget ({release.currency || 'NGN'}) *
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={item.suggestedAmount === 0 ? '' : item.suggestedAmount ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  const updated = [...budgetItems];
                                  updated[idx] = { ...updated[idx], suggestedAmount: val };
                                  setBudgetItems(updated);
                                }}
                                onBlur={() => saveChanges({ budgetItems })}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-[#171717] font-mono font-medium focus:outline-none focus:border-[#171717]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-[#777777] mb-1">
                                Actual Expenditure Incurred ({release.currency || 'NGN'})
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={item.actualAmount === 0 ? '' : item.actualAmount ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  const updated = [...budgetItems];
                                  updated[idx] = { ...updated[idx], actualAmount: val };
                                  setBudgetItems(updated);
                                }}
                                onBlur={() => saveChanges({ budgetItems })}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-[#171717] font-mono focus:outline-none focus:border-[#171717]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-[#777777] mb-1">Notes / Budget Justification</label>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => {
                                const updated = [...budgetItems];
                                updated[idx] = { ...updated[idx], notes: e.target.value };
                                setBudgetItems(updated);
                              }}
                              onBlur={() => saveChanges({ budgetItems })}
                              placeholder="e.g. 2 days studio time at Soundcity Studios..."
                              className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-[#171717] text-xs focus:outline-none focus:border-[#171717]"
                            />
                          </div>

                          {item.reviewerNotes && (
                            <div className="p-2.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717]">
                              <span className="font-semibold text-[#171717]">PHD Reviewer Feedback: </span>
                              <span className="text-[#777777]">{item.reviewerNotes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revenue Waterfall Simulator */}
                <RevenueSimulator
                  currency={release.currency || 'NGN'}
                  totalApprovedRecoupableCosts={totalRecoupable}
                />

                {/* Statutory Recoupment Legal Notice */}
                <div className="p-4 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg space-y-1.5">
                  <span className="text-xs font-bold text-[#171717] flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#171717]" />
                    <span>Schedule A – Part IV Statutory Recoupment Protections</span>
                  </span>
                  <p className="text-[11px] text-[#777777] leading-relaxed italic">
                    &ldquo;{RECOUPMENT_LEGAL_NOTICE}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E8E8E8] flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      saveChanges({ budgetItems });
                      setCurrentStep(4);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveChanges({ budgetItems });
                      setCurrentStep(6);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <span>Proceed to Final Execution & Signing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* STEP 6: REVIEW & DIGITAL SIGNATURES */}
          {currentStep === 6 && (
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-6">
              <div className="border-b border-[#E8E8E8] pb-3">
                <h2 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                  <PenTool className="w-4 h-4 text-[#171717]" />
                  <span>Digital Execution & Submission (Stage 2)</span>
                </h2>
                <p className="text-xs text-[#777777] mt-0.5">
                  Confirm statutory declarations, capture your signature, and submit to PHD Services.
                </p>
              </div>

              {submitError && (
                <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#D64B4B] space-y-1">
                  <div className="flex items-center space-x-2 font-semibold text-[#D64B4B]">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Submission Error</span>
                  </div>
                  <p className="whitespace-pre-line pl-6">{submitError}</p>
                </div>
              )}

              {/* Release Execution Summary Hero with Cover Artwork */}
              <div className="p-4 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-white border border-[#E8E8E8] overflow-hidden flex-shrink-0 flex items-center justify-center text-[#999999] shadow-md">
                  {artworkDeliverable?.fileUrl ? (
                    <img
                      src={artworkDeliverable.fileUrl}
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-1">
                      <ImageIcon className="w-6 h-6 mx-auto mb-0.5 text-[#999999]" />
                      <span className="text-[9px] text-[#999999]">No Art</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-[#171717] bg-[#F4F4F2] px-1.5 py-0.5 rounded border border-[#E8E8E8] font-bold">
                      {release.referenceNumber}
                    </span>
                    <span className="text-[#777777] font-medium truncate">
                      {release.releaseType} • {release.primaryArtist}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#171717] truncate">{release.title}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#777777] pt-0.5">
                    <span>
                      <strong>Tracks:</strong> {tracks.length} registered ({tracks.filter((t) => t.audioFileUrl).length} with master audio)
                    </span>
                    <span>
                      <strong>Cover Artwork:</strong>{' '}
                      {artworkDeliverable?.fileUrl ? (
                        <span className="text-[#269568] font-medium">✓ Uploaded</span>
                      ) : (
                        <span className="text-[#D64B4B] font-medium">✗ Missing</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Readiness / Critical Blockers Checklist Callout */}
              {currentReadiness.criticalBlockers.length > 0 ? (
                <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg space-y-2">
                  <div className="flex items-center space-x-2 text-[#D64B4B] font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-[#D64B4B] flex-shrink-0" />
                    <span>Submission Blocked — {currentReadiness.criticalBlockers.length} Critical Blocker{currentReadiness.criticalBlockers.length > 1 ? 's' : ''} Must Be Resolved:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#D64B4B]">
                    {currentReadiness.criticalBlockers.map((blocker, i) => (
                      <li key={i}>{blocker}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-[#D64B4B]/80 pt-1">
                    Please use the navigation above to return to previous steps and supply the missing assets or information before signing.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg flex items-center space-x-2 text-xs text-[#269568]">
                  <CheckCircle2 className="w-4 h-4 text-[#269568] flex-shrink-0" />
                  <span>All statutory Schedule A and Schedule B requirements are satisfied. The release is ready for legal execution.</span>
                </div>
              )}

              {/* Statutory Confirmation Box */}
              <div className="p-4 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-[#171717]">
                  Statutory Artist Confirmation (Schedule B – Part VIII)
                </h4>
                <p className="text-xs text-[#777777] italic leading-relaxed">
                  "{ARTIST_CONFIRMATION_TEXT}"
                </p>

                <label className="flex items-start space-x-2.5 pt-2 border-t border-[#E8E8E8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmDeclarations}
                    onChange={(e) => setConfirmDeclarations(e.target.checked)}
                    className="mt-0.5 accent-[#171717] rounded"
                  />
                  <span className="text-xs text-[#171717] font-medium leading-relaxed">
                    I confirm that I have disclosed all material ownership interests, third-party rights, and supplied accurate legal documentation under the Music Distribution, Management & Master Control Agreement.
                  </span>
                </label>
              </div>

              {/* Signer Legal Name */}
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1.5">
                  Artist Legal Name (Signatory) *
                </label>
                <input
                  type="text"
                  required
                  value={artistLegalName}
                  onChange={(e) => setArtistLegalName(e.target.value)}
                  placeholder="e.g. Damilola Emmanuel Kafaru"
                  className="w-full px-3.5 py-2.5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] font-medium"
                />
              </div>

              {/* Signature Pad */}
              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1.5">
                  Digital Signature Pad *
                </label>
                <SignaturePad
                  initialName={artistLegalName}
                  onSignatureChange={(sig, type) => {
                    setSignatureData(sig);
                    setSignatureType(type);
                  }}
                />
              </div>

              {/* Submission Button */}
              <div className="pt-4 border-t border-[#E8E8E8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || currentReadiness.criticalBlockers.length > 0}
                  onClick={handleSubmitRelease}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PenTool className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Submitting & Hashing...'
                      : currentReadiness.criticalBlockers.length > 0
                      ? 'Resolve Blockers to Submit'
                      : 'Sign & Submit Release to PHD'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Health & Readiness Meter + Summary */}
        <div className="space-y-6">
          <ReadinessMeter
            score={currentReadiness.score}
            submissionReady={currentReadiness.submissionReady}
            clearanceReady={currentReadiness.clearanceReady}
            criticalBlockers={currentReadiness.criticalBlockers}
            warnings={currentReadiness.warnings}
            completedItems={currentReadiness.completedItems}
          />

          <div className="bg-white border border-[#E8E8E8] rounded-lg p-4 space-y-3 text-xs">
            <h4 className="font-semibold text-[#171717] uppercase tracking-wider text-[11px]">
              Release Summary
            </h4>

            {artworkDeliverable?.fileUrl && (
              <div className="aspect-square w-full rounded-lg overflow-hidden border border-[#E8E8E8] bg-[#F4F4F2]">
                <img
                  src={artworkDeliverable.fileUrl}
                  alt={release.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2 text-[#777777]">
              <div className="flex justify-between">
                <span>Reference:</span>
                <span className="font-mono text-[#171717]">{release.referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tracks:</span>
                <span className="text-[#171717] font-medium">{tracks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Uploaded:</span>
                <span className={tracks.filter((t) => t.audioFileUrl).length === tracks.length && tracks.length > 0 ? 'text-[#269568] font-medium' : 'text-[#D69E36] font-medium'}>
                  {tracks.filter((t) => t.audioFileUrl).length} of {tracks.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cover Artwork:</span>
                <span className={artworkDeliverable?.fileUrl ? 'text-[#269568] font-medium' : 'text-[#D69E36] font-medium'}>
                  {artworkDeliverable?.fileUrl ? '✓ Uploaded' : '✗ Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Currency:</span>
                <span className="font-mono text-[#171717]">{release.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Clearances:</span>
                <span className="text-[#171717]">
                  {clearanceItems.filter((c) => c.status === 'Obtained').length} of{' '}
                  {clearanceItems.length} obtained
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

