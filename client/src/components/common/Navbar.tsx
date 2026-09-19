import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Shield,
  Radio,
  SlidersHorizontal,
  Home,
  History,
  PictureInPicture2,
  Layers,
  Check,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast.js';
import type { NetworkInfo } from '../../types/index.js';

interface NavbarProps {
  serverName: string;
  isConnected: boolean;
  onOpenBridgeModal: () => void;
  onOpenHistory: () => void;
  isAdminView?: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
  networkInfo: NetworkInfo;
  isDocPipSupported?: boolean;
  isDocPipActive?: boolean;
  isInPageMiniActive?: boolean;
  onToggleDocPip?: () => void;
  onToggleInPageMini?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  serverName,
  isConnected,
  onOpenBridgeModal,
  onOpenHistory,
  isAdminView = false,
  currentPath,
  onNavigate,
  isDocPipSupported = false,
  isDocPipActive = false,
  isInPageMiniActive = false,
  onToggleDocPip,
  onToggleInPageMini,
}) => {
  const { soundEnabled, setSoundEnabled } = useToast();
  const [isPipMenuOpen, setIsPipMenuOpen] = useState(false);
  const pipMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pipMenuRef.current && !pipMenuRef.current.contains(e.target as Node)) {
        setIsPipMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#fffcef]/95 backdrop-blur-md border-b border-[#25385b]/20 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 text-[#25385b]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Brand & Live status */}
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
            <span className="font-script text-xl sm:text-2xl lg:text-3xl text-[#25385b] leading-none group-hover:opacity-85 transition-opacity">
              {serverName || 'AI Core music'}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold tracking-wider ${
                  isConnected
                    ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40'
                    : 'bg-[#ff5a5a]/15 text-[#ff5a5a] border border-[#ff5a5a]/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-[#10b981] animate-pulse' : 'bg-[#ff5a5a]'
                  }`}
                />
                {isConnected ? 'ONLINE' : 'SYNCING'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Tắt âm thanh thông báo' : 'Bật âm thanh thông báo'}
            className="p-1.5 sm:p-2 rounded-full text-[#25385b] hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#3252f4]" /> : <VolumeX className="w-4 h-4 text-[#84849c]" />}
          </button>

          {/* Order History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] text-xs font-semibold border border-[#25385b] transition-all cursor-pointer shadow-xs"
            title="Xem lịch sử bài hát đã order"
          >
            <History className="w-3.5 h-3.5 text-[#3252f4]" />
            <span className="hidden sm:inline">Lịch sử</span>
          </button>

          {/* Picture-in-Picture / Ghim Button with Menu */}
          <div className="relative" ref={pipMenuRef}>
            <button
              onClick={() => {
                if (isDocPipSupported) {
                  setIsPipMenuOpen((prev) => !prev);
                } else {
                  onToggleInPageMini?.();
                }
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                isDocPipActive || isInPageMiniActive
                  ? 'bg-[#25385b] text-[#ffffff] border-[#25385b]'
                  : 'bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] border-[#25385b]'
              }`}
              title="Thu gọn tab để ghim (Picture-in-Picture)"
            >
              <PictureInPicture2
                className={`w-3.5 h-3.5 ${
                  isDocPipActive || isInPageMiniActive ? 'text-[#a2b0ff]' : 'text-[#3252f4]'
                }`}
              />
              <span className="hidden sm:inline">Ghim PiP</span>
            </button>

            {/* PiP Options Dropdown Menu */}
            {isPipMenuOpen && isDocPipSupported && (
              <div className="absolute right-0 mt-2 w-64 p-2 bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card z-50 animate-in fade-in slide-in-from-top-2 text-[#25385b]">
                <div className="px-2.5 py-1.5 border-b border-[#25385b]/15 mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#84849c]">
                    Tùy chọn Ghim PiP
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                </div>

                {/* Option 1: In-Page Mini Player Widget (Clean, no black bar) */}
                <button
                  onClick={() => {
                    setIsPipMenuOpen(false);
                    onToggleInPageMini?.();
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                    isInPageMiniActive
                      ? 'bg-[#25385b] text-[#ffffff]'
                      : 'hover:bg-[#a2b0ff]/20 text-[#25385b]'
                  }`}
                >
                  <Layers
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isInPageMiniActive ? 'text-[#a2b0ff]' : 'text-[#3252f4]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold font-runde">Ghim góc trang web</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] font-mono font-bold">
                        CHUẨN ĐẸP
                      </span>
                    </div>
                    <p
                      className={`text-[10px] leading-snug mt-0.5 ${
                        isInPageMiniActive ? 'text-[#ffffff]/80' : 'text-[#84849c]'
                      }`}
                    >
                      Bo tròn góc hoàn hảo, không có thanh đen của Chrome
                    </p>
                  </div>
                </button>

                {/* Option 2: OS Always-on-Top PiP Window */}
                <button
                  onClick={() => {
                    setIsPipMenuOpen(false);
                    onToggleDocPip?.();
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer mt-1 ${
                    isDocPipActive
                      ? 'bg-[#25385b] text-[#ffffff]'
                      : 'hover:bg-[#a2b0ff]/20 text-[#25385b]'
                  }`}
                >
                  <PictureInPicture2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isDocPipActive ? 'text-[#a2b0ff]' : 'text-[#3252f4]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold font-runde">Cửa sổ nổi ngoài màn hình</span>
                      {isDocPipActive && <Check className="w-3.5 h-3.5 text-[#10b981]" />}
                    </div>
                    <p
                      className={`text-[10px] leading-snug mt-0.5 ${
                        isDocPipActive ? 'text-[#ffffff]/80' : 'text-[#84849c]'
                      }`}
                    >
                      Nổi trên mọi app khác (Chrome gắn thanh đen bảo mật)
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Admin vs Guest Actions */}
          {isAdminView ? (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#25385b]/30">
              {/* Link youtube.com Tab */}
              <button
                onClick={onOpenBridgeModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] text-xs font-semibold border border-[#25385b] transition-all cursor-pointer shadow-xs"
                title="Liên kết tab YouTube (youtube.com)"
              >
                <span className="text-[#ff5a5a] font-bold text-xs">🔗</span>
                <span className="hidden md:inline">Link YouTube</span>
              </button>

              {/* Open Dedicated Player Tab */}
              <button
                onClick={() => onNavigate('/player')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#25385b] transition-all cursor-pointer shadow-xs ${
                  currentPath === '/player'
                    ? 'bg-[#25385b] text-[#ffffff]'
                    : 'bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b]'
                }`}
                title="Mở Tab Player chuyên dụng"
              >
                <Radio className="w-3.5 h-3.5 text-[#3252f4]" />
                <span className="hidden sm:inline">Player Tab</span>
              </button>

              {currentPath === '/admin/settings' ? (
                <button
                  onClick={() => onNavigate('/admin')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] text-xs font-semibold border border-[#25385b] transition-all cursor-pointer shadow-xs"
                >
                  <Radio className="w-3.5 h-3.5 text-[#3252f4]" />
                  <span>DJ Player</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('/admin/settings')}
                  className="p-2 rounded-full text-[#25385b] hover:bg-[#a2b0ff]/20 transition-colors cursor-pointer"
                  title="Cài đặt Jukebox"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => onNavigate('/')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f0f3ff] text-[#25385b] text-xs font-semibold border border-[#25385b] transition-all cursor-pointer shadow-xs"
                title="Chuyển về màn hình Guest"
              >
                <Home className="w-3.5 h-3.5 text-[#25385b]" />
                <span className="hidden md:inline">Guest</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('/admin')}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full bg-[#25385b] hover:bg-[#3252f4] text-[#ffffff] border border-[#25385b] transition-all cursor-pointer shadow-xs shrink-0"
              title="Đăng nhập DJ Station quản trị phát nhạc"
            >
              <Shield className="w-3.5 h-3.5 text-[#ffffff]" />
              <span className="hidden sm:inline">DJ Station</span>
              <span className="sm:hidden text-[11px]">DJ</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
