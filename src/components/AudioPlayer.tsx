'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertTriangle, CheckCircle2, Music, Trash2, RefreshCw, FileDown } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  downloadUrl?: string;
  title?: string;
  artist?: string;
  fileName?: string | null;
  fileSize?: number | null;
  sampleRate?: string | null;
  bitDepth?: string | null;
  channels?: string | null;
  isLossless?: boolean | null;
  onDelete?: () => void;
  onReplace?: () => void;
}

export function AudioPlayer({
  url,
  downloadUrl,
  title = 'Master Audio File',
  artist,
  fileName,
  fileSize,
  sampleRate,
  bitDepth,
  channels,
  isLossless,
  onDelete,
  onReplace,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = Number(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#12151B] border border-[#1F2430] rounded-xl p-4 space-y-3">
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-zinc-100 truncate">{title}</h4>
            <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
              {artist && <span className="truncate">{artist}</span>}
              {fileName && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[180px]" title={fileName}>
                    {fileName}
                  </span>
                </>
              )}
              {fileSize && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {(fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quality Badges & Actions */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
          {isLossless !== false ? (
            <span className="flex items-center space-x-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
              <CheckCircle2 className="w-3 h-3" />
              <span>LOSSLESS WAV</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-amber-950/70 text-amber-400 border border-amber-800/50">
              <AlertTriangle className="w-3 h-3" />
              <span>LOSSY FORMAT</span>
            </span>
          )}

          {sampleRate && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1F2B] text-zinc-300 border border-[#262D3D]">
              {sampleRate}
            </span>
          )}

          {bitDepth && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1F2B] text-zinc-300 border border-[#262D3D]">
              {bitDepth}
            </span>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-md bg-[#1A1F2B] hover:bg-[#252C3D] text-indigo-300 border border-[#262D3D] transition-colors"
              title="Download audio file"
            >
              <FileDown className="w-3 h-3 text-indigo-400" />
              <span>Download</span>
            </a>
          )}

          {onReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-md bg-[#1A1F2B] hover:bg-[#252C3D] text-zinc-300 border border-[#262D3D] transition-colors"
              title="Replace master audio file"
            >
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              <span>Replace</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors"
              title="Delete audio file from this track"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Delete Audio</span>
            </button>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center space-x-3 pt-1">
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-sm"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <span className="text-xs font-mono text-zinc-400 w-9">{formatTime(currentTime)}</span>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-[#1F2430] rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />

        <span className="text-xs font-mono text-zinc-400 w-9">{formatTime(duration)}</span>

        <button
          type="button"
          onClick={toggleMute}
          className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

