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
  Menu,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export interface AppLayoutProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    artistProfile?: {
      stageName?: string | null;
      legalName?: string | null;
    } | null;
  } | null;
  children: React.ReactNode;
  breadcrumb?: string;
  action?: React.ReactNode;
}

export function AppLayout({ user, children, breadcrumb, action }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);

  const isAdmin =
    user &&
    (user.role === 'SUPER_ADMIN' ||
      user.role === 'ADMIN' ||
      user.role === 'RELEASE_REVIEWER');

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
    } catch {
      alert('Error creating demo release');
    } finally {
      setIsPrefilling(false);
    }
  };

  // Nav Items
  const adminNav = [
    { label: 'Submissions', href: '/admin', icon: Layers },
    { label: 'Artists', href: '/admin/artists', icon: Users },
    { label: 'Contracts', href: '/admin/contracts', icon: FileText },
    { label: 'Users & Team', href: '/admin/users', icon: Shield },
    { label: 'Audit Trail', href: '/admin/audit', icon: Activity },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const artistNav = [
    { label: 'Releases Catalogue', href: '/artist', icon: Disc3 },
    { label: 'Register Release', href: '/artist/releases/new', icon: PlusCircle },
  ];

  const navItems = isAdmin ? adminNav : artistNav;

  const displayName = user?.artistProfile?.stageName || user?.name || 'User';

  return (
    <div className="min-h-screen bg-[#F4F4F2] text-[#171717] flex">
      {/* DESKTOP SIDEBAR (256px wide, fixed) */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-[#E8E8E8] fixed inset-y-0 left-0 z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-[#E8E8E8] flex items-center justify-between">
          <Link
            href={isAdmin ? '/admin' : '/artist'}
            className="flex items-center space-x-3 group"
          >
            <div className="w-8 h-8 rounded-md bg-[#171717] border border-[#E8E8E8] flex items-center justify-center p-1.5 shadow-sm group-hover:bg-[#262626] transition-colors">
              <img
                src="/images/phd-logo.png"
                alt="PHD Services"
                className="w-full h-full object-contain filter invert"
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs tracking-tight text-[#171717]">
                  PHD SERVICES
                </span>
              </div>
              <p className="text-[10px] text-[#777777] font-medium tracking-tight">
                Media & Rights Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Role Pill */}
        <div className="px-6 pt-4 pb-2">
          <div className="inline-flex items-center px-2 py-0.5 rounded bg-[#F4F4F2] border border-[#E8E8E8] text-[10px] font-mono uppercase tracking-wider text-[#777777]">
            {user?.role?.replace(/_/g, ' ') || 'PORTAL'}
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#999999]">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : item.href === '/artist'
                ? pathname === '/artist'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#171717] text-white'
                    : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#777777]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Quick Demo Pre-fill */}
          <div className="pt-6 px-3">
            <div className="pb-1 text-[10px] font-mono uppercase tracking-wider text-[#999999]">
              Developer Tools
            </div>
            <button
              type="button"
              onClick={handlePrefillDemo}
              disabled={isPrefilling}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-xs text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2] transition-colors border border-dashed border-[#E8E8E8]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#777777]" />
              <span>{isPrefilling ? 'Generating...' : 'Load Sample Demo'}</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="p-4 border-t border-[#E8E8E8] bg-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold text-[#171717] truncate">{displayName}</p>
              <p className="text-[10px] text-[#777777] font-mono truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-md text-[#777777] hover:text-[#D64B4B] hover:bg-[#F4F4F2] transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80%] bg-white border-r border-[#E8E8E8] flex flex-col justify-between z-10 p-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8]">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded bg-[#171717] flex items-center justify-center p-1">
                    <img
                      src="/images/phd-logo.png"
                      alt="PHD"
                      className="w-full h-full object-contain filter invert"
                    />
                  </div>
                  <span className="font-bold text-xs">PHD SERVICES</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-[#777777] hover:text-[#171717]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : item.href === '/artist'
                      ? pathname === '/artist'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium ${
                        isActive
                          ? 'bg-[#171717] text-white'
                          : 'text-[#777777] hover:bg-[#F4F4F2] hover:text-[#171717]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold truncate">{displayName}</p>
                  <p className="text-[10px] text-[#777777] font-mono truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-[#777777] hover:text-[#D64B4B]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-[#E8E8E8] sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#999999] hidden sm:inline">PHD Services</span>
              <span className="text-[#E8E8E8] hidden sm:inline">/</span>
              <span className="font-semibold text-[#171717]">
                {breadcrumb || (isAdmin ? 'Admin Console' : 'Artist Portal')}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            {action}

            {user?.role === 'ARTIST' && !action && (
              <Link
                href="/artist/releases/new"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#171717] hover:bg-[#262626] text-white text-xs font-medium transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Release</span>
              </Link>
            )}

            {/* Profile Dropdown / Logout */}
            <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-[#E8E8E8]">
              <span className="text-xs font-medium text-[#171717]">{displayName}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-md text-[#777777] hover:text-[#D64B4B] hover:bg-[#F4F4F2] transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Keep Navbar export pointing to AppLayout or as header component for full backward-compatibility
export function Navbar({ user }: { user: any }) {
  // Return null or minimalist header if imported standalone
  return null;
}
