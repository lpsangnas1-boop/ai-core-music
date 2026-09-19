import React from 'react';
import { User, Sparkles, ListMusic } from 'lucide-react';
import type { QueueItem } from '../../types/index.js';

interface QueueListProps {
  queue: QueueItem[];
  currentSongId?: string | null;
  deviceId: string;
  showRequesterNames?: boolean;
  className?: string;
}

export const QueueList: React.FC<QueueListProps> = ({
  queue,
  currentSongId,
  deviceId,
  showRequesterNames = true,
  className = '',
}) => {
  // Ensure we only show upcoming queued songs that are not the currently playing song
  const upcomingQueue = queue.filter(
    (item) => item.status === 'queued' && (!currentSongId || item.id !== currentSongId)
  );

  return (
    <div
      className={`p-4 sm:p-6 bg-[#ffffff]/85 backdrop-blur-md border-1.5 border-[#25385b] rounded-2xl flex flex-col shadow-recess-card text-[#25385b] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 sm:mb-4 border-b border-[#25385b]/20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#a2b0ff] text-[#25385b] border border-[#25385b] flex items-center justify-center shrink-0">
            <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#25385b]" />
          </div>
          <h3 className="font-runde font-extrabold uppercase tracking-wider text-[#25385b] text-xs sm:text-base whitespace-nowrap">
            Hàng đợi tiếp theo
          </h3>
        </div>

        <span className="shrink-0 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#fffcef] border border-[#25385b] text-[#25385b] text-[11px] sm:text-xs font-mono font-bold">
          {upcomingQueue.length} bài
        </span>
      </div>

      {/* Queue items */}
      {upcomingQueue.length === 0 ? (
        <div className="py-8 sm:py-12 px-3 sm:px-4 text-center rounded-xl bg-[#fffcef] border border-[#25385b] my-auto">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-[#3252f4] mx-auto mb-2 opacity-80" />
          <h4 className="font-runde text-xs sm:text-sm font-bold text-[#25385b] mb-1">
            Chưa có bài nào trong hàng đợi
          </h4>
          <p className="text-[11px] sm:text-xs text-[#84849c] max-w-xs mx-auto">
            Nhạc trên YouTube sẽ tự phát cho đến khi có người order bài mới.
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5 flex-1 min-h-0 max-h-[380px] sm:max-h-[460px] lg:max-h-none overflow-y-auto pr-0.5 sm:pr-1">
          {upcomingQueue.map((item, index) => {
            const isMyRequest = item.requesterDeviceId === deviceId;
            const positionString = (index + 1).toString().padStart(2, '0');

            return (
              <div
                key={item.id}
                className={`p-2 sm:p-3 rounded-xl border transition-all flex items-center gap-2.5 sm:gap-3.5 ${
                  isMyRequest
                    ? 'bg-[#fffcef] border-[#25385b] shadow-xs'
                    : 'bg-[#ffffff] hover:bg-[#f0f3ff] border-[#25385b]/30 hover:border-[#25385b]'
                }`}
              >
                {/* Position Index */}
                <span className="font-mono text-[11px] sm:text-xs font-bold text-[#84849c] w-4 sm:w-5 text-center shrink-0">
                  {positionString}
                </span>

                {/* Thumbnail */}
                <div className="relative w-12 h-9 sm:w-14 sm:h-10 rounded-md overflow-hidden border border-[#25385b] bg-[#fffcef] shrink-0">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Song & Requester Info */}
                <div className="flex-1 min-w-0">
                  <h4
                    className="font-runde text-xs sm:text-sm font-bold text-[#25385b] truncate mb-0.5"
                    title={item.title}
                  >
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#84849c]">
                    <span className="truncate">{item.channel}</span>
                    {showRequesterNames && item.requesterName && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#25385b] font-medium shrink-0">
                          <User className="w-3 h-3 text-[#3252f4]" />
                          <span className="truncate max-w-[80px] sm:max-w-none">{item.requesterName}</span>
                        </span>
                      </>
                    )}
                    {item.shoutout && (
                      <>
                        <span>•</span>
                        <span className="text-[#3252f4] font-semibold truncate max-w-[100px] sm:max-w-[130px] hidden sm:inline" title={item.shoutout}>
                          💌 "{item.shoutout}"
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                {isMyRequest && (
                  <span className="shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#a2b0ff]/30 text-[#25385b] border border-[#25385b] text-[9px] sm:text-[10px] font-mono font-bold">
                    <span className="hidden sm:inline">Bài của bạn</span>
                    <span className="sm:hidden">Bạn</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
