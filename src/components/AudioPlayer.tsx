'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertTriangle, CheckCircle2, Music } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  title?: string;
  artist?: string;
  sampleRate?: string | null;
  bitDepth?: string | null;
  channels?: string | null;
  isLossless?: boolean | null;
}

export function AudioPlayer({
  url,
  title = 'Master Audio File',
  artist,
  sampleRate,
  bitDepth,
  channels,
  isLossless,
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>
            {artist && <p className="text-xs text-zinc-400">{artist}</p>}
          </div>
        </div>

        {/* Quality Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
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

          {channels && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1F2B] text-zinc-300 border border-[#262D3D]">
              {channels}
            </span>
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

