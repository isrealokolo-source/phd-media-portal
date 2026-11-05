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
    <div className="space-y-6 select-none">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
            Artist Portfolio & Roster
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] mt-1">Artist Registry</h1>
          <p className="text-xs text-[#777777] mt-1 max-w-xl">
            Manage authorized artists, inspect individual release catalogues, and maintain talent contact details.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/admin/users?create=true"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-[#171717] hover:bg-[#262626] text-white text-xs font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Artist Account</span>
          </Link>
        </div>
      </div>

      {/* Roster Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
        <div className="p-4 bg-white border border-[#E8E8E8] rounded-lg shadow-sm">
          <span className="text-[#777777] block uppercase font-mono text-[10px]">Total Signed Artists</span>
          <span className="text-2xl font-bold font-mono text-[#171717] mt-1 block">{artists.length}</span>
        </div>

        <div className="p-4 bg-white border border-[#E8E8E8] rounded-lg shadow-sm">
          <span className="text-[#777777] block uppercase font-mono text-[10px]">Total Active Releases</span>
          <span className="text-2xl font-bold font-mono text-[#171717] mt-1 block">{totalReleasesCount}</span>
        </div>

        <div className="p-4 bg-white border border-[#E8E8E8] rounded-lg shadow-sm">
          <span className="text-[#777777] block uppercase font-mono text-[10px]">Countries Represented</span>
          <span className="text-2xl font-bold font-mono text-[#171717] mt-1 block">{countries.length}</span>
        </div>

        <div className="p-4 bg-white border border-[#E8E8E8] rounded-lg shadow-sm">
          <span className="text-[#269568] block uppercase font-mono text-[10px]">Roster Health</span>
          <span className="text-2xl font-bold font-mono text-[#269568] mt-1 block">100% Verified</span>
        </div>
      </div>

      {/* Search & Country Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by stage name, legal name, email, label..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E8E8E8] rounded-md text-xs text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
          />
        </div>

        {countries.length > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCountry('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCountry === 'ALL'
                  ? 'bg-[#171717] text-white shadow-sm'
                  : 'bg-white text-[#777777] hover:text-[#171717] border border-[#E8E8E8]'
              }`}
            >
              All Territories
            </button>
            {countries.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCountry(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCountry === c
                    ? 'bg-[#171717] text-white shadow-sm'
                    : 'bg-white text-[#777777] hover:text-[#171717] border border-[#E8E8E8]'
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
        <div className="text-center py-16 px-4 rounded-lg bg-white border border-dashed border-[#E8E8E8] space-y-3">
          <Users className="w-10 h-10 text-[#999999] mx-auto" />
          <p className="text-xs text-[#777777]">No artists matching search criteria.</p>
          {(searchQuery || selectedCountry !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCountry('ALL');
              }}
              className="text-xs text-[#171717] underline font-medium"
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
                className="p-5 rounded-lg bg-white border border-[#E8E8E8] hover:border-[#777777] transition-colors space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-[#F4F4F2] border border-[#E8E8E8] flex items-center justify-center text-[#171717] font-bold text-xs uppercase flex-shrink-0">
                        {stageName.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#171717] truncate">{stageName}</h3>
                        <p className="text-xs text-[#777777] truncate">Legal: {legalName}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F4F2] text-[#777777] border border-[#E8E8E8] flex-shrink-0">
                      {artist.artistProfile?.country || 'Nigeria'}
                    </span>
                  </div>

                  <div className="text-xs text-[#777777] space-y-1 font-mono pt-1">
                    <div className="flex items-center space-x-1.5 text-[#777777]">
                      <Mail className="w-3.5 h-3.5 text-[#999999] flex-shrink-0" />
                      <span className="truncate">{artist.email}</span>
                    </div>
                    {artist.artistProfile?.label && (
                      <div className="text-[11px] text-[#777777] font-sans">
                        Label / Imprint: <strong className="text-[#171717]">{artist.artistProfile.label}</strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E8E8E8] space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[#777777]">
                      <span>Registered Projects:</span>
                      <span className="font-semibold font-mono text-[#171717] bg-[#F4F4F2] px-2 py-0.5 rounded border border-[#E8E8E8]">
                        {artist.releases.length}
                      </span>
                    </div>

                    {artist.releases.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-[#999999] uppercase font-mono block">
                          Recent Releases:
                        </span>
                        {artist.releases.slice(0, 3).map((r) => (
                          <Link
                            key={r.id}
                            href={`/admin/releases/${r.id}/review`}
                            className="flex justify-between items-center text-[11px] p-1.5 rounded-md bg-[#F4F4F2] hover:bg-[#EAEAEA] border border-[#E8E8E8] transition-colors group"
                          >
                            <span className="text-[#171717] truncate max-w-[170px] group-hover:underline">
                              {r.title}
                            </span>
                            <span className="text-[10px] font-mono text-[#777777]">
                              {r.referenceNumber}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${artist.email}?subject=PHD%20Services%20-%20Release%20Catalogue%20Inquiry`}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-white hover:bg-[#F4F4F2] text-[#171717] text-xs font-medium border border-[#E8E8E8] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Artist</span>
                  </a>

                  <Link
                    href={`/admin?search=${encodeURIComponent(stageName)}`}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-[#171717] hover:bg-[#262626] text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    <span>View Releases</span>
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
