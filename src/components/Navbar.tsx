'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Disc3,
  Layers,
  FileCheck,
  Users,
  Settings,
  LogOut,
  Sparkles,
  Shield,
  FileText,
  Activity,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    artistProfile?: {
      stageName?: string;
    } | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPrefilling, setIsPrefilling] = useState(false);

  const isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'RELEASE_REVIEWER');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handlePrefillDemo = async () => {
    if (isPrefilling) return;
    setIsPrefilling(true);
    try {
      const res = await fetch('/api/releases/prefill-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.release?.id) {
        if (isAdmin) {
          router.push(`/admin/releases/${data.release.id}/review`);
        } else {
          router.push(`/artist/releases/${data.release.id}/edit`);
        }
        router.refresh();
      } else {
        alert(data.error || 'Failed to create demo release');
      }
    } catch (err) {
      alert('Error creating demo release');
    } finally {
      setIsPrefilling(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1F2430] bg-[#0B0D11]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href={isAdmin ? '/admin' : '/artist'} className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-[#E8E8E8] flex items-center justify-center p-1 overflow-hidden shadow-md group-hover:border-zinc-700 transition-all">
              <img src="/images/phd-logo.png" alt="PHD Services Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-tight text-white text-sm">PHD SERVICES</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#171717] text-white border border-[#171717]">
                  {user?.role?.replace(/_/g, ' ') || 'PORTAL'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Release Management & Rights Clearance</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-[#1F2430]">
            {isAdmin ? (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Submissions
                </Link>
                <Link
                  href="/admin/artists"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/artists' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Artists
                </Link>
                <Link
                  href="/admin/contracts"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/contracts' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Contracts
                </Link>
                <Link
                  href="/admin/users"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/users' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Users & Team
                </Link>
                <Link
                  href="/admin/audit"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/audit' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Audit Trail
                </Link>
                <Link
                  href="/admin/settings"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/settings' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Settings
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/artist"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/artist' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/artist/releases/new"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/artist/releases/new' ? 'bg-[#181C25] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Register Release
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {user?.role === 'SUPER_ADMIN' && (
            <Link
              href="/admin/users?create=true"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-900/30"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create User</span>
            </Link>
          )}

          {user?.role === 'ARTIST' && (
            <Link
              href="/artist/releases/new"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-900/30"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Release</span>
            </Link>
          )}

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-[#1F2430]">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-medium text-zinc-200">
                  {user.artistProfile?.stageName || user.name}
                </span>
                <span className="block text-[10px] text-zinc-400 font-mono truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-[#1A1F2B] transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

