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
  Trash2,
  AlertTriangle,
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

  // Delete user state (Super Admin only)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-lg bg-white border border-[#E8E8E8]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#171717]">
            Identity & Access Administration
          </span>
          <h1 className="text-xl font-bold text-[#171717] mt-1">Users & Team Management</h1>
          <p className="text-xs text-[#777777] mt-0.5">
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
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-900/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        ) : (
          <span className="text-[11px] font-mono text-[#999999] bg-white px-3 py-1.5 rounded-lg border border-[#E8E8E8]">
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
            className={`p-3.5 rounded-lg border text-left transition-all ${
              activeRoleFilter === item.filter
                ? 'bg-[#EFF6FF] border-indigo-700/60 shadow-sm'
                : 'bg-white border-[#E8E8E8] hover:border-[#2F374A]'
            }`}
          >
            <span className="text-[10px] text-[#777777] font-medium block uppercase tracking-wider">
              {item.label}
            </span>
            <span className="text-xl font-bold font-mono text-[#171717] mt-1 block">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#999999] absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or stage name..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#F4F4F2] text-[#777777] text-[10px] uppercase font-mono tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role & Permissions</th>
                <th className="py-3 px-4">Portfolio / Profile</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-[#999999]">
                    No users matching search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#151922] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#171717] font-bold text-xs uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-semibold text-[#171717] block">{u.name}</span>
                          <span className="text-[11px] text-[#777777] font-mono block">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border inline-block ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-[#171717] text-white border-[#171717]'
                            : u.role === 'ADMIN'
                            ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                            : u.role === 'RELEASE_REVIEWER'
                            ? 'bg-[#FFFBEB] text-[#D69E36] border-[#FDE68A]'
                            : 'bg-[#ECFDF5] text-[#269568] border-[#A7F3D0]'
                        }`}
                      >
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === 'ARTIST' ? (
                        <div>
                          <span className="font-medium text-[#171717] block">
                            {u.artistProfile?.stageName || u.name}
                          </span>
                          <span className="text-[10px] text-[#999999] block">
                            {u.artistProfile?.label || 'Independent'} • {u.artistProfile?.country || 'Nigeria'}
                          </span>
                          {u._count && u._count.releases > 0 && (
                            <span className="text-[10px] text-[#171717] font-mono">
                              {u._count.releases} release(s) registered
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#999999] italic text-[11px]">PHD Administrative Team</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 text-[#269568] text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#777777]">
                      {new Date(u.createdAt).toLocaleDateString('en-GB')}
                    </td>

                    {isSuperAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        {u.id === currentUser.id ? (
                          <span className="text-[10px] text-[#777777] font-mono italic">Current User</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('');
                              setUserToDelete(u);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[#D64B4B] hover:text-[#D64B4B] hover:bg-[#FEE2E2] bg-[#FEF2F2] border border-[#FECACA] transition-colors text-[11px]"
                            title={`Delete user ${u.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE USER CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E8E8] rounded-lg w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 text-[#D64B4B] mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#D64B4B]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171717]">Permanently Delete User</h3>
                <p className="text-xs text-[#D64B4B]/80">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg space-y-2 mb-4 text-xs">
              <p className="text-[#171717]">
                Are you sure you want to permanently delete <strong className="text-[#171717]">{userToDelete.name}</strong> (<span className="font-mono text-[#777777]">{userToDelete.email}</span>)?
              </p>
              <div className="text-[#777777] text-[11px] space-y-1">
                <div>Role: <strong className="text-[#171717]">{userToDelete.role}</strong></div>
                {userToDelete._count && userToDelete._count.releases > 0 && (
                  <div className="text-[#D64B4B] font-medium">
                    ⚠️ Warning: This user has {userToDelete._count.releases} release(s) that will be permanently purged along with associated assets.
                  </div>
                )}
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#D64B4B] text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 bg-white hover:bg-[#EAEAEA] text-[#171717] border border-[#E8E8E8] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-[#D64B4B] hover:bg-[#b83b3b] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E8E8E8] rounded-lg w-full max-w-xl p-6 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setCreatedSuccess(null);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {createdSuccess ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-12 h-12 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#269568] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">User Successfully Created!</h3>
                  <p className="text-xs text-[#777777] mt-1">
                    An account for <strong className="text-[#171717]">{createdSuccess.user.name}</strong> ({createdSuccess.user.email}) has been provisioned.
                  </p>
                </div>

                {createdSuccess.temporaryPassword && (
                  <div className="p-4 bg-[#F4F4F2] border border-[#BFDBFE] rounded-lg text-left space-y-2">
                    <span className="text-[10px] font-mono uppercase text-[#171717] block">
                      Generated Initial Password:
                    </span>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#E8E8E8]">
                      <span className="font-mono text-sm text-[#269568] font-bold">
                        {createdSuccess.temporaryPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdSuccess.temporaryPassword!)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-[#EAEAEA] border border-[#E8E8E8] rounded text-xs text-[#171717] transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedPass ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-[#777777]">
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
                    className="w-full py-2.5 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="border-b border-[#E8E8E8] pb-3">
                  <h3 className="text-base font-bold text-[#171717] flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-[#171717]" />
                    <span>Create & Provision New Portal User</span>
                  </h3>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Assign role authorization and issue sign-in credentials.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#D64B4B]">
                    {errorMessage}
                  </div>
                )}

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1.5">
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
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          role === item.key
                            ? 'bg-[#EFF6FF] border-[#171717] shadow-sm'
                            : 'bg-[#F4F4F2] border-[#E8E8E8] hover:border-[#171717]'
                        }`}
                      >
                        <span className="font-semibold text-xs text-[#171717] block">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[#777777] block mt-0.5 leading-tight">
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#171717] mb-1">
                      Full Legal / Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Samuel Adeyemi"
                      className="w-full px-3 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#171717] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. samuel@example.com"
                      className="w-full px-3 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                    />
                  </div>
                </div>

                {/* Password Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#171717]">
                      Initial Password (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-[#171717] hover:text-[#171717] flex items-center space-x-1"
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
                    className="w-full px-3 py-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg text-xs text-[#171717] font-mono focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                  />
                </div>

                {/* Artist Profile Fields if Role is ARTIST */}
                {role === 'ARTIST' && (
                  <div className="p-3.5 bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#171717] block">
                      Artist Profile Registration Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-[#777777] mb-1">Stage / Performing Name</label>
                        <input
                          type="text"
                          value={stageName}
                          onChange={(e) => setStageName(e.target.value)}
                          placeholder="e.g. Samy B"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-xs text-[#171717]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#777777] mb-1">Record Label / Imprint</label>
                        <input
                          type="text"
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder="e.g. Independent / Starline Records"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-xs text-[#171717]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#777777] mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+234 801 234 5678"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-xs text-[#171717]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#777777] mb-1">Country</label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Nigeria"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8E8E8] rounded text-xs text-[#171717]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email invitation checkbox */}
                <div className="pt-1">
                  <label className="flex items-center space-x-2 text-xs text-[#171717] cursor-pointer">
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
                <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-white hover:bg-[#252C3D] text-[#171717] rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 px-5 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-900/30 disabled:opacity-50"
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

