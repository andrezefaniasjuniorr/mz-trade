'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Loader2, Mic } from 'lucide-react';
import { resolveAudioUrl, getCachedAudioUrl } from '@/lib/chatService';

interface ChatAudioPlayerProps {
  id: string;
  audioUrl: string;
  duracao?: number;
  isMe: boolean;
  isUploading?: boolean;
  canPlay?: boolean;
  onRequireAuth?: () => void;
}

// Generate consistent waveform bar heights
function generateWaveHeights(seed: string, count = 30): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = Math.sin((i / count) * Math.PI) * 0.5 + 0.5;
    const pseudo = Math.abs(Math.sin(hash + i * 13.37));
    const normalized = Math.max(0.18, Math.min(1, base * 0.45 + pseudo * 0.55));
    heights.push(Math.round(normalized * 22) + 4);
  }
  return heights;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function ChatAudioPlayer({
  id,
  audioUrl,
  duracao = 0,
  isMe,
  isUploading = false,
  canPlay = true,
  onRequireAuth
}: ChatAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(duracao > 0 ? duracao : 0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const resolvedSrcRef = useRef<string>(getCachedAudioUrl(audioUrl) || (audioUrl.startsWith('taprise://') ? '' : audioUrl));

  useEffect(() => {
    if (audioUrl) {
      const cached = getCachedAudioUrl(audioUrl);
      if (cached) {
        resolvedSrcRef.current = cached;
      } else if (audioUrl.startsWith('taprise://')) {
        resolveAudioUrl(audioUrl).then((resolved) => {
          resolvedSrcRef.current = resolved;
          if (audioRef.current && !audioRef.current.src) {
            audioRef.current.src = resolved;
          }
        });
      } else {
        resolvedSrcRef.current = audioUrl;
      }
    }
  }, [audioUrl]);

  const waveHeights = useMemo(() => generateWaveHeights(id || audioUrl || 'taprise', 30), [id, audioUrl]);

  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id !== id) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener('taprise-audio-play', handleOtherPlay);
    return () => {
      window.removeEventListener('taprise-audio-play', handleOtherPlay);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [id]);

  const getOrCreateAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    if (!resolvedSrcRef.current) {
      resolvedSrcRef.current = await resolveAudioUrl(audioUrl);
    }
    const targetSrc = resolvedSrcRef.current;
    if (!targetSrc) return null;

    if (!audioRef.current) {
      const audio = new Audio(targetSrc);
      audio.preload = 'metadata';
      audio.playbackRate = speed;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onwaiting = () => setIsLoading(true);
      audio.oncanplay = () => setIsLoading(false);
      audio.onplaying = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
      };

      audioRef.current = audio;
    } else if (audioRef.current.src !== targetSrc && targetSrc) {
      audioRef.current.src = targetSrc;
    }
    return audioRef.current;
  }, [audioUrl, speed]);

  const togglePlay = async () => {
    if (!canPlay) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (isUploading) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    const audio = await getOrCreateAudio();
    if (!audio) {
      setIsLoading(false);
      return;
    }

    window.dispatchEvent(new CustomEvent('taprise-audio-play', { detail: { id } }));
    audio.play().then(() => {
      setIsPlaying(true);
      setIsLoading(false);
    }).catch((err) => {
      console.warn('Falha ao reproduzir áudio:', err);
      setIsPlaying(false);
      setIsLoading(false);
    });
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canPlay) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (isUploading || !waveContainerRef.current) return;
    const rect = waveContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetDur = duration > 0 ? duration : (duracao > 0 ? duracao : 1);
    const targetTime = ratio * targetDur;

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const displayTime = isPlaying || currentTime > 0 ? formatDuration(currentTime) : formatDuration(duration || duracao);

  return (
    <div className="w-full max-w-[310px] sm:max-w-[340px] select-none py-1">
      <div className="flex items-center space-x-2.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={isUploading}
          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md transition transform active:scale-95 cursor-pointer ${
            isMe
              ? 'bg-white text-[#2563eb] hover:bg-slate-100'
              : 'bg-[#2563eb] hover:bg-blue-600 text-white'
          } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={isPlaying ? 'Pausar nota de voz' : 'Ouvir nota de voz'}
        >
          {isUploading || isLoading ? (
            <Loader2 className={`w-5 h-5 animate-spin ${isMe ? 'text-[#2563eb]' : 'text-white'}`} />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div
            ref={waveContainerRef}
            onClick={handleSeek}
            className="h-8 flex items-center space-x-[2px] cursor-pointer py-1 group/wave"
            title="Clique para avançar/retroceder"
          >
            {waveHeights.map((h, idx) => {
              const barProgress = (idx + 1) / waveHeights.length;
              const isPast = barProgress <= progressRatio;

              return (
                <div
                  key={idx}
                  className="flex-1 flex items-center justify-center h-full"
                >
                  <span
                    style={{ height: `${h}px` }}
                    className={`w-[2.5px] rounded-full transition-all duration-75 ${
                      isPast
                        ? isMe
                          ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.7)]'
                          : 'bg-[#2563eb] shadow-[0_0_4px_rgba(37,99,235,0.6)]'
                        : isMe
                        ? 'bg-blue-300/40 group-hover/wave:bg-blue-200/50'
                        : 'bg-slate-600/50 group-hover/wave:bg-slate-500/60'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono mt-0.5 px-0.5">
            <span className={isMe ? 'text-blue-100 font-bold' : 'text-slate-400 font-bold'}>
              {displayTime}
            </span>

            <div className="flex items-center space-x-2">
              {isUploading ? (
                <span className="text-[9px] text-amber-300 font-medium animate-pulse">
                  A enviar...
                </span>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <span className={`inline-flex items-center ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>
                    <Mic className="w-2.5 h-2.5 opacity-70" />
                  </span>
                  <button
                    type="button"
                    onClick={cycleSpeed}
                    className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] transition cursor-pointer ${
                      isMe
                        ? 'bg-blue-800/80 hover:bg-blue-700 text-blue-100 border border-blue-400/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title="Alternar velocidade de reprodução"
                  >
                    {speed}x
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
