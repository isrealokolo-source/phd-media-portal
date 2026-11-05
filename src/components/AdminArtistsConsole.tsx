'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Mail,
  Disc3,
  ExternalLink,
  PlusCircle,
  Globe,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ArtistItem {
  id: string;
  name: string;
  email: string;
  createdAt: string | Date;
  artistProfile?: {
    stageName?: string | null;
    legalName?: string | null;
    country?: string | null;
    label?: string | null;
    phone?: string | null;
  } | null;
  releases: {
    id: string;
    title: string;
    referenceNumber: string;
    status: string;
    createdAt: string | Date;
  }[];
}

interface AdminArtistsConsoleProps {
  initialArtists: ArtistItem[];
}

export function AdminArtistsConsole({ initialArtists }: AdminArtistsConsoleProps) {
  const [artists, setArtists] = useState<ArtistItem[]>(initialArtists);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');

  // Compute unique countries
  const countries = Array.from(
    new Set(
      artists
        .map((a) => a.artistProfile?.country || 'Nigeria')
        .filter(Boolean)
    )
  );

  const totalReleasesCount = artists.reduce((acc, a) => acc + a.releases.length, 0);

  const filteredArtists = artists.filter((a) => {
    if (selectedCountry !== 'ALL') {
      const country = a.artistProfile?.country || 'Nigeria';
      if (country !== selectedCountry) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.name.toLowerCase().includes(q);
      const matchStage = a.artistProfile?.stageName?.toLowerCase().includes(q);
      const matchLegal = a.artistProfile?.legalName?.toLowerCase().includes(q);
      const matchEmail = a.email.toLowerCase().includes(q);
      const matchLabel = a.artistProfile?.label?.toLowerCase().includes(q);
      if (!matchName && !matchStage && !matchLegal && !matchEmail && !matchLabel) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#12151B] border border-[#1F2430] shadow-xl">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            Artist Portfolio & Talent Roster
          </span>
          <h1 className="text-xl font-bold text-white mt-1">Artist Registry</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage signed artists, view catalogue release histories, and communicate directly with talent.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/admin/users?create=true"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-900/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Artist Account</span>
          </Link>
        </div>
      </div>

      {/* Roster Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-[#12151B] border border-[#1F2430] rounded-xl">
          <span className="text-zinc-500 block uppercase font-mono text-[10px]">Total Signed Artists</span>
          <span className="text-2xl font-bold font-mono text-zinc-100 mt-1 block">{artists.length}</span>
        </div>

        <div className="p-4 bg-[#12151B] border border-indigo-900/40 rounded-xl">
          <span className="text-indigo-400 block uppercase font-mono text-[10px]">Total Active Releases</span>
          <span className="text-2xl font-bold font-mono text-indigo-300 mt-1 block">{totalReleasesCount}</span>
        </div>

        <div className="p-4 bg-[#12151B] border border-[#1F2430] rounded-xl">
          <span className="text-zinc-500 block uppercase font-mono text-[10px]">Countries Represented</span>
          <span className="text-2xl font-bold font-mono text-zinc-100 mt-1 block">{countries.length}</span>
        </div>

        <div className="p-4 bg-[#12151B] border border-emerald-900/40 rounded-xl">
          <span className="text-emerald-400 block uppercase font-mono text-[10px]">Roster Health</span>
          <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">100% Verified</span>
        </div>
      </div>

      {/* Search & Country Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by stage name, legal name, email, label..."
            className="w-full pl-10 pr-4 py-2 bg-[#12151B] border border-[#1F2430] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {countries.length > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCountry('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCountry === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#12151B] text-zinc-400 hover:text-zinc-200 border border-[#1F2430]'
              }`}
            >
              All Territories
            </button>
            {countries.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCountry(c)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCountry === c
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[#12151B] text-zinc-400 hover:text-zinc-200 border border-[#1F2430]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Artist Grid */}
      {filteredArtists.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#12151B] border border-dashed border-[#262D3D] space-y-3">
          <Users className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400">No artists matching search criteria.</p>
          {(searchQuery || selectedCountry !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCountry('ALL');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArtists.map((artist) => {
            const stageName = artist.artistProfile?.stageName || artist.name;
            const legalName = artist.artistProfile?.legalName || artist.name;

            return (
              <div
                key={artist.id}
                className="p-5 rounded-2xl bg-[#12151B] border border-[#1F2430] hover:border-[#2E374A] transition-all space-y-4 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-300 font-bold text-sm uppercase flex-shrink-0">
                        {stageName.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-zinc-100 truncate">{stageName}</h3>
                        <p className="text-xs text-zinc-400 truncate">Legal: {legalName}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 flex-shrink-0">
                      {artist.artistProfile?.country || 'Nigeria'}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 space-y-1 font-mono pt-1">
                    <div className="flex items-center space-x-1.5 text-zinc-400">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span className="truncate">{artist.email}</span>
                    </div>
                    {artist.artistProfile?.label && (
                      <div className="text-[11px] text-zinc-500 font-sans">
                        Label / Imprint: <strong className="text-zinc-300">{artist.artistProfile.label}</strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#1F2430] space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Releases Registered:</span>
                      <span className="font-bold font-mono text-zinc-100 bg-[#0E1015] px-2 py-0.5 rounded border border-[#1F2430]">
                        {artist.releases.length} project(s)
                      </span>
                    </div>

                    {artist.releases.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                          Recent Projects:
                        </span>
                        {artist.releases.slice(0, 3).map((r) => (
                          <Link
                            key={r.id}
                            href={`/admin/releases/${r.id}/review`}
                            className="flex justify-between items-center text-[11px] p-1.5 rounded-lg bg-[#0E1015] hover:bg-[#161B24] border border-[#1F2430] transition-colors group"
                          >
                            <span className="text-zinc-300 truncate max-w-[170px] group-hover:text-indigo-300">
                              {r.title}
                            </span>
                            <span className="text-[9px] font-mono text-indigo-400 font-bold">
                              {r.referenceNumber}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1F2430] flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${artist.email}?subject=PHD%20Services%20-%20Release%20Catalogue%20Inquiry`}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-300 hover:text-white text-xs font-medium border border-[#2B3447] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Artist</span>
                  </a>

                  <Link
                    href={`/admin?search=${encodeURIComponent(stageName)}`}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all"
                  >
                    <span>View Catalogue</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
