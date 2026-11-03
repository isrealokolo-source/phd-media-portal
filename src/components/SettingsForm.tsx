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
      className="bg-[#12151B] border border-[#1F2430] rounded-2xl p-6 space-y-6 text-xs shadow-lg"
    >
      {success && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/40 rounded-xl text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>System configuration successfully updated.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/40 rounded-xl text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-zinc-300 font-medium mb-1">Company Entity Name</label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-zinc-300 font-medium mb-1">Administrative Operations Email</label>
          <input
            type="email"
            required
            value={administrativeEmail}
            onChange={(e) => setAdministrativeEmail(e.target.value)}
            className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-zinc-300 font-medium mb-1">Default Authorized Signatory</label>
          <input
            type="text"
            required
            value={defaultAuthorizedRep}
            onChange={(e) => setDefaultAuthorizedRep(e.target.value)}
            className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-zinc-300 font-medium mb-1">Default Representative Position</label>
          <input
            type="text"
            required
            value={defaultRepPosition}
            onChange={(e) => setDefaultRepPosition(e.target.value)}
            className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-zinc-300 font-medium mb-1">Release Reference Prefix</label>
          <input
            type="text"
            required
            value={releaseReferencePrefix}
            onChange={(e) => setReleaseReferencePrefix(e.target.value)}
            placeholder="PHD"
            className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200 font-mono uppercase"
          />
        </div>

        <div>
          <label className="block text-zinc-300 font-medium mb-1">Max File Upload Size (MB)</label>
          <input
            type="number"
            required
            value={maxFileUploadMb}
            onChange={(e) => setMaxFileUploadMb(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-zinc-300 font-medium mb-1">Company Contact Information / Address</label>
        <textarea
          rows={2}
          value={companyContactInfo}
          onChange={(e) => setCompanyContactInfo(e.target.value)}
          className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-zinc-200"
        />
      </div>

      <div className="pt-4 border-t border-[#1F2430] flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-900/30 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>
    </form>
  );
}

