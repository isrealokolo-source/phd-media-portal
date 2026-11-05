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

  const isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'RELEASE_REVIEWER');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E8E8] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href={isAdmin ? '/admin' : '/artist'} className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E8E8] flex items-center justify-center p-1 overflow-hidden shadow-sm transition-all">
              <img src="/images/phd-logo.png" alt="PHD Services Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-tight text-[#171717] text-sm">PHD SERVICES</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#171717] text-white border border-[#171717]">
                  {user?.role?.replace(/_/g, ' ') || 'PORTAL'}
                </span>
              </div>
              <p className="text-[10px] text-[#777777]">Release Management & Rights Clearance</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-[#E8E8E8]">
            {isAdmin ? (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
                  }`}
                >
                  Submissions
                </Link>
                <Link
                  href="/admin/artists"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/artists' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
                  }`}
                >
                  Artists
                </Link>
                <Link
                  href="/admin/contracts"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/contracts' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
                  }`}
                >
                  Contracts
                </Link>
                <Link
                  href="/admin/users"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/users' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
                  }`}
                >
                  Users & Team
                </Link>
                <Link
                  href="/admin/audit"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/audit' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
                  }`}
                >
                  Audit Trail
                </Link>
                <Link
                  href="/admin/settings"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/admin/settings' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
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
                    pathname === '/artist' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/artist/releases/new"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/artist/releases/new' ? 'bg-[#171717] text-white' : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#171717] hover:bg-[#262626] text-white transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create User</span>
            </Link>
          )}

          {user?.role === 'ARTIST' && (
            <Link
              href="/artist/releases/new"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#171717] hover:bg-[#262626] text-white transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Release</span>
            </Link>
          )}

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-[#E8E8E8]">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-medium text-[#171717]">
                  {user.artistProfile?.stageName || user.name}
                </span>
                <span className="block text-[10px] text-[#777777] font-mono truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[#777777] hover:text-[#D64B4B] hover:bg-[#FEF2F2] transition-colors"
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

