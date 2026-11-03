'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';

interface ArtworkPreviewProps {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

export function ArtworkPreview({ url, width, height }: ArtworkPreviewProps) {
  if (!url) {
    return (
      <div className="w-full aspect-square max-w-[280px] bg-[#0E1015] border border-dashed border-[#262D3D] rounded-xl flex flex-col items-center justify-center p-6 text-center text-zinc-500">
        <ImageIcon className="w-10 h-10 mb-2 stroke-[1.5] text-zinc-600" />
        <span className="text-xs font-medium">No artwork uploaded</span>
        <span className="text-[11px] text-zinc-600 mt-1">Requires square 1:1, min 3000 x 3000 px</span>
      </div>
    );
  }

  const isSquare = width && height ? width === height : true;
  const isOptimalResolution = width && height ? width >= 3000 && height >= 3000 : true;

  return (
    <div className="space-y-3 max-w-[280px]">
      <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-[#1F2430] bg-[#0E1015] shadow-lg group">
        <img
          src={url}
          alt="Release Cover Artwork"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {width && height && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-white/10">
            {width} × {height} px
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {width && height && (
          <>
            {isSquare ? (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Square 1:1 aspect ratio verified</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Non-square image ({width}×{height}). DSPs require exact 1:1.</span>
              </div>
            )}

            {isOptimalResolution ? (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Meets 3000×3000 px resolution standard</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Below recommended 3000×3000 px resolution</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

