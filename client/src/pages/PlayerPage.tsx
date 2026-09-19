import React from 'react';
import { YouTubeMasterPlayer } from '../components/admin/YouTubeMasterPlayer.js';
import { PlayerControls } from '../components/admin/PlayerControls.js';
import { QueueList } from '../components/guest/QueueList.js';
import { Disc3, Radio, ArrowLeft, ExternalLink, PictureInPicture2 } from 'lucide-react';
import type { PlayerState, QueueItem, JukeboxSettings } from '../types/index.js';

interface PlayerPageProps {
  playerState: PlayerState;
  queue: QueueItem[];
  settings: JukeboxSettings;
  onStartJukebox: () => void;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number, isMuted: boolean) => void;
  onNavigateBack: () => void;
  onOpenBridgeModal: () => void;
  onTogglePip?: () => void;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({
  playerState,
  queue,
  settings,
  onStartJukebox,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolume,
  onNavigateBack,
  onOpenBridgeModal,
  onTogglePip,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 text-[#25385b]">
      {/* Top Banner */}
      <div className="p-3.5 sm:px-5 rounded-2xl bg-[#fffcef] border border-[#25385b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-recess">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#a2b0ff]/30 border border-[#25385b] text-[#25385b] flex items-center justify-center shadow-recess">
            <Radio className="w-5 h-5 text-[#25385b] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-sans font-bold uppercase tracking-tight text-[#25385b] text-sm sm:text-base">
                Dedicated Music Player Tab
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#25385b] text-[#fffcef] text-[10px] font-mono font-bold uppercase">
                ACTIVE AUDIO OUT
              </span>
            </div>
            <p className="text-[11px] text-[#84849c]">
              Giữ tab này mở để phát nhạc ra loa văn phòng. Mọi order từ đồng nghiệp sẽ tự động phát tại đây.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onTogglePip && (
            <button
              onClick={onTogglePip}
              className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              title="Mở cửa sổ nổi Always-on-Top (Picture-in-Picture)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5 text-[#3252f4]" />
              <span>Ghim PiP</span>
            </button>
          )}

          <button
            onClick={onOpenBridgeModal}
            className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
            title="Liên kết tab YouTube gốc (youtube.com)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#1a2b88]" />
            <span>Link youtube.com</span>
          </button>

          <button
            onClick={onNavigateBack}
            className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Player on left, Queue on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Large Master Player + DJ Controls */}
        <div className="lg:col-span-8 space-y-4">
          <YouTubeMasterPlayer
            playerState={playerState}
            nextSong={queue.find((q) => q.status === 'queued') || null}
            settings={settings}
            onStartJukebox={onStartJukebox}
            onSeek={onSeek}
          />

          <PlayerControls
            playerState={playerState}
            onPlay={onPlay}
            onPause={onPause}
            onNext={onNext}
            onPrevious={onPrevious}
            onSeek={onSeek}
            onVolume={onVolume}
          />
        </div>

        {/* Right Column (4 cols): Queue & Live Track Details */}
        <div className="lg:col-span-4 space-y-4">
          <QueueList
            queue={queue}
            deviceId="player_master"
            showRequesterNames={settings.showRequesterNames}
          />

          {/* Player Tab Info Note */}
          <div className="p-4 rounded-2xl bg-[#fffcef] border border-[#25385b] text-xs text-[#84849c] space-y-2 shadow-recess">
            <div className="flex items-center gap-2 font-bold text-[#25385b] font-sans uppercase tracking-tight">
              <Disc3 className="w-4 h-4 text-[#1a2b88]" />
              <span>Multi-Tab Sync Active</span>
            </div>
            <p className="text-[11px] text-[#84849c] leading-relaxed">
              Bạn có thể để tab này chạy ngầm hoặc kéo sang màn hình phụ. Khi bất kỳ ai order bài trên web chính, bài hát sẽ chuyển mượt mà tại đây.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
