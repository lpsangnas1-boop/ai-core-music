import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ListMusic,
  Sparkles,
  History,
  Lock,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { AdminPlayerCard } from '../components/admin/AdminPlayerCard.js';
import { AdminQueueManager } from '../components/admin/AdminQueueManager.js';
import { DefaultPlaylistManager } from '../components/admin/DefaultPlaylistManager.js';
import { RequestHistory } from '../components/admin/RequestHistory.js';
import type { PlayerState, QueueItem, PlaylistItem, NetworkInfo, JukeboxSettings } from '../types/index.js';

interface AdminPageProps {
  playerState: PlayerState;
  queue: QueueItem[];
  playlist: PlaylistItem[];
  settings?: JukeboxSettings;
  networkInfo: NetworkInfo;
  adminPin: string;
  onLogoutAdmin: () => void;
  onStartJukebox: () => void;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number, isMuted: boolean) => void;
  onPlayNow?: (url: string) => void;
  onRemoveQueueItem: (id: string) => void;
  onPlayNextQueue: (id: string) => void;
  onReorderQueue: (orderedIds: string[]) => void;
  onClearQueue: () => void;
  onAddQueueSong: (url: string, name: string) => Promise<any>;
  onAddPlaylistSong: (url: string) => Promise<any>;
  onRemovePlaylistSong: (id: string) => void;
  onTogglePlaylistSong: (id: string, isEnabled: boolean) => void;
  onReorderPlaylist: (orderedIds: string[]) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  playerState,
  queue,
  playlist,
  settings,
  networkInfo,
  adminPin,
  onLogoutAdmin,
  onStartJukebox,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolume,
  onPlayNow,
  onRemoveQueueItem,
  onPlayNextQueue,
  onReorderQueue,
  onClearQueue,
  onAddQueueSong,
  onAddPlaylistSong,
  onRemovePlaylistSong,
  onTogglePlaylistSong,
  onReorderPlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'playlist' | 'history'>('queue');
  const [copied, setCopied] = useState(false);

  const requestUrl = networkInfo.url || window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(requestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 text-[#25385b]">
      {/* Top DJ Status Bar */}
      <div className="p-3.5 sm:px-5 rounded-2xl bg-[#fffcef] border border-[#25385b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-recess">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#a2b0ff]/30 border border-[#25385b] text-[#25385b] flex items-center justify-center shadow-recess">
            <ShieldCheck className="w-5 h-5 text-[#25385b]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-sans font-bold uppercase tracking-tight text-[#25385b] text-sm sm:text-base">
                DJ Workstation Active
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#25385b] text-[#fffcef] text-[10px] font-mono font-bold uppercase">
                MASTER PLAYER
              </span>
            </div>
            <p className="text-[11px] text-[#84849c]">
              Âm thanh đang phát từ máy tính này. Vui lòng giữ tab này mở.
            </p>
          </div>
        </div>

        <button
          onClick={onLogoutAdmin}
          className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer self-end sm:self-auto"
          title="Khóa DJ Station"
        >
          <Lock className="w-3.5 h-3.5 text-[#25385b]" />
          <span>Khóa</span>
        </button>
      </div>

      {/* Main Grid: Left Master Player & Controls, Right QR Code & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Master Player & Controls */}
        <div className="lg:col-span-7 space-y-4">
          <AdminPlayerCard
            playerState={playerState}
            nextSong={queue.find((q) => q.status === 'queued')}
            settings={settings}
            adminPin={adminPin}
            onStartJukebox={onStartJukebox}
            onPlay={onPlay}
            onPause={onPause}
            onNext={onNext}
            onPrevious={onPrevious}
            onSeek={onSeek}
            onVolume={onVolume}
          />
        </div>

        {/* Right Column (5 cols): QR Code Widget & Tabbed Lists */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick QR Card */}
          <div className="p-4 rounded-2xl bg-[#fffcef] border border-[#25385b] flex items-center gap-4 shadow-recess">
            <div className="p-2 bg-[#ffffff] rounded-xl border border-[#25385b]/30 shrink-0">
              <QRCodeSVG
                value={requestUrl}
                size={68}
                level="H"
                fgColor="#25385b"
                bgColor="#ffffff"
                imageSettings={{
                  src: '/logo.png',
                  x: undefined,
                  y: undefined,
                  height: 18,
                  width: 18,
                  excavate: true,
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#1a2b88] mb-0.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>Guest Request Link</span>
              </div>
              <p className="text-xs text-[#25385b] font-mono truncate select-all">{requestUrl}</p>
              <button
                onClick={handleCopyLink}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#84849c] hover:text-[#25385b] cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#1a2b88]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Đã copy' : 'Sao chép link'}</span>
              </button>
            </div>
          </div>

          {/* Content Tab Bar */}
          <div className="flex border-b border-[#25385b]/20 gap-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 rounded-t-xl cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-[#fffcef] text-[#25385b] border-b-2 border-[#25385b]'
                  : 'text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/15'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5 text-[#25385b]" />
              <span>Queue ({queue.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('playlist')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 rounded-t-xl cursor-pointer ${
                activeTab === 'playlist'
                  ? 'bg-[#fffcef] text-[#25385b] border-b-2 border-[#25385b]'
                  : 'text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/15'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff8a7a]" />
              <span>Playlist ({playlist.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 rounded-t-xl cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#fffcef] text-[#25385b] border-b-2 border-[#25385b]'
                  : 'text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/15'
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#1a2b88]" />
              <span>History</span>
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'queue' && (
              <AdminQueueManager
                queue={queue}
                onRemove={onRemoveQueueItem}
                onPlayNext={onPlayNextQueue}
                onPlayNow={onPlayNow}
                onReorder={onReorderQueue}
                onClear={onClearQueue}
                onAddSong={onAddQueueSong}
              />
            )}

            {activeTab === 'playlist' && (
              <DefaultPlaylistManager
                playlist={playlist}
                onAddSong={onAddPlaylistSong}
                onRemoveSong={onRemovePlaylistSong}
                onToggleSong={onTogglePlaylistSong}
                onReorder={onReorderPlaylist}
              />
            )}

            {activeTab === 'history' && <RequestHistory adminPin={adminPin} />}
          </div>
        </div>
      </div>
    </div>
  );
};
