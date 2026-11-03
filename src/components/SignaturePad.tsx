'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Type, RotateCcw, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (signatureData: string, type: 'DRAWN' | 'TYPED') => void;
  initialName?: string;
}

export function SignaturePad({ onSignatureChange, initialName = '' }: SignaturePadProps) {
  const [tab, setTab] = useState<'DRAWN' | 'TYPED'>('DRAWN');
  const [typedName, setTypedName] = useState(initialName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (tab === 'DRAWN') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#4F46E5'; // indigo
    }
  }, [tab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onSignatureChange(canvas.toDataURL('image/png'), 'DRAWN');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange('', 'DRAWN');
  };

  const handleTypedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedName(val);
    if (val.trim()) {
      // Create a canvas image of typed signature
      const offscreen = document.createElement('canvas');
      offscreen.width = 450;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#12151B';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive';
        ctx.fillStyle = '#6366F1';
        ctx.fillText(val, 30, 70);
        onSignatureChange(offscreen.toDataURL('image/png'), 'TYPED');
      }
    } else {
      onSignatureChange('', 'TYPED');
    }
  };

  return (
    <div className="bg-[#12151B] border border-[#1F2430] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#1F2430] pb-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setTab('DRAWN')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'DRAWN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1F2B]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw Signature</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('TYPED')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'TYPED'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1F2B]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Signature</span>
          </button>
        </div>
        {tab === 'DRAWN' && hasDrawn && (
          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {tab === 'DRAWN' ? (
        <div className="relative border border-dashed border-[#2A3142] rounded-lg bg-[#0E1015] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={480}
            height={130}
            className="w-full h-[130px] cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-500 text-xs">
              Sign using cursor, trackpad or stylus inside this box
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={typedName}
            onChange={handleTypedChange}
            placeholder="Type your official legal name..."
            className="w-full px-3.5 py-2.5 bg-[#0E1015] border border-[#2A3142] rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
          />
          {typedName && (
            <div className="p-4 border border-[#2A3142] rounded-lg bg-[#0E1015] text-center">
              <span className="font-serif italic text-2xl text-indigo-400 tracking-wide">
                {typedName}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
                Digital Electronic Signature Representation
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        By providing this signature, you certify that you have reviewed the details in Schedule A and B and are
        authorized to execute this agreement. Your IP address and timestamp will be cryptographically recorded in the audit snapshot.
      </p>
    </div>
  );
}

