'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  UserCheck,
  User,
  ShieldCheck,
  Filter,
} from 'lucide-react';

interface ContractItem {
  id: string;
  contractNumber: string;
  artistName: string;
  contractTitle: string;
  fileUrl: string | null;
  fileName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  claimedByUser: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  } | null;
}

interface ContractsConsoleProps {
  initialContracts: ContractItem[];
  currentUser: any;
}

export function ContractsConsole({ initialContracts, currentUser }: ContractsConsoleProps) {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractItem[]>(initialContracts);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLAIMED'>('ALL');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<ContractItem | null>(null);

  // Form states
  const [artistName, setArtistName] = useState('');
  const [contractTitle, setContractTitle] = useState('Recording & Distribution Agreement');
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setFormError('');

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'document');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.fileUrl) {
            setUploadedFile({ url: res.fileUrl, name: file.name });
          } else {
            setFormError(res.error || 'Failed to process contract file');
          }
        } catch {
          setFormError('Invalid server response');
        }
      } else {
        setFormError('File upload failed');
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setFormError('Network error uploading file');
    };

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistName.trim()) {
      setFormError('Artist name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistName: artistName.trim(),
          contractTitle: contractTitle.trim(),
          fileUrl: uploadedFile?.url || null,
          fileName: uploadedFile?.name || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create contract');
      }

      setContracts([data.contract, ...contracts]);
      setShowCreateModal(false);
      setShowSuccessModal(data.contract);

      // Reset form
      setArtistName('');
      setContractTitle('Recording & Distribution Agreement');
      setNotes('');
      setUploadedFile(null);
      setUploadProgress(0);
    } catch (err: any) {
      setFormError(err.message || 'Error creating contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unclaimed contract?')) return;
    try {
      const res = await fetch(`/api/admin/contracts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setContracts(contracts.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const filteredContracts = contracts.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.contractNumber.toLowerCase().includes(q) ||
        c.artistName.toLowerCase().includes(q) ||
        c.contractTitle.toLowerCase().includes(q) ||
        c.claimedByUser?.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E8E8]">
        <div>
          <h1 className="text-xl font-bold text-[#171717] flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-[#171717]" />
            <span>Artist Contracts & Registration Authorizations</span>
          </h1>
          <p className="text-xs text-[#777777] mt-1">
            Upload and issue binding contracts with unique numbers. Artists must provide matching contract number & artist name to register.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload & Authorize Contract</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E8E8E8]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#999999] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by contract number (e.g. PHD-CTR-2026-001) or artist name..."
            className="w-full pl-10 pr-4 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          {(['ALL', 'ACTIVE', 'CLAIMED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#171717] text-white font-semibold'
                  : 'bg-[#F4F4F2] text-[#777777] hover:text-[#171717]'
              }`}
            >
              {st === 'ALL' ? 'All Contracts' : st === 'ACTIVE' ? 'Active / Unclaimed' : 'Claimed / Registered'}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F4F2] text-[#777777] font-semibold border-b border-[#E8E8E8] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Contract Number</th>
                <th className="px-5 py-3.5">Authorized Artist</th>
                <th className="px-5 py-3.5">Contract Title & File</th>
                <th className="px-5 py-3.5">Registration Status</th>
                <th className="px-5 py-3.5">Issued By</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8] text-[#171717]">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#999999]">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No contracts found</p>
                    <p className="text-xs text-[#777777] mt-1">
                      Click &quot;Upload & Authorize Contract&quot; above to issue the first artist contract.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const isClaimed = c.status === 'CLAIMED';
                  return (
                    <tr key={c.id} className="hover:bg-[#F4F4F2] transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-[#171717] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-1 rounded-md">
                            {c.contractNumber}
                          </span>
                          <button
                            onClick={() => handleCopy(c.contractNumber, c.id)}
                            title="Copy Contract Number"
                            className="p-1 text-[#777777] hover:text-[#171717] transition-colors"
                          >
                            {copiedId === c.id ? (
                              <Check className="w-3.5 h-3.5 text-[#269568]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5 text-[#777777]" />
                          <span className="font-bold text-[#171717] text-sm">{c.artistName}</span>
                        </div>
                        {c.notes && <p className="text-[11px] text-[#999999] mt-0.5">{c.notes}</p>}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-[#171717]">{c.contractTitle}</div>
                        {c.fileUrl ? (
                          <a
                            href={c.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] text-[#171717] hover:text-[#171717] mt-1 font-mono"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{c.fileName || 'View Signed Agreement (PDF)'}</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-[#999999]">No document attached</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {isClaimed ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#269568] border border-[#A7F3D0]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Claimed & Registered
                            </span>
                            {c.claimedByUser && (
                              <div className="text-[10px] text-[#777777]">
                                User: <strong className="text-[#171717]">{c.claimedByUser.email}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#D69E36] border border-[#FDE68A]">
                            <Clock className="w-3 h-3 mr-1" />
                            Awaiting Registration
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-[#777777]">
                        <div>{c.uploadedBy?.name || 'Admin'}</div>
                        <div className="text-[10px] text-[#999999]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {!isClaimed && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 text-[#999999] hover:text-[#D64B4B] transition-colors rounded-lg hover:bg-[#FEF2F2]"
                            title="Delete Unclaimed Contract"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CONTRACT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-[#E8E8E8] rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E8]">
              <h3 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-[#171717]" />
                <span>Upload & Authorize Artist Contract</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#999999] hover:text-[#171717] text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#D64B4B] flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#171717] font-medium mb-1">
                  Artist / Stage Name * <span className="text-[#999999]">(Required for registration match)</span>
                </label>
                <input
                  type="text"
                  required
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="e.g. Dekaf, Blingbling99, Adaeze Vibes"
                  className="w-full px-3.5 py-2.5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-sm text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                />
                <p className="text-[11px] text-[#999999] mt-1">
                  When registering, the artist MUST input this exact name alongside their contract number.
                </p>
              </div>

              <div>
                <label className="block text-[#171717] font-medium mb-1">Contract Title</label>
                <input
                  type="text"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="e.g. Exclusive Recording & Distribution Agreement"
                  className="w-full px-3 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                />
              </div>

              {/* PDF Contract File Upload */}
              <div>
                <label className="block text-[#171717] font-medium mb-1">Signed Contract Document (PDF)</label>
                {uploadedFile ? (
                  <div className="p-3 bg-[#F4F4F2] border border-[#A7F3D0] rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-[#269568]" />
                      <span className="text-xs text-[#269568] font-medium">{uploadedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="text-xs text-[#D64B4B] hover:text-[#b83b3b] font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : isUploading ? (
                  <div className="p-4 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg space-y-2 text-center">
                    <div className="text-xs text-[#171717]">Uploading contract document... {uploadProgress}%</div>
                    <div className="w-full bg-[#F4F4F2] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#171717] h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border border-dashed border-[#E8E8E8] hover:border-[#171717] rounded-lg cursor-pointer bg-[#F4F4F2] transition-colors group">
                    <Upload className="w-5 h-5 text-[#777777] group-hover:text-[#171717] transition-colors mb-1" />
                    <span className="text-xs text-[#171717] font-medium">Click to select contract PDF</span>
                    <span className="text-[10px] text-[#999999] mt-0.5">Supports PDF up to 50MB</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-[#171717] font-medium mb-1">Internal Notes / Reference (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Signed 2-year non-exclusive digital distribution term with 80/20 royalty split"
                  className="w-full px-3 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E8E8] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating Contract...' : 'Issue & Authorize Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL DISPLAYING GENERATED CONTRACT NUMBER */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#A7F3D0] rounded-lg p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mx-auto text-[#269568]">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-[#171717]">Contract Issued Successfully!</h3>
            <p className="text-xs text-[#777777]">
              Contract has been logged and is ready for artist registration. Share the details below with the artist.
            </p>

            <div className="p-4 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-left space-y-2">
              <div>
                <span className="text-[10px] text-[#999999] uppercase tracking-wider font-semibold">Contract Number</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-[#171717] text-base">{showSuccessModal.contractNumber}</span>
                  <button
                    onClick={() => handleCopy(showSuccessModal.contractNumber, 'modal_num')}
                    className="flex items-center space-x-1 px-2 py-1 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded text-[11px] transition-colors"
                  >
                    {copiedId === 'modal_num' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === 'modal_num' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E8E8]">
                <span className="text-[10px] text-[#999999] uppercase tracking-wider font-semibold">Authorized Artist Name</span>
                <div className="font-bold text-[#171717] text-sm mt-0.5">{showSuccessModal.artistName}</div>
              </div>
            </div>

            <p className="text-[11px] text-[#777777]">
              The artist will need to enter both <strong>{showSuccessModal.contractNumber}</strong> and <strong>{showSuccessModal.artistName}</strong> to complete account registration at <span className="font-mono text-[#171717]">/register</span>.
            </p>

            <button
              onClick={() => setShowSuccessModal(null)}
              className="w-full py-2.5 bg-[#171717] hover:bg-[#262626] text-white font-bold rounded-lg text-xs transition-colors"
            >
              Done & Return to Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

