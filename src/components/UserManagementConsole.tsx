'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  Copy,
  Lock,
  Mail,
  User,
  Music,
  Globe,
  Phone,
  Tag,
  KeyRound,
  X,
  Sparkles,
} from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'RELEASE_REVIEWER' | 'ARTIST';
  isEmailVerified: boolean;
  createdAt: string | Date;
  artistProfile?: {
    stageName?: string;
    legalName?: string;
    label?: string;
    country?: string;
    phone?: string;
  } | null;
  _count?: {
    releases: number;
  };
}

interface UserManagementConsoleProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  initialUsers: UserData[];
}

export function UserManagementConsole({ currentUser, initialUsers }: UserManagementConsoleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // State
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');

  // Create User Form State
  const [role, setRole] = useState<'ARTIST' | 'RELEASE_REVIEWER' | 'ADMIN' | 'SUPER_ADMIN'>('ARTIST');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [sendInviteEmail, setSendInviteEmail] = useState(true);

  // Artist specific fields
  const [stageName, setStageName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [label, setLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Nigeria');

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState<{
    user: any;
    temporaryPassword?: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesRole = activeRoleFilter === 'ALL' || u.role === activeRoleFilter;
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.artistProfile?.stageName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleGeneratePassword = () => {
    const random = Math.random().toString(36).slice(-8) + '!';
    setCustomPassword(`PHD-${random}`);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload: any = {
        name,
        email,
        role,
        sendInviteEmail,
      };

      if (customPassword.trim()) {
        payload.password = customPassword.trim();
      }

      if (role === 'ARTIST') {
        payload.stageName = stageName.trim() || name.trim();
        payload.legalName = legalName.trim() || name.trim();
        payload.label = label.trim() || 'Independent';
        payload.phone = phone.trim();
        payload.country = country.trim();
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create user account');
      }

      setCreatedSuccess({
        user: data.user,
        temporaryPassword: data.temporaryPassword,
      });

      // Update local list
      setUsers([data.user, ...users]);
      router.refresh();

      // Reset form
      setName('');
      setEmail('');
      setCustomPassword('');
      setStageName('');
      setLegalName('');
      setLabel('');
      setPhone('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#12151B] border border-[#1F2430]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            Identity & Access Administration
          </span>
          <h1 className="text-xl font-bold text-white mt-1">Users & Team Management</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Provision user accounts, assign role permissions, and manage platform credentials.
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            type="button"
            onClick={() => {
              setErrorMessage('');
              setCreatedSuccess(null);
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        ) : (
          <span className="text-[11px] font-mono text-zinc-500 bg-[#1A1F2B] px-3 py-1.5 rounded-lg border border-[#262D3D]">
            User Provisioning Restricted to Super Admin
          </span>
        )}
      </div>

      {/* Role Counts Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'All Users', count: users.length, filter: 'ALL' },
          {
            label: 'Super Admins',
            count: users.filter((u) => u.role === 'SUPER_ADMIN').length,
            filter: 'SUPER_ADMIN',
          },
          {
            label: 'Administrators',
            count: users.filter((u) => u.role === 'ADMIN').length,
            filter: 'ADMIN',
          },
          {
            label: 'Reviewers',
            count: users.filter((u) => u.role === 'RELEASE_REVIEWER').length,
            filter: 'RELEASE_REVIEWER',
          },
          {
            label: 'Signed Artists',
            count: users.filter((u) => u.role === 'ARTIST').length,
            filter: 'ARTIST',
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActiveRoleFilter(item.filter)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeRoleFilter === item.filter
                ? 'bg-indigo-950/40 border-indigo-700/60 shadow-sm'
                : 'bg-[#12151B] border-[#1F2430] hover:border-[#2F374A]'
            }`}
          >
            <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider">
              {item.label}
            </span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or stage name..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#12151B] border border-[#1F2430] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Users Table */}
      <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1F2430] bg-[#0E1015] text-zinc-400 text-[10px] uppercase font-mono tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role & Permissions</th>
                <th className="py-3 px-4">Portfolio / Profile</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2430]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No users matching search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#151922] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-100 block">{u.name}</span>
                          <span className="text-[11px] text-zinc-400 font-mono block">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border inline-block ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : u.role === 'ADMIN'
                            ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                            : u.role === 'RELEASE_REVIEWER'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === 'ARTIST' ? (
                        <div>
                          <span className="font-medium text-zinc-200 block">
                            {u.artistProfile?.stageName || u.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 block">
                            {u.artistProfile?.label || 'Independent'} • {u.artistProfile?.country || 'Nigeria'}
                          </span>
                          {u._count && u._count.releases > 0 && (
                            <span className="text-[10px] text-indigo-400 font-mono">
                              {u._count.releases} release(s) registered
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic text-[11px]">PHD Administrative Team</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12151B] border border-[#1F2430] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setCreatedSuccess(null);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A1F2B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {createdSuccess ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">User Successfully Created!</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    An account for <strong className="text-white">{createdSuccess.user.name}</strong> ({createdSuccess.user.email}) has been provisioned.
                  </p>
                </div>

                {createdSuccess.temporaryPassword && (
                  <div className="p-4 bg-[#0E1015] border border-indigo-800/40 rounded-xl text-left space-y-2">
                    <span className="text-[10px] font-mono uppercase text-indigo-400 block">
                      Generated Initial Password:
                    </span>
                    <div className="flex items-center justify-between bg-[#151922] p-2.5 rounded-lg border border-[#262D3D]">
                      <span className="font-mono text-sm text-emerald-300 font-bold">
                        {createdSuccess.temporaryPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdSuccess.temporaryPassword!)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 rounded text-xs text-indigo-200 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedPass ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      This password has been recorded and transmitted to the recipient via transactional email.
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedSuccess(null);
                      setShowCreateModal(false);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="border-b border-[#1F2430] pb-3">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    <span>Create & Provision New Portal User</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Assign role authorization and issue sign-in credentials.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/40 rounded-xl text-xs text-rose-300">
                    {errorMessage}
                  </div>
                )}

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Role & Authority Level *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        key: 'ARTIST',
                        label: 'Artist',
                        desc: 'Create, sign Schedules A & B, submit releases',
                      },
                      {
                        key: 'RELEASE_REVIEWER',
                        label: 'Release Reviewer',
                        desc: 'Inspect tracks, review clearances & budget',
                      },
                      {
                        key: 'ADMIN',
                        label: 'Administrator',
                        desc: 'Review, manage, countersign & execute releases',
                      },
                      {
                        key: 'SUPER_ADMIN',
                        label: 'Super Admin',
                        desc: 'Full root access, user provisioning, settings',
                      },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setRole(item.key as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          role === item.key
                            ? 'bg-indigo-950/60 border-indigo-600 shadow-sm'
                            : 'bg-[#0E1015] border-[#1F2430] hover:border-[#2A3142]'
                        }`}
                      >
                        <span className="font-semibold text-xs text-white block">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Full Legal / Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Samuel Adeyemi"
                      className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. samuel@example.com"
                      className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Password Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-zinc-300">
                      Initial Password (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave empty to automatically generate a secure password"
                    className="w-full px-3 py-2 bg-[#0E1015] border border-[#262D3D] rounded-lg text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Artist Profile Fields if Role is ARTIST */}
                {role === 'ARTIST' && (
                  <div className="p-3.5 bg-[#0E1015] border border-[#1F2430] rounded-xl space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block">
                      Artist Profile Registration Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Stage / Performing Name</label>
                        <input
                          type="text"
                          value={stageName}
                          onChange={(e) => setStageName(e.target.value)}
                          placeholder="e.g. Samy B"
                          className="w-full px-2.5 py-1.5 bg-[#141820] border border-[#262D3D] rounded text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Record Label / Imprint</label>
                        <input
                          type="text"
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder="e.g. Independent / Starline Records"
                          className="w-full px-2.5 py-1.5 bg-[#141820] border border-[#262D3D] rounded text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+234 801 234 5678"
                          className="w-full px-2.5 py-1.5 bg-[#141820] border border-[#262D3D] rounded text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Country</label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Nigeria"
                          className="w-full px-2.5 py-1.5 bg-[#141820] border border-[#262D3D] rounded text-xs text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email invitation checkbox */}
                <div className="pt-1">
                  <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInviteEmail}
                      onChange={(e) => setSendInviteEmail(e.target.checked)}
                      className="accent-indigo-600 rounded"
                    />
                    <span>Send welcome invitation email with login credentials</span>
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-3 border-t border-[#1F2430] flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/30 disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Provisioning...' : 'Create Account'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

