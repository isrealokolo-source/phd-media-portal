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
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-4 space-y-3 shadow-sm select-none">
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[#F4F4F2] border border-[#E8E8E8] flex items-center justify-center text-[#171717] flex-shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#171717] truncate">{title}</h4>
            <div className="flex items-center space-x-2 text-[11px] text-[#777777] mt-0.5">
              {artist && <span className="truncate">{artist}</span>}
              {fileName && (
                <>
                  <span className="text-[#999999]">•</span>
                  <span className="font-mono text-[10px] text-[#777777] truncate max-w-[180px]" title={fileName}>
                    {fileName}
                  </span>
                </>
              )}
              {fileSize && (
                <>
                  <span className="text-[#999999]">•</span>
                  <span className="font-mono text-[10px] text-[#999999]">
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
            <span className="flex items-center space-x-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#ECFDF5] text-[#269568] border border-[#A7F3D0]">
              <CheckCircle2 className="w-3 h-3" />
              <span>LOSSLESS</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#FFFBEB] text-[#D69E36] border border-[#FDE68A]">
              <AlertTriangle className="w-3 h-3" />
              <span>LOSSY</span>
            </span>
          )}

          {sampleRate && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F4F2] text-[#777777] border border-[#E8E8E8]">
              {sampleRate}
            </span>
          )}

          {bitDepth && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F4F2] text-[#777777] border border-[#E8E8E8]">
              {bitDepth}
            </span>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md bg-white hover:bg-[#F4F4F2] text-[#171717] border border-[#E8E8E8] transition-colors"
              title="Download audio file"
            >
              <FileDown className="w-3 h-3 text-[#777777]" />
              <span>Download</span>
            </a>
          )}

          {onReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md bg-white hover:bg-[#F4F4F2] text-[#171717] border border-[#E8E8E8] transition-colors"
              title="Replace master audio file"
            >
              <RefreshCw className="w-3 h-3 text-[#777777]" />
              <span>Replace</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#D64B4B] border border-[#FECACA] transition-colors"
              title="Delete audio file from this track"
            >
              <Trash2 className="w-3 h-3 text-[#D64B4B]" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center space-x-3 pt-1">
        <button
          type="button"
          onClick={togglePlay}
          className="w-7 h-7 rounded-full bg-[#171717] hover:bg-[#262626] text-white flex items-center justify-center transition-colors shadow-sm"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <span className="text-[11px] font-mono text-[#777777] w-8">{formatTime(currentTime)}</span>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-[#E8E8E8] rounded-lg appearance-none cursor-pointer accent-[#171717]"
        />

        <span className="text-[11px] font-mono text-[#777777] w-8">{formatTime(duration)}</span>

        <button
          type="button"
          onClick={toggleMute}
          className="text-[#777777] hover:text-[#171717] transition-colors p-1"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
