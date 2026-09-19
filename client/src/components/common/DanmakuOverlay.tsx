import React, { useState, useEffect, useRef } from 'react';
import type { DanmakuItem } from '../../types/index.js';

interface DanmakuOverlayProps {
  danmakuList: DanmakuItem[];
  onSendDanmaku: (text: string, userName?: string, color?: string) => void;
  defaultUserName?: string;
}

const PRESET_COLORS = [
  '#ffffff', // Cloud White
  '#25385b', // Twilight Navy
  '#3252f4', // Cobalt Pop
  '#ff5a5a', // Coral Blush
  '#a2b0ff', // Periwinkle Sky
  '#10b981', // Emerald Green
  '#f59e0b', // Amber
];

const MEME_PRESETS = [
  'Quá đã 🔥',
  'Ai ngáp đi rửa mặt đê 💤',
  'Bao giờ có trà sữa? 🧋',
  'Hết bài này tới bài tui 🎵',
  'Đỉnh nóc kịch trần 🚀',
  'Nhạc này quẩy tới sáng 💃',
  'Xin đừng skip bài này 🙏',
];

export const DanmakuOverlay: React.FC<DanmakuOverlayProps> = ({
  danmakuList,
  onSendDanmaku,
  defaultUserName = '',
}) => {
  const [activeItems, setActiveItems] = useState<DanmakuItem[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jukebox_danmaku_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem('office_jukebox_user_name') || defaultUserName || '';
    } catch {
      return defaultUserName || '';
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync isEnabled to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jukebox_danmaku_enabled', JSON.stringify(isEnabled));
    } catch {}
  }, [isEnabled]);

  // When new danmaku arrives, add to active items
  useEffect(() => {
    if (danmakuList.length > 0) {
      const latest = danmakuList[danmakuList.length - 1];
      setActiveItems((prev) => {
        if (prev.some((item) => item.id === latest.id)) return prev;
        return [...prev.slice(-30), latest];
      });
    }
  }, [danmakuList]);

  // Helper to scale flight speed: default 5-7s is too fast, scale to 14-18s for relaxed readability
  const getDanmakuDuration = (duration?: number) => Math.max(Math.round((duration || 6) * 2.5), 14);

  // Auto clean finished danmaku items
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveItems((prev) =>
        prev.filter((item) => {
          const flightSec = getDanmakuDuration(item.duration);
          return now - item.timestamp < (flightSec + 2) * 1000;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSend = (commentText?: string) => {
    const msg = (commentText || text).trim();
    if (!msg) return;

    const author = userName.trim() || 'Ẩn danh';
    try {
      localStorage.setItem('office_jukebox_user_name', author);
    } catch {}

    onSendDanmaku(msg, author, selectedColor);
    setText('');
    setIsInputOpen(false);
  };

  return (
    <>
      {/* Flying Danmaku Stream Screen (Pointer events none) */}
      {isEnabled && (
        <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none">
          {activeItems.map((item) => {
            const flightDuration = getDanmakuDuration(item.duration);
            return (
              <div
                key={item.id}
                className="absolute left-0 whitespace-nowrap animate-danmaku font-bold flex items-center gap-2"
                style={{
                  top: `${item.yPercent}%`,
                  animationDuration: `${flightDuration}s`,
                  color: item.color || '#ffffff',
                  textShadow:
                    '0 2px 4px rgba(37,56,91,0.9), -1px -1px 0 #25385b, 1px -1px 0 #25385b, -1px 1px 0 #25385b, 1px 1px 0 #25385b',
                }}
              >
                <span className="text-xs opacity-90 px-2.5 py-0.5 rounded-full bg-[#25385b]/85 text-[#ffffff] border border-[#a2b0ff]/50 font-mono">
                  {item.userName}
                </span>
                <span className="text-base sm:text-lg tracking-wide font-runde">{item.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Danmaku Controller (Bottom interactive trigger) */}
      <div className="fixed bottom-3 left-3 sm:left-auto sm:right-4 z-40 flex flex-col items-start sm:items-end gap-2">
        {/* Expanded Send Tray */}
        {isInputOpen && (
          <div className="w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm p-3 sm:p-3.5 shadow-2xl border-1.5 border-[#25385b] bg-[#ffffff] rounded-xl animate-fade-in text-[#25385b] mb-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#25385b]/20 mb-2.5">
              <span className="text-xs font-bold text-[#25385b] flex items-center gap-1.5 font-runde uppercase tracking-wider">
                <span>🚀</span> Bình luận bay (Danmaku)
              </span>
              <button
                onClick={() => setIsInputOpen(false)}
                className="text-[#84849c] hover:text-[#25385b] text-xs px-2 py-0.5 rounded-md hover:bg-[#fffcef] cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Quick Meme Chips */}
            <div className="mb-2.5">
              <span className="text-[10px] uppercase font-bold text-[#84849c] tracking-wider block mb-1.5 font-mono">
                Cà khịa nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {MEME_PRESETS.map((meme) => (
                  <button
                    key={meme}
                    type="button"
                    onClick={() => handleSend(meme)}
                    className="text-[11px] font-medium bg-[#fffcef] hover:bg-[#25385b] hover:text-[#ffffff] text-[#25385b] px-2.5 py-1 rounded-full border border-[#25385b]/30 transition-colors cursor-pointer active:scale-95"
                  >
                    {meme}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tên bạn..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-24 text-xs bg-[#fffcef] border border-[#25385b] rounded-lg px-2.5 py-1.5 text-[#25385b] placeholder-[#84849c] focus:outline-hidden focus:border-[#3252f4]"
                  maxLength={20}
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nhập nội dung bay..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 text-xs bg-[#fffcef] border border-[#25385b] rounded-lg px-2.5 py-1.5 text-[#25385b] placeholder-[#84849c] focus:outline-hidden focus:border-[#3252f4]"
                  maxLength={100}
                />
              </div>

              {/* Color Presets & Submit */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                        selectedColor === c ? 'scale-125 border-[#25385b] shadow-xs' : 'border-[#25385b]/30'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="bg-[#25385b] hover:bg-[#3252f4] text-[#ffffff] border border-[#25385b] rounded-lg text-xs py-1 px-3 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Bắn 🚀
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 bg-[#ffffff] p-1.5 rounded-full border-1.5 border-[#25385b] shadow-lg">
          {/* Toggle Display */}
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isEnabled
                ? 'bg-[#fffcef] text-[#25385b] hover:bg-[#f0f3ff] border border-[#25385b]/30'
                : 'bg-[#fff1f2] text-[#ff5a5a] border border-[#ff5a5a]'
            }`}
            title={isEnabled ? 'Tắt bình luận bay' : 'Bật bình luận bay'}
          >
            <span>{isEnabled ? '💬 Danmaku' : '🚫 Ẩn'}</span>
          </button>

          {/* Trigger Open Bar */}
          <button
            onClick={() => {
              setIsInputOpen(!isInputOpen);
              if (!isInputOpen) {
                setTimeout(() => inputRef.current?.focus(), 100);
              }
            }}
            className="flex items-center gap-1.5 bg-[#25385b] hover:bg-[#3252f4] text-[#ffffff] px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#25385b] shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <span>🚀 Bắn chữ</span>
          </button>
        </div>
      </div>
    </>
  );
};
