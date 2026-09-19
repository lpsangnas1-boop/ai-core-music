import React, { useEffect, useRef, useState } from 'react';
import { Play, Disc3, Maximize2, Minimize2, Shield } from 'lucide-react';
import { getSocket } from '../../services/socket.js';
import type { PlayerState, CurrentSongState, QueueItem, JukeboxSettings } from '../../types/index.js';

// YouTube IFrame types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeMasterPlayerProps {
  playerState: PlayerState;
  nextSong?: QueueItem | null;
  settings?: JukeboxSettings;
  onStartJukebox: () => void;
  onSeek: (time: number) => void;
}

export const YouTubeMasterPlayer: React.FC<YouTubeMasterPlayerProps> = ({
  playerState,
  nextSong,
  settings,
  onStartJukebox,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isApiReady, setIsApiReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [hasUserStarted, setHasUserStarted] = useState(playerState.isJukeboxStarted);

  const isLoudTrack = playerState.currentSong
    ? /remix|vinahouse|phonk|bass|edm|quẩy|quay|trap|rave|club/i.test(playerState.currentSong.title)
    : false;
  const isNormalizing = isLoudTrack && (settings?.volumeNormalization !== false);
  const effectiveVolume = isNormalizing ? Math.round(playerState.volume * 0.82) : playerState.volume;

  const preloadedRef = useRef<string | null>(null);

  // Seamless Transition Preloading
  useEffect(() => {
    if (playerState.status !== 'playing' || playerState.duration <= 0 || playerState.currentTime <= 0) return;
    const remaining = playerState.duration - playerState.currentTime;
    if (remaining <= 10 && nextSong?.youtubeId && preloadedRef.current !== nextSong.youtubeId) {
      preloadedRef.current = nextSong.youtubeId;
      console.log(`[YouTubeMasterPlayer] Seamless transition: preloading next track "${nextSong.title}"`);
      const img = new Image();
      img.src = nextSong.thumbnail || `https://i.ytimg.com/vi/${nextSong.youtubeId}/hqdefault.jpg`;
    }
  }, [playerState.status, playerState.duration, playerState.currentTime, nextSong?.youtubeId, nextSong?.thumbnail, nextSong?.title]);

  const currentSongRef = useRef<CurrentSongState | null>(playerState.currentSong);
  currentSongRef.current = playerState.currentSong;

  // 1. Load YouTube IFrame API script
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

  // 2. Initialize YouTube Player once API is ready
  useEffect(() => {
    if (!isApiReady || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player('master-yt-player-target', {
        height: '100%',
        width: '100%',
        videoId: currentSongRef.current?.youtubeId || '',
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          fs: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            try {
              event.target.setVolume(effectiveVolume);
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
            if (event.data === window.YT.PlayerState.ENDED) {
              console.log('[MasterPlayer] Video ended -> notifying server');
              socket.emit('player:song_ended');
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              socket.emit('player:report_state', {
                status: 'playing',
                currentTime: event.target.getCurrentTime(),
                duration: event.target.getDuration(),
              });
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              socket.emit('player:report_state', {
                status: 'paused',
                currentTime: event.target.getCurrentTime(),
                duration: event.target.getDuration(),
              });
            }
          },
          onError: (event: any) => {
            const youtubeId = currentSongRef.current?.youtubeId || '';
            console.warn(`[MasterPlayer] Video playback error ${event.data} on ${youtubeId}`);
            const socket = getSocket();
            socket.emit('player:song_error', {
              youtubeId,
              errorCode: event.data,
            });
          },
        },
      });
    } catch (e) {
      console.error('[MasterPlayer] Error creating YT.Player:', e);
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // cleanup
        }
        playerRef.current = null;
      }
    };
  }, [isApiReady, playerState.volume, playerState.isMuted]);

  // 3. Socket Command Listeners for master player
  useEffect(() => {
    const socket = getSocket();

    const onPlayerCommand = (command: { action: string; [key: string]: any }) => {
      if (!playerRef.current || !isPlayerReady) return;

      const player = playerRef.current;

      try {
        switch (command.action) {
          case 'load_song':
            if (command.song && command.song.youtubeId) {
              console.log('[MasterPlayer] Loading new song:', command.song.title);
              player.loadVideoById({
                videoId: command.song.youtubeId,
                startSeconds: 0,
              });
            } else {
              player.stopVideo();
            }
            break;

          case 'play':
            player.playVideo();
            break;

          case 'pause':
            player.pauseVideo();
            break;

          case 'seek':
            if (typeof command.time === 'number') {
              player.seekTo(command.time, true);
            }
            break;

          case 'volume':
            if (typeof command.volume === 'number') {
              const appliedVol = isNormalizing ? Math.round(command.volume * 0.82) : command.volume;
              player.setVolume(appliedVol);
            }
            if (command.isMuted) {
              player.mute();
            } else {
              player.unMute();
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.warn('[MasterPlayer] Command execution failed:', err);
      }
    };

    socket.on('player:command', onPlayerCommand);
    return () => {
      socket.off('player:command', onPlayerCommand);
    };
  }, [isPlayerReady, isNormalizing]);

  // Keep player volume synchronized when effectiveVolume changes (track change / normalizer toggle)
  useEffect(() => {
    if (playerRef.current && isPlayerReady && typeof playerRef.current.setVolume === 'function') {
      try {
        playerRef.current.setVolume(effectiveVolume);
      } catch (e) {}
    }
  }, [effectiveVolume, isPlayerReady]);

  // 4. Progress Reporting Interval
  useEffect(() => {
    if (!isPlayerReady) return;

    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          const playerStateCode = playerRef.current.getPlayerState();

          let status: any = 'idle';
          if (playerStateCode === 1) status = 'playing';
          else if (playerStateCode === 2) status = 'paused';
          else if (playerStateCode === 3) status = 'buffering';
          else if (playerStateCode === 0) status = 'ended';

          const socket = getSocket();
          socket.emit('player:report_state', {
            status,
            currentTime: currentTime || 0,
            duration: duration || 0,
          });
        } catch (e) {
          // progress check
        }
      }
    }, 1000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlayerReady]);

  const handleStartJukeboxClick = () => {
    setHasUserStarted(true);
    onStartJukebox();
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        playerRef.current.playVideo();
      } catch (e) {
        // play trigger
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#0a0a3a] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden relative flex flex-col text-[#fffcef]"
    >
      {/* Window Title Bar */}
      <div className="h-10 bg-[#0a0a3a] border-b border-[#25385b] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#fffcef]" />
          {isNormalizing && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-[#a2b0ff]/20 border border-[#a2b0ff]/40 text-[#a2b0ff] text-[10px] font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#a2b0ff]" /> NORMALIZER ACTIVE (-18%)
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-[#84849c]">master_player.tsx</span>
        <button
          onClick={() => setIsTheaterMode(!isTheaterMode)}
          title={isTheaterMode ? 'Standard View' : 'Theater View'}
          className="p-1.5 rounded-lg text-[#84849c] hover:text-[#fffcef] hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer"
        >
          {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Embed Container */}
      <div
        className={`relative w-full bg-[#000000] transition-all duration-300 ${
          isTheaterMode ? 'aspect-[21/9] sm:aspect-[16/9]' : 'aspect-video'
        }`}
      >
        <div id="master-yt-player-target" className="w-full h-full" />

        {/* Autoplay Unlock Screen */}
        {!hasUserStarted && !playerState.isJukeboxStarted && (
          <div className="absolute inset-0 z-30 bg-[#0a0a3a]/95 border border-[#25385b] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-[#a2b0ff]/20 border border-[#a2b0ff]/40 text-[#fffcef] flex items-center justify-center shadow-recess">
              <Disc3 className="w-9 h-9 text-[#fffcef] animate-spin" style={{ animationDuration: '4s' }} />
            </div>

            <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-[#fffcef] mb-1.5">
              Office Jukebox Master DJ
            </h2>
            <p className="text-xs text-[#84849c] max-w-sm mb-6">
              Bấm nút bên dưới để khởi chạy âm thanh YouTube và phát ra loa văn phòng.
            </p>

            <button
              onClick={handleStartJukeboxClick}
              className="btn-primary px-6 py-3 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-recess"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START JUKEBOX</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
