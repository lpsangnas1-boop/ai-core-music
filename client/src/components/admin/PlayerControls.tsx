import React from 'react';
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
} from 'lucide-react';
import type { PlayerState } from '../../types/index.js';

interface PlayerControlsProps {
  playerState: PlayerState;
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

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playerState,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolume,
}) => {
  const { currentSong, status, currentTime, duration, volume, isMuted } = playerState;
  const isPlaying = status === 'playing';

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
    <div className="bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden text-[#25385b]">
      {/* Window Title Bar */}
      <div className="h-10 bg-[#eef0ff] border-b border-[#25385b] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#25385b]" />
        </div>
        <span className="font-mono text-xs text-[#84849c]">player_controls.tsx</span>
        <span className="font-mono text-[11px] text-[#84849c]">
          vol: {isMuted ? 'muted' : `${volume}%`}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Current Song Details */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-3.5 border-b border-[#25385b]/15">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            {currentSong ? (
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-14 h-14 rounded-xl object-cover border border-[#25385b]/30 shrink-0 bg-[#fffcef]"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#a2b0ff]/20 border border-[#25385b]/30 flex items-center justify-center shrink-0 text-[#25385b]">
                <Play className="w-6 h-6" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="font-sans font-bold uppercase tracking-tight text-[#25385b] text-sm sm:text-base truncate" title={currentSong?.title || 'Idle'}>
                {currentSong?.title || 'Chưa có bài hát nào đang phát'}
              </h3>
              <p className="text-xs text-[#84849c] truncate">
                {currentSong?.channel || 'AI Core music'}
              </p>
            </div>
          </div>

          {/* Source Tag Badge */}
          {currentSong && (
            <div className="shrink-0">
              {currentSong.isDefault ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#fffcef] text-[#25385b] border border-[#25385b]/40">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff8a7a]" />
                  <span>Playlist mặc định</span>
                </span>
              ) : currentSong.requesterName ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#a2b0ff]/20 text-[#25385b] border border-[#a2b0ff]">
                  <User className="w-3.5 h-3.5 text-[#1a2b88]" />
                  <span>bởi {currentSong.requesterName}</span>
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Scrub Time Slider */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#84849c] w-10 text-right font-medium">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1 group">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progressPercent || 0}
                onChange={handleSeekChange}
                className="w-full h-2 bg-[#a2b0ff]/20 rounded-full border border-[#25385b]/30 appearance-none cursor-pointer accent-[#25385b] focus:outline-none"
              />
            </div>

            <span className="text-xs font-mono text-[#84849c] w-10 text-left font-medium">
              {duration > 0 ? formatTime(duration) : '0:00'}
            </span>
          </div>
        </div>

        {/* Controls & Volume */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              className="p-2 rounded-xl bg-[#fffcef] hover:bg-[#a2b0ff]/20 text-[#25385b] border border-[#25385b] transition-all cursor-pointer shadow-recess"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4 fill-current text-[#25385b]" />
            </button>

            <button
              onClick={isPlaying ? onPause : onPlay}
              className="btn-primary px-6 py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-recess"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Phát</span>
                </>
              )}
            </button>

            <button
              onClick={onNext}
              className="p-2 rounded-xl bg-[#fffcef] hover:bg-[#a2b0ff]/20 text-[#25385b] border border-[#25385b] transition-all cursor-pointer shadow-recess"
              title="Skip to Next Track"
            >
              <SkipForward className="w-4 h-4 fill-current text-[#25385b]" />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2.5 w-full sm:w-52 justify-end">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 transition-colors shrink-0 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
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
              className="w-full h-2 bg-[#a2b0ff]/20 rounded-full border border-[#25385b]/30 appearance-none cursor-pointer accent-[#25385b] focus:outline-none"
            />

            <span className="text-xs font-mono text-[#84849c] w-9 text-right shrink-0 font-semibold">
              {isMuted ? '0%' : `${volume}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
