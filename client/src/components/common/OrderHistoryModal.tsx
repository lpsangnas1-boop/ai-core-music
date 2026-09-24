import React, { useEffect, useState, useMemo } from 'react';
import { X, User, Clock, RotateCcw, Loader2, Music2, Search, Filter, Check } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../hooks/useToast.js';
import type { RequestHistoryItem } from '../../types/index.js';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReorderSong?: (youtubeId: string, title: string) => Promise<unknown>;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString('vi-VN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateString;
  }
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  onReorderSong,
}) => {
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRequester, setSelectedRequester] = useState<string>('');
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [reorderedIds, setReorderedIds] = useState<string[]>([]);
  const { addToast } = useToast();

  const handleReorder = async (item: RequestHistoryItem) => {
    if (!onReorderSong) return;
    setReorderingId(item.id);
    try {
      await onReorderSong(item.youtubeId, item.title);
      setReorderedIds((prev) => [...prev, item.id]);
      setTimeout(() => {
        setReorderedIds((prev) => prev.filter((id) => id !== item.id));
      }, 3000);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Không thể order lại', message: e?.message || 'Vui lòng thử lại' });
    } finally {
      setReorderingId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api
        .getRequestHistory(1000)
        .then((data) => setHistory(data))
        .catch((err) => console.warn('Failed to load history:', err))
        .finally(() => setIsLoading(false));
    } else {
      setSearchQuery('');
      setSelectedRequester('');
    }
  }, [isOpen]);

  // Extract distinct list of requesters with count
  const requesterList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of history) {
      const name = item.requesterName?.trim();
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [history]);

  // Filter history based on search query and selected requester
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (selectedRequester && item.requesterName !== selectedRequester) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.requesterName?.toLowerCase().includes(q);
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesChannel = item.channel?.toLowerCase().includes(q);
        return matchesName || matchesTitle || matchesChannel;
      }

      return true;
    });
  }, [history, selectedRequester, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#0a0a3a]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden text-left max-h-[92vh] flex flex-col text-[#25385b]">
        {/* Window Title Bar */}
        <div className="h-9 sm:h-10 bg-[#eef0ff] border-b border-[#25385b] flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#25385b]" />
          </div>
          <span className="font-mono text-xs text-[#84849c]">order_history.modal</span>
          <button
            onClick={onClose}
            className="p-1.5 text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2.5 sm:pb-3 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="font-sans text-base sm:text-xl font-bold tracking-tight text-[#25385b] flex items-center gap-2">
              <span>Lịch sử bài hát đã order</span>
            </h3>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#25385b] text-[#fffcef] text-[9px] sm:text-[10px] font-mono font-bold uppercase">
              {history.length} BÀI HÁT
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#84849c]">
            Các bài hát đã từng được yêu cầu trong văn phòng. Bạn có thể tìm kiếm hoặc order lại bất kỳ bài nào.
          </p>
        </div>

        {/* Filter & Search Card */}
        <div className="mx-4 sm:mx-6 p-2.5 sm:p-3 rounded-xl bg-[#a2b0ff]/15 border border-[#25385b] space-y-2 sm:space-y-2.5 shrink-0">
          {/* Search input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#84849c]">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên người order hoặc tên bài hát..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-[#ffffff] border border-[#25385b]/40 rounded-lg focus:outline-hidden focus:border-[#3252f4] text-[#25385b] placeholder-[#84849c] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#84849c] hover:text-[#25385b] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Requester Filter Chips */}
          {requesterList.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
              <span className="text-[10px] font-bold text-[#84849c] shrink-0 flex items-center gap-1 mr-1 uppercase font-mono">
                <Filter className="w-3 h-3" />
                Lọc:
              </span>

              {/* All Chip */}
              <button
                onClick={() => setSelectedRequester('')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border shrink-0 transition-all cursor-pointer ${
                  !selectedRequester
                    ? 'bg-[#25385b] text-[#ffffff] border-[#25385b]'
                    : 'bg-[#ffffff] text-[#25385b] border-[#25385b]/30 hover:border-[#25385b]'
                }`}
              >
                Tất cả ({history.length})
              </button>

              {/* Individual Requesters */}
              {requesterList.map(({ name, count }) => {
                const isSelected = selectedRequester === name;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedRequester(isSelected ? '' : name)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#25385b] text-[#ffffff] border-[#25385b]'
                        : 'bg-[#ffffff] text-[#25385b] border-[#25385b]/30 hover:border-[#25385b]'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span>{name}</span>
                    <span className="opacity-75 font-mono text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-2.5 min-h-[220px]">
          {isLoading ? (
            <div className="py-12 text-center text-[#84849c] text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#3252f4]" />
              <span>Đang tải lịch sử...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-[#84849c] text-xs">
              <Music2 className="w-8 h-8 mx-auto mb-2 text-[#3252f4] opacity-75" />
              <p className="font-bold text-[#25385b] text-sm">Chưa có bài hát nào trong lịch sử</p>
              <p className="text-[11px] mt-0.5 text-[#84849c]">
                Khi các bài hát trong hàng đợi phát xong, chúng sẽ được lưu lại tại đây.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-[#84849c] text-xs">
              <Search className="w-8 h-8 mx-auto mb-2 text-[#3252f4] opacity-75" />
              <p className="font-bold text-[#25385b] text-sm">Không tìm thấy bài hát nào</p>
              <p className="text-[11px] mt-0.5 text-[#84849c]">
                Không có bài hát nào khớp với bộ lọc{' '}
                <span className="font-bold text-[#25385b]">
                  "{selectedRequester || searchQuery}"
                </span>
                .
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRequester('');
                }}
                className="btn-outline mt-3 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-2.5 sm:p-3 rounded-xl bg-[#ffffff] hover:bg-[#f0f3ff] border border-[#25385b]/30 hover:border-[#25385b] flex items-center gap-2.5 sm:gap-3.5 transition-all shadow-xs"
              >
                {/* Thumbnail */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-14 h-10 object-cover rounded-md border border-[#25385b] bg-[#fffcef] shrink-0"
                />

                {/* Track Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#25385b] truncate" title={item.title}>
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-[#84849c] truncate mt-0.5">
                    <span className="truncate">{item.channel}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#25385b] font-medium">
                      <User className="w-3 h-3 text-[#3252f4]" />
                      {item.requesterName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#84849c] font-mono mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(item.playedAt || item.createdAt)}</span>
                  </div>
                </div>

                {/* Quick Re-Order Button */}
                {onReorderSong && (
                  <button
                    onClick={() => handleReorder(item)}
                    disabled={reorderingId === item.id}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      reorderedIds.includes(item.id)
                        ? 'bg-[#f0fdf4] text-[#10b981] border-[#10b981]'
                        : 'bg-[#25385b] hover:bg-[#3252f4] text-[#ffffff] border-[#25385b]'
                    }`}
                    title="Order lại bài này vào hàng đợi"
                  >
                    {reorderingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ffffff]" />
                    ) : reorderedIds.includes(item.id) ? (
                      <Check className="w-3.5 h-3.5 text-[#10b981]" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-[#ffffff]" />
                    )}
                    <span className="hidden sm:inline text-[11px]">
                      {reorderedIds.includes(item.id) ? 'Đã thêm' : 'Order lại'}
                    </span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 pb-4 px-6 border-t border-[#25385b]/15 flex justify-between items-center text-xs text-[#84849c] shrink-0">
          <span className="font-mono text-[11px]">
            Hiển thị: <strong className="text-[#25385b]">{filteredHistory.length}</strong> / {history.length} bài
            {selectedRequester && ` (${selectedRequester})`}
          </span>
          <button
            onClick={onClose}
            className="btn-outline py-1.5 px-4 text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
