'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, Music, FileText, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [contractNumber, setContractNumber] = useState('');
  const [artistName, setArtistName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!contractNumber.trim()) {
      setError('Authorized Contract Number is required.');
      return;
    }
    if (!artistName.trim()) {
      setError('Authorized Artist Name is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber: contractNumber.trim(),
          artistName: artistName.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
          stageName: artistName.trim(),
          legalName: name.trim(),
          role: 'ARTIST',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/artist');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-lg bg-[#171717] border border-[#E8E8E8] items-center justify-center p-2 mb-4 shadow-sm">
          <img
            src="/images/phd-logo.png"
            alt="PHD Services"
            className="w-full h-full object-contain filter invert"
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#171717]">
          Artist Onboarding & Registration
        </h1>
        <p className="text-[11px] font-mono text-[#777777] mt-1 uppercase tracking-widest">
          PHD Services Release Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E8E8E8] py-8 px-6 rounded-lg sm:px-10 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#D64B4B] font-medium leading-relaxed">
                {error}
              </div>
            )}

            {/* Contract Gate Notice */}
            <div className="p-3 bg-[#F4F4F2] border border-[#E8E8E8] rounded-md flex items-start space-x-2.5 text-xs text-[#171717]">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#171717]" />
              <p className="text-[11px] text-[#777777] leading-relaxed">
                Registration requires an authorized contract number and matching artist name issued by PHD Services.
              </p>
            </div>

            {/* Contract Number Field */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                Authorized Contract Number *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. PHD-CTR-2026-001"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E8E8E8] rounded-md text-sm text-[#171717] font-mono tracking-wider placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] uppercase transition-colors"
                />
              </div>
              <p className="text-[10px] text-[#999999] mt-1">
                Enter the unique contract reference provided in your agreement.
              </p>
            </div>

            {/* Authorized Artist Name Field */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                Authorized Artist / Stage Name *
              </label>
              <div className="relative">
                <Music className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="e.g. Dekaf"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E8E8E8] rounded-md text-sm text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
                />
              </div>
              <p className="text-[10px] text-[#999999] mt-1">
                Must match the artist name registered under your contract number.
              </p>
            </div>

            {/* Full Legal Name */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                Full Legal Name (For Statutory Agreements) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Damilola Emmanuel Kafaru"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E8E8E8] rounded-md text-sm text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="artist@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E8E8E8] rounded-md text-sm text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                Password (min. 8 characters) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E8E8E8] rounded-md text-sm text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-md bg-[#171717] hover:bg-[#262626] text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Verifying & Registering...' : 'Complete Registration'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-xs text-[#777777] hover:text-[#171717] transition-colors"
            >
              Already registered? Sign in here &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
