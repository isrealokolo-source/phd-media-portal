'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Disc3, AlertCircle, ArrowLeft } from 'lucide-react';

export default function NewReleasePage() {
  const router = useRouter();
  const hasCreated = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasCreated.current) return;
    hasCreated.current = true;

    async function createDraft() {
      try {
        const res = await fetch('/api/releases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Untitled Release',
            releaseType: 'Single',
          }),
        });

        if (res.status === 401) {
          router.replace('/login');
          return;
        }

        const data = await res.json();
        if (!res.ok || !data.release?.id) {
          throw new Error(data.error || 'Failed to initialize release registration');
        }

        router.replace(`/artist/releases/${data.release.id}/edit`);
      } catch (err: any) {
        setError(err.message || 'Unable to create release draft');
      }
    }

    createDraft();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-white border border-[#E8E8E8] rounded-lg p-8 shadow-sm text-center space-y-4">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#D64B4B] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-bold text-[#171717]">Initialization Error</h1>
              <p className="text-xs text-[#D64B4B] leading-relaxed">{error}</p>
            </div>
            <div className="pt-2">
              <Link
                href="/artist"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-md text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Releases Catalogue</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-lg bg-[#171717] text-white flex items-center justify-center mx-auto">
              <Disc3 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
                Schedule A & B Provisioning
              </span>
              <h1 className="text-base font-bold text-[#171717]">
                Initializing Release Registration...
              </h1>
              <p className="text-xs text-[#777777] leading-relaxed">
                Allocating sequential PHD catalogue reference number and preparing statutory clearance registers.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
