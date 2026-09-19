import React, { useState, useEffect } from 'react';
import { Disc3, User, Sparkles, Music2, SkipForward, PictureInPicture2 } from 'lucide-react';
import { Visualizer } from '../common/Visualizer.js';
import { FloatingReactions } from '../common/FloatingReactions.js';
import { extractAmbientColor } from '../../utils/colorExtractor.js';
import type { PlayerState, ReactionItem } from '../../types/index.js';

interface NowPlayingCardProps {
  playerState: PlayerState;
  reactions?: ReactionItem[];
  onSkipSong?: () => void;
  onSendReaction?: (emoji: string) => void;
  onTogglePip?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const NowPlayingCard: React.FC<NowPlayingCardProps> = ({
  playerState,
  reactions = [],
  onSkipSong,
  onSendReaction,
  onTogglePip,
}) => {
  const { currentSong, status, currentTime, duration } = playerState;
  const isPlaying = status === 'playing';

  const [ambientColor, setAmbientColor] = useState('#5865f2');

  useEffect(() => {
    if (currentSong?.thumbnail) {
      extractAmbientColor(currentSong.thumbnail, currentSong.youtubeId).then(setAmbientColor);
    }
  }, [currentSong?.thumbnail, currentSong?.youtubeId]);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  if (!currentSong) {
    return (
      <div className="p-6 sm:p-8 bg-[#ffffff]/85 backdrop-blur-md text-center border-1.5 border-[#25385b] rounded-2xl shadow-recess-card text-[#25385b]">
        <div className="w-14 h-14 mx-auto mb-3.5 rounded-full bg-[#fffcef] border border-[#25385b] flex items-center justify-center text-[#25385b]">
          <Disc3 className="w-7 h-7 animate-spin text-[#3252f4]" style={{ animationDuration: '8s' }} />
        </div>
        <h3 className="font-runde text-base sm:text-lg font-bold text-[#25385b] mb-1.5">Chưa có bài hát nào đang phát</h3>
        <p className="text-xs text-[#84849c] max-w-sm mx-auto">
          Tìm tên bài hát hoặc dán link YouTube ở khung bên dưới để order bài đầu tiên cho văn phòng!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-[#ffffff]/85 backdrop-blur-md border-1.5 border-[#25385b] rounded-2xl shadow-recess-card relative overflow-hidden text-[#25385b]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 sm:mb-4 border-b border-[#25385b]/20">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#a2b0ff] text-[#25385b] border border-[#25385b] flex items-center justify-center shrink-0">
            <Music2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#25385b]" />
          </div>
          <span className="font-runde text-[11px] sm:text-sm font-extrabold uppercase tracking-wider text-[#25385b] whitespace-nowrap">
            Đang phát qua loa
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
          {currentSong.isDefault ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-[#fffcef] text-[#ff5a5a] border border-[#ff5a5a] whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-[#ff5a5a]" />
              <span className="hidden xs:inline">Playlist</span> mặc định
            </span>
          ) : currentSong.requesterName === 'YouTube Autoplay' || currentSong.requesterName === 'YouTube Tab DJ' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-[#f0f3ff] text-[#10b981] border border-[#10b981] whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-[#10b981]" />
              Tự phát
            </span>
          ) : currentSong.requesterName ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-[#fffcef] text-[#25385b] border border-[#25385b] whitespace-nowrap max-w-[130px] sm:max-w-[200px]">
              <User className="w-3 h-3 text-[#3252f4] shrink-0" />
              <span className="truncate">bởi {currentSong.requesterName}</span>
            </span>
          ) : null}

          {/* Instant Direct Skip Button */}
          {onSkipSong && (
            <button
              onClick={onSkipSong}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] text-xs font-semibold border border-[#25385b] transition-all shadow-xs group cursor-pointer shrink-0 active:scale-95"
              title="Bỏ qua bài hát hiện tại và phát bài tiếp theo"
            >
              <SkipForward className="w-3.5 h-3.5 text-[#3252f4] group-hover:translate-x-0.5 transition-transform" />
              <span className="whitespace-nowrap">Qua bài</span>
            </button>
          )}

          {/* PiP Button */}
          {onTogglePip && (
            <button
              onClick={onTogglePip}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] text-xs font-semibold border border-[#25385b] transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
              title="Thu gọn tab để ghim (Picture-in-Picture)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5 text-[#3252f4]" />
              <span className="hidden sm:inline">Ghim PiP</span>
            </button>
          )}

          <Visualizer isPlaying={isPlaying} barColor="bg-[#25385b]" />
        </div>
      </div>

      {/* Main Track Details with Rotating Vinyl Disc */}
      <div className="flex items-center gap-3.5 sm:gap-6 my-1">
        {/* Vinyl Disc Container */}
        <div className="relative group shrink-0">
          {/* Dynamic Ambient Aura Glow */}
          {isPlaying && (
            <div
              className="absolute -inset-1.5 sm:-inset-2 rounded-full blur-md sm:blur-lg opacity-85 animate-pulse transition-all duration-700"
              style={{
                background: `radial-gradient(circle, ${ambientColor}99 0%, ${ambientColor}33 70%, transparent 100%)`,
                boxShadow: `0 0 25px ${ambientColor}66`,
              }}
            />
          )}

          {/* Vinyl Record */}
          <div
            className={`relative w-20 h-20 sm:w-28 sm:h-28 rounded-full vinyl-disc flex items-center justify-center border-2 border-[#111214] shadow-discord transition-transform ${
              isPlaying ? 'animate-vinyl-spin' : ''
            }`}
            style={{
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          >
            {/* Grooves Overlay */}
            <div className="absolute inset-0 rounded-full vinyl-grooves pointer-events-none" />

            {/* Vinyl Center Hole Label (Album Thumbnail) */}
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-[#3f4147] shadow-inner bg-[#1e1f22] flex items-center justify-center">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
              {/* Spindle Center Hole */}
              <div
                className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#2b2d31] border shadow-xs"
                style={{ borderColor: ambientColor }}
              />
            </div>
          </div>
        </div>

        {/* Track Title & Timeline */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
          <div>
            <h2
              className="font-runde text-sm sm:text-lg font-bold text-[#25385b] tracking-tight line-clamp-2 sm:truncate mb-1 leading-snug"
              title={currentSong.title}
            >
              {currentSong.title}
            </h2>
            <p className="text-[11px] sm:text-xs text-[#84849c] truncate font-medium">
              {currentSong.channel}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full mt-2 sm:mt-3">
            <div className="w-full h-2 bg-[#fffcef] rounded-full border border-[#25385b]/20 overflow-hidden mb-1 sm:mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: ambientColor,
                  boxShadow: `0 0 8px ${ambientColor}88`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] sm:text-xs text-[#84849c] font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>
        </div>
      </div>


      {/* Floating Reactions Bar in Footer */}
      {onSendReaction && (
        <div className="mt-4 pt-3.5 border-t border-[#25385b]/20">
          <FloatingReactions reactions={reactions} onSendReaction={onSendReaction} />
        </div>
      )}
    </div>
  );
};
