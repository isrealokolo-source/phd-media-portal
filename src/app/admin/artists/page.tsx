import { redirect } from 'next/navigation';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { Users, Plus, Mail, Disc3, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default async function AdminArtistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isPhdAdmin(user.role)) redirect('/artist');

  const artists = await prisma.user.findMany({
    where: { role: 'ARTIST' },
    include: {
      artistProfile: true,
      releases: {
        select: {
          id: true,
          title: true,
          referenceNumber: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#F3F4F6]">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between p-6 rounded-2xl bg-[#12151B] border border-[#1F2430]">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
              Artist Portfolio Management
            </span>
            <h1 className="text-xl font-bold text-white mt-1">Artist Registry</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage signed artists, view release catalogue histories, and invite new talent.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className="p-5 rounded-2xl bg-[#12151B] border border-[#1F2430] space-y-4 shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {artist.artistProfile?.stageName || artist.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Legal: {artist.artistProfile?.legalName || artist.name}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{artist.email}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {artist.artistProfile?.country || 'Nigeria'}
                </span>
              </div>

              <div className="pt-3 border-t border-[#1F2430] space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Releases Registered:</span>
                  <span className="font-bold text-zinc-200">{artist.releases.length}</span>
                </div>

                {artist.releases.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                      Recent Projects:
                    </span>
                    {artist.releases.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex justify-between items-center text-[11px]">
                        <span className="text-zinc-300 truncate max-w-[170px]">{r.title}</span>
                        <span className="text-[9px] font-mono text-indigo-400">
                          {r.referenceNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

