'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Type, RotateCcw, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (signatureData: string, type: 'DRAWN' | 'TYPED') => void;
  initialName?: string;
}

export function SignaturePad({ onSignatureChange, initialName = '' }: SignaturePadProps) {
  const [tab, setTab] = useState<'DRAWN' | 'TYPED'>('DRAWN');
  const [typedName, setTypedName] = useState(initialName);
  const [hasEditedTyped, setHasEditedTyped] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [drawnDataUrl, setDrawnDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // Keep typedName synced with initialName until the user manually edits typedName
  useEffect(() => {
    if (!hasEditedTyped && initialName) {
      setTypedName(initialName);
    }
  }, [initialName, hasEditedTyped]);

  const generateTypedDataUrl = useCallback((text: string): string => {
    const trimmed = text.trim();
    if (!trimmed || typeof document === 'undefined') return '';
    const offscreen = document.createElement('canvas');
    offscreen.width = 480;
    offscreen.height = 130;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.font = 'italic 34px "Brush Script MT", "Segoe Script", "Snell Roundhand", Georgia, serif';
    ctx.fillStyle = '#171717';
    ctx.textBaseline = 'middle';
    ctx.fillText(trimmed, 28, 65, 424);
    return offscreen.toDataURL('image/png');
  }, []);

  useEffect(() => {
    if (tab === 'DRAWN') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#171717';
    } else if (tab === 'TYPED') {
      const dataUrl = generateTypedDataUrl(typedName);
      onSignatureChange(dataUrl, 'TYPED');
    }
  }, [tab, typedName, generateTypedDataUrl]);

  const getCanvasPoint = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#171717';

    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      setDrawnDataUrl(url);
      onSignatureChange(url, 'DRAWN');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setDrawnDataUrl('');
    onSignatureChange('', 'DRAWN');
  };

  const handleTabSwitch = (nextTab: 'DRAWN' | 'TYPED') => {
    setTab(nextTab);
    if (nextTab === 'TYPED') {
      const dataUrl = generateTypedDataUrl(typedName);
      onSignatureChange(dataUrl, 'TYPED');
    } else {
      onSignatureChange(hasDrawn ? drawnDataUrl : '', 'DRAWN');
    }
  };

  const handleTypedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHasEditedTyped(true);
    setTypedName(val);
    const dataUrl = generateTypedDataUrl(val);
    onSignatureChange(dataUrl, 'TYPED');
  };

  const isSignatureReady =
    (tab === 'DRAWN' && hasDrawn) || (tab === 'TYPED' && Boolean(typedName.trim()));

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-5 space-y-4 shadow-sm select-none">
      <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleTabSwitch('DRAWN')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'DRAWN'
                ? 'bg-[#171717] text-white shadow-sm'
                : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw Signature</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('TYPED')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'TYPED'
                ? 'bg-[#171717] text-white shadow-sm'
                : 'text-[#777777] hover:text-[#171717] hover:bg-[#F4F4F2]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Signature</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {isSignatureReady && (
            <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-[#269568]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Signature Ready</span>
            </span>
          )}
          {tab === 'DRAWN' && hasDrawn && (
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center space-x-1 text-xs text-[#777777] hover:text-[#D64B4B] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'DRAWN' ? (
        <div className="relative border border-dashed border-[#E8E8E8] rounded-md bg-[#F4F4F2] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={600}
            height={140}
            className="w-full h-[140px] cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[#999999] text-xs font-mono">
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
            className="w-full px-3.5 py-2.5 bg-white border border-[#E8E8E8] rounded-md text-sm text-[#171717] placeholder-[#999999] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
          />
          {typedName.trim() && (
            <div className="p-4 border border-[#E8E8E8] rounded-md bg-[#F4F4F2] text-center">
              <span className="font-serif italic text-2xl text-[#171717] tracking-wide">
                {typedName}
              </span>
              <p className="text-[10px] text-[#777777] font-mono mt-1 uppercase tracking-wider">
                Digital Electronic Signature Representation
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#777777] leading-relaxed">
        By providing this signature, you certify that you have reviewed the details in Schedule A and B and are
        authorized to execute this agreement. Your IP address and timestamp will be cryptographically recorded in the audit snapshot.
      </p>
    </div>
  );
}
