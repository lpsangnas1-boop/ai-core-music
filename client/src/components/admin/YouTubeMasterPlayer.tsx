import React, { useEffect, useRef, useState } from 'react';
import { Play, Disc3, Maximize2, Minimize2, Shield } from 'lucide-react';
import { MasterStatusBanner } from './MasterStatusBanner.js';
import { useMasterPlayer } from '../../hooks/useMasterPlayer.js';
import type { PlayerState, QueueItem, JukeboxSettings } from '../../types/index.js';

interface YouTubeMasterPlayerProps {
  playerState: PlayerState;
  nextSong?: QueueItem | null;
  settings?: JukeboxSettings;
  adminPin: string;
  onStartJukebox: () => void;
}

export const YouTubeMasterPlayer: React.FC<YouTubeMasterPlayerProps> = ({
  playerState,
  nextSong,
  settings,
  adminPin,
  onStartJukebox,
}) => {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [hasUserStarted, setHasUserStarted] = useState(playerState.isJukeboxStarted);

  // Opening the dedicated player tab is an explicit choice to play audio here.
  const master = useMasterPlayer({
    containerId: 'master-yt-player-target',
    playerState,
    settings,
    adminPin,
    takeoverOnMount: true,
    showControls: true,
  });
  const { isNormalizing } = master;

  const preloadedRef = useRef<string | null>(null);

  // Seamless Transition Preloading
  useEffect(() => {
    if (playerState.status !== 'playing' || playerState.duration <= 0 || playerState.currentTime <= 0) return;
    const remaining = playerState.duration - playerState.currentTime;
    if (remaining <= 10 && nextSong?.youtubeId && preloadedRef.current !== nextSong.youtubeId) {
      preloadedRef.current = nextSong.youtubeId;
      const img = new Image();
      img.src = nextSong.thumbnail || `https://i.ytimg.com/vi/${nextSong.youtubeId}/hqdefault.jpg`;
    }
  }, [playerState.status, playerState.duration, playerState.currentTime, nextSong?.youtubeId, nextSong?.thumbnail]);

  const handleStartJukeboxClick = () => {
    setHasUserStarted(true);
    if (!master.isActive) master.claim();
    master.unlockAudio();
    onStartJukebox();
  };

  return (
    <div className="space-y-3">
      <MasterStatusBanner
        isActive={master.isActive}
        activeKind={master.activeKind}
        registerError={master.registerError}
        needsUserGesture={master.needsUserGesture}
        onClaim={master.claim}
        onUnlock={master.unlockAudio}
      />

      <div className="bg-[#0a0a3a] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden relative flex flex-col text-[#fffcef]">
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
    </div>
  );
};
