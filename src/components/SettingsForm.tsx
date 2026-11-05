'use client';

import React, { useState } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';

export function SettingsForm({ initialSettings }: { initialSettings: any }) {
  const [companyName, setCompanyName] = useState(initialSettings?.companyName || 'PHD Services');
  const [administrativeEmail, setAdministrativeEmail] = useState(
    initialSettings?.administrativeEmail || 'operations@phdservices.com'
  );
  const [companyContactInfo, setCompanyContactInfo] = useState(
    initialSettings?.companyContactInfo || 'PHD Services HQ, Lagos / London'
  );
  const [defaultAuthorizedRep, setDefaultAuthorizedRep] = useState(
    initialSettings?.defaultAuthorizedRep || 'Authorised Representative'
  );
  const [defaultRepPosition, setDefaultRepPosition] = useState(
    initialSettings?.defaultRepPosition || 'Head of Legal & Business Affairs'
  );
  const [releaseReferencePrefix, setReleaseReferencePrefix] = useState(
    initialSettings?.releaseReferencePrefix || 'PHD'
  );
  const [maxFileUploadMb, setMaxFileUploadMb] = useState(
    initialSettings?.maxFileUploadMb || 100
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          administrativeEmail,
          companyContactInfo,
          defaultAuthorizedRep,
          defaultRepPosition,
          releaseReferencePrefix,
          maxFileUploadMb,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#E8E8E8] rounded-lg p-6 sm:p-8 space-y-6 text-xs shadow-sm select-none"
    >
      {success && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-md text-[#269568] flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>System configuration successfully updated.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[#D64B4B] flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[#171717] font-semibold mb-1.5">Company Legal Entity</label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-[#E8E8E8] rounded-md text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div>
          <label className="block text-[#171717] font-semibold mb-1.5">Administrative Operations Email</label>
          <input
            type="email"
            required
            value={administrativeEmail}
            onChange={(e) => setAdministrativeEmail(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-[#E8E8E8] rounded-md text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div>
          <label className="block text-[#171717] font-semibold mb-1.5">Default Countersigning Officer</label>
          <input
            type="text"
            required
            value={defaultAuthorizedRep}
            onChange={(e) => setDefaultAuthorizedRep(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-[#E8E8E8] rounded-md text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div>
          <label className="block text-[#171717] font-semibold mb-1.5">Officer Legal Title / Position</label>
          <input
            type="text"
            required
            value={defaultRepPosition}
            onChange={(e) => setDefaultRepPosition(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-[#E8E8E8] rounded-md text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div>
          <label className="block text-[#171717] font-semibold mb-1.5">Release Reference Prefix</label>
          <input
            type="text"
            required
            value={releaseReferencePrefix}
            onChange={(e) => setReleaseReferencePrefix(e.target.value.toUpperCase())}
            className="w-full px-3.5 py-2 bg-white border border-[#E8E8E8] rounded-md text-[#171717] font-mono uppercase focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div>
          <label className="block text-[#171717] font-semibold mb-1.5">Max File Upload Limit (MB)</label>
          <input
            type="number"
            required
            min={10}
            max={500}
            value={maxFileUploadMb}
            onChange={(e) => setMaxFileUploadMb(Number(e.target.value))}
            className="w-full px-3.5 py-2 bg-white border border-[#E8E8E8] rounded-md text-[#171717] font-mono focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
        </div>
      </div>

      <div>
        <label className="block text-[#171717] font-semibold mb-1.5">Corporate Notice & Registered Address</label>
        <textarea
          rows={2}
          value={companyContactInfo}
          onChange={(e) => setCompanyContactInfo(e.target.value)}
          className="w-full px-3.5 py-2 bg-white border border-[#E8E8E8] rounded-md text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-[#171717] hover:bg-[#262626] text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Settings...' : 'Save Configuration'}</span>
        </button>
      </div>
    </form>
  );
}
