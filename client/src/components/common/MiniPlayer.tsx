import React, { useState, useEffect } from 'react';
import {
  Disc3,
  User,
  SkipForward,
  Play,
  Pause,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { extractAmbientColor } from '../../utils/colorExtractor.js';
import type { PlayerState } from '../../types/index.js';

interface MiniPlayerProps {
  playerState: PlayerState;
  isDocPip?: boolean;
  isInPage?: boolean;
  isPillMode?: boolean;
  isDocPipSupported?: boolean;
  onClose: () => void;
  onTogglePillMode?: () => void;
  onOpenDocPip?: () => void;
  onSkipSong?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSendReaction?: (emoji: string) => void;
  onFocusMainWindow?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  playerState,
  isDocPip = false,
  isInPage = false,
  isPillMode = false,
  isDocPipSupported = false,
  onClose,
  onTogglePillMode,
  onOpenDocPip,
  onSkipSong,
  onPlay,
  onPause,
  onSendReaction,
  onFocusMainWindow,
}) => {
  const { currentSong, status, currentTime, duration } = playerState;
  const isPlaying = status === 'playing';

  const [ambientColor, setAmbientColor] = useState('#5865f2');
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  // Default to compact mode true
  const [isCompactMode, setIsCompactMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('pip_compact_mode') !== 'false';
  });

  const toggleCompactMode = () => {
    const nextMode = !isCompactMode;
    setIsCompactMode(nextMode);
    try {
      localStorage.setItem('pip_compact_mode', String(nextMode));
      if (typeof window !== 'undefined' && window.resizeTo && isDocPip) {
        window.resizeTo(nextMode ? 330 : 380, nextMode ? 112 : 180);
      }
    } catch (e) {
      // Ignore resize error if restricted
    }
  };

  useEffect(() => {
    if (currentSong?.thumbnail) {
      extractAmbientColor(currentSong.thumbnail, currentSong.youtubeId).then(setAmbientColor);
    }
  }, [currentSong?.thumbnail, currentSong?.youtubeId]);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleReaction = (emoji: string) => {
    if (onSendReaction) {
      onSendReaction(emoji);
      setActiveReaction(emoji);
      setTimeout(() => setActiveReaction(null), 800);
    }
  };

  // --- 1. PILL MODE (Compact Floating Pill Badge in Page) ---
  if (isInPage && isPillMode) {
    return (
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 max-w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#fffcef] border-1.5 border-[#25385b] rounded-full shadow-recess-card select-none text-[#25385b]">
          {/* Mini Album Art */}
          <div className="relative w-6 h-6 rounded-full bg-[#111214] border border-[#25385b] flex items-center justify-center shrink-0 overflow-hidden">
            {currentSong?.thumbnail ? (
              <img
                src={currentSong.thumbnail}
                alt="thumb"
                className={`w-full h-full object-cover ${isPlaying ? 'animate-vinyl-spin' : ''}`}
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
              />
            ) : (
              <Disc3 className="w-3.5 h-3.5 text-[#a2b0ff] animate-spin" style={{ animationDuration: '4s' }} />
            )}
          </div>

          {/* Song info & time */}
          <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[180px]">
            <span className="text-xs font-bold font-runde truncate text-[#25385b] leading-tight">
              {currentSong?.title || 'Chưa phát nhạc'}
            </span>
            <span className="text-[10px] text-[#84849c] font-mono leading-none truncate mt-0.5">
              {currentSong?.requesterName ? `bởi ${currentSong.requesterName}` : formatTime(currentTime)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-[#25385b]/20">
            {onSkipSong && currentSong && (
              <button
                onClick={onSkipSong}
                className="p-1 rounded-full text-[#25385b] hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer"
                title="Qua bài tiếp theo"
              >
                <SkipForward className="w-3 h-3 text-[#3252f4]" />
              </button>
            )}

            {onTogglePillMode && (
              <button
                onClick={onTogglePillMode}
                className="p-1 rounded-full text-[#25385b] hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer"
                title="Mở rộng mini player"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-full text-[#84849c] hover:text-[#ff5a5a] hover:bg-[#ff8a7a]/20 transition-colors cursor-pointer"
              title="Đóng ghim"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. MAIN PLAYER (Doc PiP or In-Page Widget) ---
  const containerClasses = isDocPip
    ? 'w-full h-full bg-[#fffcef] text-[#25385b] flex flex-col justify-between overflow-hidden select-none font-sans'
    : `fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-5 sm:right-5 z-50 ${
        isCompactMode ? 'sm:w-[325px]' : 'sm:w-[380px]'
      } max-w-[calc(100vw-1.5rem)] bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden text-[#25385b] flex flex-col select-none animate-in fade-in slide-in-from-bottom-4 duration-200`;

  return (
    <div className={containerClasses}>
      {/* Title Bar */}
      <div
        className={`${
          isCompactMode ? 'h-6.5' : 'h-8'
        } bg-[#eef0ff] border-b border-[#25385b]/30 flex items-center justify-between px-3 shrink-0 select-none`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
          <span className="w-2 h-2 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
          <span className="w-2 h-2 rounded-full bg-[#25385b]" />
          <span className="font-mono text-[10px] text-[#84849c] ml-1 font-medium">pip_window.active</span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Toggle between Compact & Standard Size */}
          <button
            onClick={toggleCompactMode}
            className="p-1 text-[#84849c] hover:text-[#3252f4] hover:bg-[#a2b0ff]/20 rounded transition-colors cursor-pointer"
            title={isCompactMode ? 'Mở rộng bản chuẩn' : 'Thu nhỏ bản siêu gọn'}
          >
            {isCompactMode ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>

          {/* External Link button to focus main tab (in Doc PiP) */}
          {isDocPip && onFocusMainWindow && (
            <button
              onClick={onFocusMainWindow}
              className="p-1 text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 rounded transition-colors cursor-pointer"
              title="Quay lại tab chính"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Switch to OS PiP (in in-page mini) */}
          {isInPage && isDocPipSupported && onOpenDocPip && (
            <button
              onClick={onOpenDocPip}
              className="p-1 text-[#84849c] hover:text-[#3252f4] hover:bg-[#a2b0ff]/20 rounded transition-colors cursor-pointer"
              title="Ghim nổi trên mọi ứng dụng (Always-on-Top OS PiP)"
            >
              <Layers className="w-3 h-3" />
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1 text-[#84849c] hover:text-[#ff5a5a] hover:bg-[#ff8a7a]/20 rounded transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!currentSong ? (
        <div className="py-3 text-center text-[#84849c] space-y-1 flex flex-col items-center justify-center my-auto select-none">
          <Disc3 className="w-6 h-6 animate-spin text-[#3252f4]" style={{ animationDuration: '8s' }} />
          <p className="text-xs font-bold text-[#25385b]">Chưa có bài hát nào</p>
        </div>
      ) : isCompactMode ? (
        /* --- A. PHIÊN BẢN SIÊU NHỎ GỌN (COMPACT MODE - ~110px TALL) --- */
        <div className="px-3 py-2 flex-1 flex flex-col justify-between select-none">
          {/* Row 1: Mini Vinyl + Track Info + Play/Skip */}
          <div className="flex items-center gap-2.5">
            {/* Mini Vinyl */}
            <div className="relative shrink-0">
              {isPlaying && (
                <div
                  className="absolute -inset-0.5 rounded-full blur-xs opacity-75 animate-pulse"
                  style={{ background: ambientColor }}
                />
              )}
              <div
                className={`relative w-8 h-8 rounded-full vinyl-disc flex items-center justify-center border border-[#111214] shadow-xs ${
                  isPlaying ? 'animate-vinyl-spin' : ''
                }`}
                style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  backgroundColor: ambientColor,
                }}
              >
                <div className="absolute inset-0 rounded-full vinyl-grooves pointer-events-none" />
                <div className="relative w-4 h-4 rounded-full overflow-hidden border border-[#3f4147] bg-[#1e1f22] flex items-center justify-center">
                  <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
                  <div className="absolute w-1 h-1 rounded-full bg-[#2b2d31]" />
                </div>
              </div>
            </div>

            {/* Title & Requester */}
            <div className="flex-1 min-w-0">
              <h4
                className="font-runde text-xs font-bold text-[#25385b] truncate leading-tight"
                title={currentSong.title}
              >
                {currentSong.title}
              </h4>
              <div className="flex items-center gap-1 text-[10px] text-[#84849c] truncate mt-0.5 font-medium">
                <span className="truncate">{currentSong.channel}</span>
                {currentSong.requesterName && (
                  <>
                    <span>•</span>
                    <span className="text-[#3252f4] font-semibold truncate flex items-center gap-0.5">
                      <User className="w-2 h-2" />
                      {currentSong.requesterName}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Controls in Row 1 */}
            <div className="flex items-center gap-1 shrink-0">
              {(onPlay || onPause) && (
                <button
                  onClick={isPlaying ? onPause : onPlay}
                  className="w-6.5 h-6.5 rounded-full bg-[#25385b] hover:bg-[#3252f4] text-[#fffcef] flex items-center justify-center transition-transform active:scale-90 shadow-xs cursor-pointer"
                  title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                </button>
              )}

              {onSkipSong && (
                <button
                  onClick={onSkipSong}
                  className="w-6.5 h-6.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] hover:text-[#3252f4] border border-[#25385b]/40 flex items-center justify-center transition-transform active:scale-90 shadow-xs cursor-pointer"
                  title="Qua bài tiếp theo"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Progress + Reactions */}
          <div className="flex items-center gap-2 pt-1">
            {/* Progress line */}
            <div className="flex-1 space-y-0.5">
              <div className="w-full h-1 bg-[#25385b]/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%`, backgroundColor: ambientColor }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] text-[#84849c] font-mono font-medium leading-none">
                <span>{formatTime(currentTime)}</span>
                <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
              </div>
            </div>

            {/* 4 Reactions */}
            {onSendReaction && (
              <div className="flex items-center gap-0.5 shrink-0">
                {[
                  { emoji: '🔥', label: 'Cháy' },
                  { emoji: '❤️', label: 'Thả tim' },
                  { emoji: '👏', label: 'Vỗ tay' },
                  { emoji: '☕', label: 'Chill' },
                ].map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`w-5 h-5 rounded-full bg-[#ffffff] hover:bg-[#a2b0ff]/20 border border-[#25385b]/20 flex items-center justify-center text-[10px] transition-all cursor-pointer ${
                      activeReaction === emoji ? 'scale-125 bg-[#ffedd5]' : 'hover:scale-115 active:scale-90'
                    }`}
                    title={`Thả reaction ${label}`}
                  >
                    <span>{emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* --- B. PHIÊN BẢN TIÊU CHUẨN (STANDARD MODE - ~175px) --- */
        <div className="px-4 py-3 flex-1 flex flex-col justify-between select-none">
          {/* Row 1: Rotating Vinyl Disc + Track Details */}
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {isPlaying && (
                <div
                  className="absolute -inset-1 rounded-full blur-md opacity-80 animate-pulse transition-all duration-700"
                  style={{
                    background: `radial-gradient(circle, ${ambientColor}99 0%, ${ambientColor}33 70%, transparent 100%)`,
                  }}
                />
              )}
              <div
                className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-full vinyl-disc flex items-center justify-center border border-[#111214] shadow-xs transition-transform ${
                  isPlaying ? 'animate-vinyl-spin' : ''
                }`}
                style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  backgroundColor: ambientColor,
                }}
              >
                <div className="absolute inset-0 rounded-full vinyl-grooves pointer-events-none" />
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-[#3f4147] shadow-inner bg-[#1e1f22] flex items-center justify-center">
                  <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-[#2b2d31]" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4
                className="font-runde text-sm font-bold text-[#25385b] truncate tracking-tight"
                title={currentSong.title}
              >
                {currentSong.title}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-[#84849c] truncate mt-0.5">
                <span className="truncate">{currentSong.channel}</span>
                {currentSong.requesterName && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#25385b] font-medium shrink-0">
                      <User className="w-3 h-3 text-[#3252f4]" />
                      <span>{currentSong.requesterName}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Progress Bar & Timestamps */}
          <div className="w-full space-y-1 my-1">
            <div className="w-full h-1.5 bg-[#eef0ff] rounded-full border border-[#25385b]/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: ambientColor,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#84849c] font-mono font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>

          {/* Row 3: Play/Pause, Qua bài, and 4 Reaction Emojis */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              {(onPlay || onPause) && (
                <button
                  onClick={isPlaying ? onPause : onPlay}
                  className="w-8 h-8 rounded-full bg-[#25385b] hover:bg-[#3252f4] text-[#fffcef] transition-transform active:scale-95 flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                  title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              )}

              {onSkipSong && (
                <button
                  onClick={onSkipSong}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] text-xs font-bold border border-[#25385b] transition-transform active:scale-95 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                  title="Bỏ qua và phát bài tiếp theo"
                >
                  <SkipForward className="w-3.5 h-3.5 text-[#3252f4]" />
                  <span className="whitespace-nowrap">Qua bài</span>
                </button>
              )}
            </div>

            {onSendReaction && (
              <div className="flex items-center gap-1.5">
                {[
                  { emoji: '🔥', label: 'Cháy' },
                  { emoji: '❤️', label: 'Thả tim' },
                  { emoji: '👏', label: 'Vỗ tay' },
                  { emoji: '☕', label: 'Chill' },
                ].map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`w-7 h-7 rounded-full bg-[#ffffff] hover:bg-[#a2b0ff]/20 border border-[#25385b]/30 flex items-center justify-center text-xs transition-all shadow-xs cursor-pointer shrink-0 ${
                      activeReaction === emoji
                        ? 'scale-125 bg-[#ffedd5] border-[#f97316]'
                        : 'hover:scale-110 active:scale-95'
                    }`}
                    title={`Thả reaction ${label}`}
                  >
                    <span>{emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
