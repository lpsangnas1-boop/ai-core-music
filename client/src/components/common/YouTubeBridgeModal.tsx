import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Radio,
  FolderOpen,
} from 'lucide-react';
import type { NetworkInfo } from '../../types/index.js';

interface YouTubeBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkInfo: NetworkInfo;
}

export const YouTubeBridgeModal: React.FC<YouTubeBridgeModalProps> = ({
  isOpen,
  onClose,
  networkInfo,
}) => {
  const [copiedExtPath, setCopiedExtPath] = useState(false);

  if (!isOpen) return null;

  const serverUrl = window.location.origin || networkInfo.url;
  const extensionPath = 'youtube-extension';

  const handleCopyExtPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopiedExtPath(true);
    setTimeout(() => setCopiedExtPath(false), 2000);
  };

  const handleOpenPlayerTab = () => {
    window.open('/player', '_blank', 'noopener,noreferrer');
  };

  const handleOpenYouTube = () => {
    window.open('https://www.youtube.com', '_blank');
  };

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
          <span className="font-mono text-xs text-[#84849c]">youtube_link_guide.modal</span>
          <button
            onClick={onClose}
            className="p-1.5 text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div>
            <h3 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-[#25385b] mb-1">
              Liên kết phát nhạc với YouTube
            </h3>
            <p className="text-xs text-[#84849c]">
              Bạn có thể dùng 2 cách cực nhanh sau để phát nhạc trực tiếp ra loa:
            </p>
          </div>

          {/* Solution 1: Dedicated Player Tab (Recommended & 0 Setup) */}
          <div className="p-4 rounded-xl bg-[#a2b0ff]/15 border border-[#25385b] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#25385b] text-[#fffcef] text-[10px] font-mono font-bold uppercase">
                  KHUYẾN NGHỊ SỐ 1
                </span>
                <span className="font-bold text-sm text-[#25385b]">
                  Mở Tab Player Riêng (`/player`)
                </span>
              </div>
              <span className="text-[11px] text-[#1a2b88] font-mono font-bold">1 Click • 0 Cài Đặt</span>
            </div>

            <p className="text-xs text-[#84849c] leading-relaxed">
              Bấm nút bên dưới để mở 1 tab trình phát riêng biệt. Tab mới sẽ nhận quyền phát nhạc; tab DJ hiện tại tự chuyển sang chế độ chờ (không bị phát đôi).
            </p>

            <button
              onClick={handleOpenPlayerTab}
              className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2 font-bold cursor-pointer"
            >
              <Radio className="w-4 h-4 text-[#fffcef]" />
              <span>Mở Tab Player Ngay (`/player`)</span>
            </button>
          </div>

          {/* Solution 2: Chrome/Edge Extension (Already built in project) */}
          <div className="p-4 rounded-xl bg-[#ffffff] border border-[#25385b]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ff8a7a]/20 text-[#25385b] text-[10px] font-mono font-bold uppercase border border-[#ff8a7a]/50">
                  NẾU MUỐN DÙNG TAB YOUTUBE.COM GỐC
                </span>
                <span className="font-bold text-xs text-[#25385b]">Load Extension Chrome/Edge (10 giây)</span>
              </div>
              <span className="text-[11px] text-[#1a2b88] font-mono font-bold">100% Hoạt Động</span>
            </div>

            <ol className="text-xs text-[#84849c] space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Mở tab mới, truy cập: <code className="bg-[#fffcef] px-1.5 py-0.5 rounded border border-[#25385b]/20 font-mono text-[#25385b]">chrome://extensions</code> (hoặc <code className="bg-[#fffcef] px-1.5 py-0.5 rounded border border-[#25385b]/20 font-mono text-[#25385b]">edge://extensions</code>).
              </li>
              <li>
                Bật công tắc <strong>Chế độ dành cho nhà phát triển (Developer mode)</strong> ở góc trên bên phải.
              </li>
              <li>
                Bấm nút <strong>Tải tiện ích đã giải nén (Load unpacked)</strong> và chọn thư mục:
              </li>
            </ol>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#fffcef] border border-[#25385b]/30">
              <FolderOpen className="w-4 h-4 text-[#ff8a7a] shrink-0" />
              <code className="text-xs font-mono text-[#25385b] flex-1 truncate select-all">
                {extensionPath}
              </code>
              <button
                onClick={handleCopyExtPath}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 shrink-0 font-medium cursor-pointer"
              >
                {copiedExtPath ? <Check className="w-3.5 h-3.5 text-[#fffcef]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedExtPath ? 'Đã copy' : 'Copy đường dẫn'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#84849c]">
              👉 Bấm biểu tượng extension, nhập <strong>Server URL</strong> (<code className="font-mono">{serverUrl}</code>) và <strong>mã PIN DJ</strong>, rồi mở tab <strong>youtube.com</strong>. Góc dưới sẽ hiện <span className="text-[#1a2b88] font-bold">● Office Jukebox: Linked & Ready</span>. Khi hết hàng đợi, YouTube sẽ tự phát bài gợi ý.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#25385b]/15 flex items-center justify-between">
            <button
              onClick={handleOpenYouTube}
              className="inline-flex items-center gap-1 text-xs text-[#1a2b88] hover:text-[#25385b] hover:underline font-semibold cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở tab YouTube (youtube.com)</span>
            </button>

            <button
              onClick={onClose}
              className="btn-outline py-1.5 px-4 text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
