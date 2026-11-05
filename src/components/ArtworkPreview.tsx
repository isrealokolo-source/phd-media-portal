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
      <div className="w-full aspect-square max-w-[280px] bg-[#F4F4F2] border border-dashed border-[#E8E8E8] rounded-lg flex flex-col items-center justify-center p-6 text-center text-[#777777] select-none">
        <ImageIcon className="w-10 h-10 mb-2 stroke-[1.5] text-[#999999]" />
        <span className="text-xs font-semibold text-[#171717]">No cover art uploaded</span>
        <span className="text-[11px] text-[#777777] mt-1 font-mono">1:1 square, min 3000 x 3000 px</span>
      </div>
    );
  }

  const isSquare = width && height ? width === height : true;
  const isOptimalResolution = width && height ? width >= 3000 && height >= 3000 : true;

  return (
    <div className="space-y-3 max-w-[280px] select-none">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-[#E8E8E8] bg-[#F4F4F2] shadow-sm group">
        <img
          src={url}
          alt="Release Cover Artwork"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
        />
        {width && height && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-white border border-white/20">
            {width} × {height} px
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {width && height && (
          <>
            {isSquare ? (
              <div className="flex items-center space-x-1.5 text-xs text-[#269568]">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Square 1:1 aspect ratio verified</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-[#D64B4B]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Non-square image ({width}×{height}). DSPs require exact 1:1.</span>
              </div>
            )}

            {isOptimalResolution ? (
              <div className="flex items-center space-x-1.5 text-xs text-[#269568]">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Meets 3000×3000 px resolution standard</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-[#D69E36]">
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
