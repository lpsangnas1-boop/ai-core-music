import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  Check,
  X,
  Loader2,
  Disc3,
} from 'lucide-react';
import type { PlaylistItem } from '../../types/index.js';

interface DefaultPlaylistManagerProps {
  playlist: PlaylistItem[];
  onAddSong: (url: string) => Promise<any>;
  onRemoveSong: (id: string) => void;
  onToggleSong: (id: string, isEnabled: boolean) => void;
  onReorder: (orderedIds: string[]) => void;
}

export const DefaultPlaylistManager: React.FC<DefaultPlaylistManagerProps> = ({
  playlist,
  onAddSong,
  onRemoveSong,
  onToggleSong,
  onReorder,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const moveToTop = (index: number) => {
    if (index <= 0) return;
    const newPlaylist = [...playlist];
    const [target] = newPlaylist.splice(index, 1);
    newPlaylist.unshift(target);
    onReorder(newPlaylist.map((p) => p.id));
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newPlaylist = [...playlist];
    const temp = newPlaylist[index];
    newPlaylist[index] = newPlaylist[index - 1];
    newPlaylist[index - 1] = temp;
    onReorder(newPlaylist.map((p) => p.id));
  };

  const moveDown = (index: number) => {
    if (index >= playlist.length - 1) return;
    const newPlaylist = [...playlist];
    const temp = newPlaylist[index];
    newPlaylist[index] = newPlaylist[index + 1];
    newPlaylist[index + 1] = temp;
    onReorder(newPlaylist.map((p) => p.id));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddSong(newUrl.trim());
      setNewUrl('');
      setIsAdding(false);
    } catch (e) {
      // error handled in toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden flex flex-col h-full text-[#25385b]">
      {/* Window Title Bar */}
      <div className="h-10 bg-[#eef0ff] border-b border-[#25385b] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#25385b]" />
        </div>
        <span className="font-mono text-xs text-[#84849c]">default_playlist.tsx</span>
        <span className="font-mono text-[11px] text-[#84849c]">
          {playlist.length} {playlist.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-[#25385b]/15">
          <div>
            <h3 className="font-sans font-bold uppercase tracking-tight text-[#25385b] text-sm sm:text-base">
              Playlist mặc định ({playlist.length})
            </h3>
            <p className="text-xs text-[#84849c]">Tự động phát khi không có ai order bài</p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="btn-primary py-1.5 px-3 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer shadow-recess"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm bài</span>
          </button>
        </div>

        {/* Inline Add Song Form */}
        {isAdding && (
          <form onSubmit={handleAddSubmit} className="mb-3 p-3 rounded-xl bg-[#ffffff] border border-[#25385b]/30 animate-in fade-in duration-150">
            <label className="block text-[11px] font-mono text-[#84849c] mb-1.5 font-bold uppercase tracking-wider">
              Thêm URL YouTube vào Playlist
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Dán link YouTube tại đây..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#fffcef] border border-[#25385b]/30 text-xs text-[#25385b] placeholder-[#84849c] focus:outline-none focus:border-[#25385b] font-mono"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSubmitting || !newUrl.trim()}
                className="btn-primary py-1.5 px-4 text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Thêm'}
              </button>
            </div>
          </form>
        )}

        {/* Playlist Items */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1">
          {playlist.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-[#ffffff] border border-[#25385b]/20">
              <Disc3 className="w-7 h-7 text-[#25385b] mx-auto mb-2 opacity-80" />
              <h4 className="font-sans text-xs sm:text-sm font-bold text-[#25385b] mb-1">Playlist đang trống</h4>
              <p className="text-xs text-[#84849c] max-w-xs mx-auto">
                Thêm bài hát để phát tự động khi hàng đợi trống.
              </p>
            </div>
          ) : (
            playlist.map((item, index) => {
              const positionString = (index + 1).toString().padStart(2, '0');

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                    !item.isEnabled
                      ? 'bg-[#fffcef]/50 opacity-50 border-[#25385b]/20'
                      : index === 0
                      ? 'bg-[#a2b0ff]/20 border-[#25385b] shadow-recess'
                      : 'bg-[#ffffff] hover:bg-[#a2b0ff]/10 border-[#25385b]/25'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-5 text-center font-mono font-bold text-xs shrink-0 ${
                        index === 0 ? 'text-[#1a2b88]' : 'text-[#84849c]'
                      }`}
                    >
                      {positionString}
                    </span>

                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-9 object-cover rounded-lg border border-[#25385b]/20 bg-[#fffcef] shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#25385b] truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#84849c] truncate mt-0.5">{item.channel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onToggleSong(item.id, !item.isEnabled)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        item.isEnabled
                          ? 'text-[#1a2b88] hover:bg-[#a2b0ff]/20'
                          : 'text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20'
                      }`}
                      title={item.isEnabled ? 'Đang bật (bấm để tắt)' : 'Đã tắt (bấm để bật)'}
                    >
                      {item.isEnabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>

                    {/* Top Priority (Đôn lên vị trí #1) Button */}
                    <button
                      onClick={() => moveToTop(index)}
                      disabled={index === 0}
                      className={`px-2 py-1 rounded-full transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                        index === 0
                          ? 'opacity-25 cursor-not-allowed text-[#84849c]'
                          : 'text-[#fffcef] bg-[#25385b] hover:bg-[#1a2b88] border border-[#25385b] shadow-recess'
                      }`}
                      title={index === 0 ? 'Bài này đã ở vị trí #1' : '⭐ Đôn lên vị trí đầu tiên (#1)'}
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[10px]">#1 Top</span>
                    </button>

                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-[#84849c] hover:text-[#25385b] disabled:opacity-20 hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Chuyển lên 1 vị trí"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === playlist.length - 1}
                      className="p-1.5 rounded-lg text-[#84849c] hover:text-[#25385b] disabled:opacity-20 hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Chuyển xuống 1 vị trí"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Xóa "${item.title}" khỏi playlist mặc định?`)) {
                          onRemoveSong(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#84849c] hover:text-[#ff5a5a] hover:bg-[#ff8a7a]/20 transition-colors ml-0.5 cursor-pointer"
                      title="Xóa khỏi playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
