import React, { useState, useEffect } from 'react';
import { User, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api.js';
import type { RequestHistoryItem } from '../../types/index.js';

interface RequestHistoryProps {
  adminPin: string;
}

export const RequestHistory: React.FC<RequestHistoryProps> = ({ adminPin }) => {
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHistory(50, adminPin);
      setHistory(data);
    } catch (e) {
      console.warn('Fetch history error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [adminPin]);

  return (
    <div className="bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden flex flex-col h-full text-[#25385b]">
      {/* Window Title Bar */}
      <div className="h-10 bg-[#eef0ff] border-b border-[#25385b] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#25385b]" />
        </div>
        <span className="font-mono text-xs text-[#84849c]">request_history.log</span>
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-1.5 text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 rounded-lg transition-colors cursor-pointer"
          title="Refresh History"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#1a2b88]' : ''}`} />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1">
        <div className="mb-3.5 pb-2.5 border-b border-[#25385b]/15">
          <h3 className="font-sans font-bold uppercase tracking-tight text-[#25385b] text-sm sm:text-base">
            Request History
          </h3>
          <p className="text-xs text-[#84849c]">Nhật ký các bài hát đã phát hoặc bị xóa</p>
        </div>

        <div className="overflow-y-auto max-h-[380px] space-y-2 pr-1">
          {isLoading && history.length === 0 ? (
            <div className="py-8 text-center text-[#84849c] text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#1a2b88]" />
              <span>Đang tải lịch sử...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-[#84849c] text-xs bg-[#ffffff] rounded-xl border border-[#25385b]/20">
              Chưa có lịch sử bài hát nào.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#ffffff] border border-[#25385b]/20 flex items-center justify-between gap-2.5 shadow-xs"
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-12 h-9 object-cover rounded-lg border border-[#25385b]/20 bg-[#fffcef] shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#25385b] truncate">{item.title}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-[#84849c] mt-0.5">
                    <span className="truncate">{item.channel}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#1a2b88]">
                      <User className="w-3 h-3 text-[#1a2b88]" />
                      {item.requesterName}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      item.status === 'played'
                        ? 'bg-[#a2b0ff]/25 text-[#1a2b88] border border-[#25385b]/30'
                        : 'bg-[#ff8a7a]/25 text-[#25385b] border border-[#ff8a7a]/60'
                    }`}
                  >
                    {item.status}
                  </span>
                  <div className="text-[10px] font-mono text-[#84849c] mt-0.5">
                    {new Date(item.playedAt || item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
