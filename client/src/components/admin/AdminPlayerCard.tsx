import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Volume1,
  VolumeX,
  Sparkles,
  User,
  Music2,
  Disc3,
  Shield,
} from 'lucide-react';
import { Visualizer } from '../common/Visualizer.js';
import { getSocket } from '../../services/socket.js';
import { extractAmbientColor } from '../../utils/colorExtractor.js';
import type { PlayerState, CurrentSongState, QueueItem, JukeboxSettings } from '../../types/index.js';

// YouTube IFrame types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface AdminPlayerCardProps {
  playerState: PlayerState;
  nextSong?: QueueItem | null;
  settings?: JukeboxSettings;
  onStartJukebox: () => void;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number, isMuted: boolean) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const AdminPlayerCard: React.FC<AdminPlayerCardProps> = ({
  playerState,
  nextSong,
  settings,
  onStartJukebox,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolume,
}) => {
  const { currentSong, status, currentTime, duration, volume, isMuted } = playerState;
  const isPlaying = status === 'playing';

  const [ambientColor, setAmbientColor] = useState('#5865f2');

  useEffect(() => {
    if (currentSong?.thumbnail) {
      extractAmbientColor(currentSong.thumbnail, currentSong.youtubeId).then(setAmbientColor);
    }
  }, [currentSong?.thumbnail, currentSong?.youtubeId]);

  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isApiReady, setIsApiReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasUserStarted, setHasUserStarted] = useState(playerState.isJukeboxStarted);

  const currentSongRef = useRef<CurrentSongState | null>(playerState.currentSong);
  currentSongRef.current = playerState.currentSong;

  // 1. Load YouTube IFrame API script for audio engine
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };
  }, []);

  // 2. Initialize background YouTube Player once API is ready
  useEffect(() => {
    if (!isApiReady || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player('admin-hidden-yt-target', {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            try {
              event.target.setVolume(playerState.volume);
              if (playerState.isMuted) event.target.mute();
            } catch (e) {}

            if (currentSongRef.current?.youtubeId && playerState.isJukeboxStarted) {
              try {
                event.target.loadVideoById({
                  videoId: currentSongRef.current.youtubeId,
                  startSeconds: playerState.currentTime || 0,
                });
              } catch (e) {}
            }
          },
          onStateChange: (event: any) => {
            const socket = getSocket();
            if (event.data === window.YT.PlayerState.PLAYING) {
              socket.emit('player:report_state', {
                status: 'playing',
                currentTime: event.target.getCurrentTime() || 0,
                duration: event.target.getDuration() || 0,
              });
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              socket.emit('player:report_state', {
                status: 'paused',
                currentTime: event.target.getCurrentTime() || 0,
                duration: event.target.getDuration() || 0,
              });
            } else if (event.data === window.YT.PlayerState.ENDED) {
              socket.emit('player:song_ended');
            }
          },
          onError: (event: any) => {
            const youtubeId = currentSongRef.current?.youtubeId || '';
            console.warn(`[AdminPlayerCard] Video playback error ${event.data} on ${youtubeId}`);
            const socket = getSocket();
            socket.emit('player:song_error', {
              youtubeId,
              errorCode: event.data,
            });
          },
        },
      });
    } catch (e) {
      console.warn('Failed to init hidden YouTube player:', e);
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [isApiReady]);

  // 3. React to currentSong change: load video into background player
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    if (currentSong?.youtubeId && (hasUserStarted || playerState.isJukeboxStarted)) {
      try {
        playerRef.current.loadVideoById({
          videoId: currentSong.youtubeId,
          startSeconds: currentTime || 0,
        });
        playerRef.current.playVideo();
      } catch (e) {}
    }
  }, [currentSong?.youtubeId, isPlayerReady]);

  const isLoudTrack = currentSong ? /remix|vinahouse|phonk|bass|edm|quẩy|quay|trap|rave|club/i.test(currentSong.title) : false;
  const isNormalizing = isLoudTrack && (settings?.volumeNormalization !== false);
  const effectiveVolume = isNormalizing ? Math.round(volume * 0.82) : volume;

  const preloadedRef = useRef<string | null>(null);

  // Seamless Transition Preloading
  useEffect(() => {
    if (!isPlaying || duration <= 0 || currentTime <= 0) return;
    const remaining = duration - currentTime;
    if (remaining <= 10 && nextSong?.youtubeId && preloadedRef.current !== nextSong.youtubeId) {
      preloadedRef.current = nextSong.youtubeId;
      console.log(`[AdminPlayer] Seamless transition: preloading next track "${nextSong.title}"`);
      const img = new Image();
      img.src = nextSong.thumbnail || `https://i.ytimg.com/vi/${nextSong.youtubeId}/hqdefault.jpg`;
    }
  }, [isPlaying, duration, currentTime, nextSong?.youtubeId, nextSong?.thumbnail, nextSong?.title]);

  // 4. React to playback status (playing vs paused)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else if (status === 'paused') {
        playerRef.current.pauseVideo();
      }
    } catch (e) {}
  }, [isPlaying, status, isPlayerReady]);

  // 5. React to volume & mute changes (with Volume Normalizer)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    try {
      playerRef.current.setVolume(effectiveVolume);
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch (e) {}
  }, [effectiveVolume, isMuted, isPlayerReady]);

  // 6. Regular progress poll to sync with server
  useEffect(() => {
    if (isPlaying && isPlayerReady && playerRef.current) {
      progressIntervalRef.current = setInterval(() => {
        try {
          if (typeof playerRef.current.getCurrentTime === 'function') {
            const time = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration();
            const socket = getSocket();
            if (time > 0 && dur > 0) {
              socket.emit('player:report_state', {
                status: 'playing',
                currentTime: time,
                duration: dur,
              });
            }
          }
        } catch (e) {}
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isPlayerReady]);

  const handleStartJukeboxClick = () => {
    setHasUserStarted(true);
    onStartJukebox();
    if (playerRef.current && isPlayerReady) {
      try {
        if (currentSong?.youtubeId) {
          playerRef.current.loadVideoById({
            videoId: currentSong.youtubeId,
            startSeconds: currentTime || 0,
          });
        }
        playerRef.current.playVideo();
      } catch (e) {}
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    onSeek(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    onVolume(newVol, false);
  };

  const toggleMute = () => {
    onVolume(volume, !isMuted);
  };

  return (
    <div className="p-5 sm:p-6 bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card relative overflow-hidden text-[#25385b]">
      {/* Hidden YouTube Engine */}
      <div className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none">
        <div id="admin-hidden-yt-target" className="w-full h-full" />
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#25385b]/15">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#a2b0ff]/30 border border-[#25385b] text-[#25385b] flex items-center justify-center shrink-0 shadow-recess">
            <Music2 className="w-4 h-4 text-[#25385b]" />
          </div>
          <span className="font-sans text-xs sm:text-sm font-bold uppercase tracking-tight text-[#25385b] whitespace-nowrap">
            Đang phát qua loa
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {currentSong?.isDefault ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fffcef] text-[#25385b] border border-[#25385b]/40 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-[#ff8a7a]" />
              Playlist mặc định
            </span>
          ) : currentSong?.requesterName === 'YouTube Autoplay' || currentSong?.requesterName === 'YouTube Tab DJ' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#a2b0ff]/20 text-[#25385b] border border-[#a2b0ff] whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-[#1a2b88]" />
              YouTube Tự phát
            </span>
          ) : currentSong?.requesterName ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fffcef] text-[#25385b] border border-[#25385b]/40 whitespace-nowrap">
              <User className="w-3.5 h-3.5 text-[#1a2b88]" />
              bởi {currentSong.requesterName}
            </span>
          ) : null}

          {isNormalizing && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#a2b0ff]/25 text-[#1a2b88] border border-[#25385b]/30 whitespace-nowrap"
              title="Đã tự động giảm 18% âm lượng cho bài Remix/Bass để chống giật mình"
            >
              <Shield className="w-3.5 h-3.5 text-[#1a2b88]" />
              <span>Normalizer (-18%)</span>
            </span>
          )}

          {/* Instant Qua bài Button */}
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25385b] hover:bg-[#1a2b88] text-[#fffcef] text-xs font-bold border border-[#25385b] transition-all shadow-recess group cursor-pointer shrink-0 active:scale-95"
            title="Bỏ qua bài hát hiện tại và phát bài tiếp theo"
          >
            <SkipForward className="w-3.5 h-3.5 text-[#fffcef] group-hover:translate-x-0.5 transition-transform" />
            <span>Qua bài</span>
          </button>

          <Visualizer isPlaying={isPlaying} barColor="bg-[#25385b]" />
        </div>
      </div>

      {/* Main Track Display with Rotating Vinyl Record */}
      {currentSong ? (
        <div className="flex items-center gap-4 sm:gap-6 my-2">
          {/* Vinyl Disc */}
          <div className="relative group shrink-0">
            {isPlaying && (
              <div
                className="absolute -inset-2 rounded-full blur-lg opacity-85 animate-pulse transition-all duration-700"
                style={{
                  background: `radial-gradient(circle, ${ambientColor}99 0%, ${ambientColor}33 70%, transparent 100%)`,
                  boxShadow: `0 0 25px ${ambientColor}66`,
                }}
              />
            )}

            <div
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full vinyl-disc flex items-center justify-center border-2 border-[#25385b] shadow-recess transition-transform ${
                isPlaying ? 'animate-vinyl-spin' : ''
              }`}
              style={{
                animationPlayState: isPlaying ? 'running' : 'paused',
              }}
            >
              {/* Grooves */}
              <div className="absolute inset-0 rounded-full vinyl-grooves pointer-events-none" />

              {/* Center Label */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-[#25385b] shadow-inner bg-[#fffcef] flex items-center justify-center">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute w-3 h-3 rounded-full bg-[#25385b] border shadow-xs"
                  style={{ borderColor: ambientColor }}
                />
              </div>
            </div>
          </div>

          {/* Song Info & Interactive Scrub Bar */}
          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
            <div>
              <h2
                className="font-sans text-base sm:text-lg font-bold text-[#25385b] tracking-tight truncate mb-1"
                title={currentSong.title}
              >
                {currentSong.title}
              </h2>
              <p className="text-xs text-[#84849c] truncate font-medium">
                {currentSong.channel}
              </p>
            </div>

            {/* Scrub Slider */}
            <div className="w-full mt-3">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progressPercent || 0}
                onChange={handleSeekChange}
                className="w-full h-2 bg-[#a2b0ff]/20 rounded-full border border-[#25385b]/30 appearance-none cursor-pointer focus:outline-none accent-[#25385b]"
              />
              <div className="flex justify-between items-center text-xs text-[#84849c] font-mono mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center bg-[#ffffff] rounded-xl border border-[#25385b]/20 my-2">
          <Disc3 className="w-9 h-9 text-[#25385b] mx-auto mb-2 animate-spin opacity-80" style={{ animationDuration: '8s' }} />
          <h4 className="font-sans text-sm sm:text-base font-bold text-[#25385b]">Chưa có bài hát nào đang phát</h4>
          <p className="text-xs text-[#84849c] mt-1">Bấm Khởi động Jukebox hoặc thêm bài vào hàng đợi.</p>
        </div>
      )}


      {/* Bottom Controls Bar (Play/Pause, Previous, Next, Volume, Start Jukebox) */}
      <div className="mt-4 pt-4 border-t border-[#25385b]/15 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Playback action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            className="p-2 rounded-xl bg-[#fffcef] hover:bg-[#a2b0ff]/20 text-[#25385b] border border-[#25385b] transition-all cursor-pointer shadow-recess"
            title="Bài trước đó"
          >
            <SkipBack className="w-4 h-4 fill-current text-[#25385b]" />
          </button>

          <button
            onClick={isPlaying ? onPause : onPlay}
            className="btn-primary px-5 py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-recess rounded-xl"
            title={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Phát nhạc</span>
              </>
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2 rounded-xl bg-[#fffcef] hover:bg-[#a2b0ff]/20 text-[#25385b] border border-[#25385b] transition-all cursor-pointer shadow-recess"
            title="Bài tiếp theo"
          >
            <SkipForward className="w-4 h-4 fill-current text-[#25385b]" />
          </button>

          {/* Start Jukebox trigger if not active */}
          {!hasUserStarted && !playerState.isJukeboxStarted && (
            <button
              onClick={handleStartJukeboxClick}
              className="ml-2 px-3.5 py-2 rounded-xl bg-[#25385b] hover:bg-[#1a2b88] text-[#fffcef] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-recess"
            >
              <Disc3 className="w-4 h-4 text-[#fffcef] animate-spin" />
              <span>Khởi động Jukebox</span>
            </button>
          )}
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer"
            title={isMuted ? 'Bật âm' : 'Tắt âm'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-[#ff5a5a]" />
            ) : volume < 50 ? (
              <Volume1 className="w-4 h-4 text-[#84849c]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#84849c]" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 sm:w-28 h-2 bg-[#a2b0ff]/20 rounded-full border border-[#25385b]/30 appearance-none cursor-pointer accent-[#25385b] focus:outline-none"
          />
          <span className="text-xs font-mono text-[#84849c] w-8 text-right font-semibold">
            {isMuted ? 'Mute' : `${volume}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
