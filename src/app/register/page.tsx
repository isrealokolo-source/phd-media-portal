'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Disc3, User, Mail, Lock, ArrowRight, Music, FileText, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0B0D11] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-zinc-900 border border-[#1F2430] items-center justify-center p-2 shadow-xl shadow-black/40 mb-4">
          <img src="/images/phd-logo.png" alt="PHD Services Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Artist Onboarding & Registration
        </h2>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest">
          PHD Services Release Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#12151B] border border-[#1F2430] py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-xs text-rose-300 leading-relaxed">
                {error}
              </div>
            )}

            {/* Contract Gate Notice */}
            <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl flex items-start space-x-2.5 text-[11px] text-indigo-300">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
              <p>
                Registration requires an authorized contract number and matching artist name issued by PHD Services.
              </p>
            </div>

            {/* Contract Number Field */}
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                Authorized Contract Number *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-indigo-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. PHD-CTR-2026-001"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0E1015] border border-indigo-900/50 rounded-lg text-sm text-zinc-100 font-mono tracking-wider focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Enter the unique contract reference provided in your agreement.
              </p>
            </div>

            {/* Authorized Artist Name Field */}
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                Authorized Artist / Stage Name *
              </label>
              <div className="relative">
                <Music className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="e.g. Dekaf"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0E1015] border border-[#2A3142] rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Must match the artist name registered under your contract number.
              </p>
            </div>

            {/* Full Legal Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Full Legal Name (For Statutory Agreements) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Damilola Emmanuel Kafaru"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0E1015] border border-[#2A3142] rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="artist@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0E1015] border border-[#2A3142] rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password (min. 8 characters) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0E1015] border border-[#2A3142] rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-900/30 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Verifying Contract & Creating Account...' : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Already registered? Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
