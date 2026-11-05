'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.user?.role === 'ARTIST') {
        router.push('/artist');
      } else {
        router.push('/admin');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Monochromatic Brand Mark */}
        <div className="inline-flex w-14 h-14 rounded-lg bg-[#171717] border border-[#E8E8E8] items-center justify-center p-2 mb-4 shadow-sm">
          <img
            src="/images/phd-logo.png"
            alt="PHD Services"
            className="w-full h-full object-contain filter invert"
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#171717]">
          PHD SERVICES
        </h1>
        <p className="text-[11px] font-mono text-[#777777] mt-1 uppercase tracking-widest">
          Release Management & Rights Clearance Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E8E8E8] py-8 px-6 rounded-lg sm:px-10 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#D64B4B] font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@phdservices.com or artist@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E8E8E8] rounded-md text-sm text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#171717]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
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
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-md bg-[#171717] hover:bg-[#262626] text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Logins for Pair Programming & Testing */}
          <div className="mt-6 pt-5 border-t border-[#E8E8E8] space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#999999] text-center">
              Quick Sign-In (Testing Accounts)
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fillCredentials('superadmin@phdservices.com', 'Admin@12345')}
                className="px-2.5 py-1.5 rounded bg-[#F4F4F2] hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] font-mono text-[10px] truncate transition-colors text-left"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('reviewer@phdservices.com', 'Reviewer@12345')}
                className="px-2.5 py-1.5 rounded bg-[#F4F4F2] hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] font-mono text-[10px] truncate transition-colors text-left"
              >
                Reviewer
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('fave@artist.com', 'Artist@12345')}
                className="px-2.5 py-1.5 rounded bg-[#F4F4F2] hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] font-mono text-[10px] truncate transition-colors text-left"
              >
                Artist (FAVE)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('victor.ad@artist.com', 'Artist@12345')}
                className="px-2.5 py-1.5 rounded bg-[#F4F4F2] hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] font-mono text-[10px] truncate transition-colors text-left"
              >
                Artist (Victor AD)
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E8E8E8] text-center">
            <Link
              href="/register"
              className="text-xs text-[#777777] hover:text-[#171717] font-medium transition-colors"
            >
              Register new artist account &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
