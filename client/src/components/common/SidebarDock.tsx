import React from 'react';
import {
  FileText,
  Folder,
  SlidersHorizontal,
  Sparkles,
  Music,
  Headphones,
  CheckCircle2,
  Radio,
  Bookmark,
} from 'lucide-react';
import type { NetworkInfo, JukeboxSettings } from '../../types/index.js';

interface SidebarDockProps {
  networkInfo: NetworkInfo;
  settings: JukeboxSettings;
  queueCount: number;
  activeFile?: string;
  onSelectFile?: (file: string) => void;
  onOpenBridgeModal?: () => void;
  isAdmin?: boolean;
}

export const SidebarDock: React.FC<SidebarDockProps> = ({
  networkInfo,
  settings,
  queueCount,
  activeFile = 'now_playing.tsx',
  onSelectFile,
  onOpenBridgeModal,
  isAdmin = false,
}) => {
  const files = [
    { id: 'now_playing.tsx', label: 'now_playing.tsx', icon: Music, tag: 'live' },
    { id: 'request_song.tsx', label: 'request_song.tsx', icon: FileText, tag: 'input' },
    { id: 'queue_list.tsx', label: 'queue_list.tsx', icon: Folder, badge: queueCount },
    { id: 'default_playlist.json', label: 'playlist.json', icon: Sparkles },
    ...(isAdmin ? [{ id: 'settings.conf', label: 'settings.conf', icon: SlidersHorizontal }] : []),
  ];

  const serverUrl = networkInfo.url || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const scriptUrl = `${serverUrl}/api/bridge/script.user.js`;
  const bookmarkletCode = `javascript:(function(){if(window.__oj_loaded)return;window.__oj_loaded=true;var s=document.createElement('script');s.src='${scriptUrl}?t='+Date.now();document.head.appendChild(s);})();`;

  return (
    <aside className="w-full space-y-4">
      {/* File Manager Window */}
      <div className="posthog-window overflow-hidden">
        <div className="posthog-titlebar">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f54e00]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#eb9d2a]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#6aa84f]" />
          </div>
          <span className="font-mono text-xs text-[#4d4f46]">explorer.sidebar</span>
          <div className="w-6" />
        </div>

        <div className="p-3 bg-[#ffffff] space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9ea096] flex items-center justify-between">
            <span>WORKSPACE FILES</span>
            <span className="text-[#6aa84f] font-bold">● LAN</span>
          </div>

          <div className="space-y-0.5">
            {files.map((file) => {
              const Icon = file.icon;
              const isActive = activeFile === file.id;

              return (
                <button
                  key={file.id}
                  onClick={() => onSelectFile && onSelectFile(file.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs font-mono transition-all text-left group ${
                    isActive
                      ? 'bg-[#2f80fa]/10 text-[#2f80fa] font-semibold border border-[#2f80fa]/30'
                      : 'text-[#4d4f46] hover:bg-[#eeefe9] hover:text-[#23251d]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-[#2f80fa]' : 'text-[#65675e] group-hover:text-[#23251d]'
                      }`}
                    />
                    <span className="truncate">{file.label}</span>
                  </div>

                  {file.badge !== undefined && file.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#eb9d2a]/20 text-[#23251d] text-[10px] font-mono">
                      {file.badge}
                    </span>
                  )}
                  {file.tag && (
                    <span className="text-[10px] text-[#9ea096] uppercase">{file.tag}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pinned YouTube Tab Link Bookmarklet Card */}
      <div className="p-3.5 rounded-[4px] bg-[#ffffff] border border-[#bfc1b7] space-y-2 relative shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#23251d] font-runde">
          <span className="text-sm">🔗</span>
          <span>Liên kết Tab youtube.com</span>
        </div>
        <p className="text-[11px] text-[#65675e] leading-snug">
          Kéo nút bên dưới thả lên thanh Bookmark (Dấu trang) trình duyệt của bạn:
        </p>

        <a
          href={bookmarkletCode}
          onClick={(e) => {
            e.preventDefault();
            if (onOpenBridgeModal) onOpenBridgeModal();
          }}
          className="btn-outline-gold w-full py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 font-bold cursor-grab active:cursor-grabbing text-center block"
          title="Kéo nút này vào thanh Dấu trang (Bookmarks Bar) trên trình duyệt"
        >
          <Bookmark className="w-3.5 h-3.5 text-[#b17816]" />
          <span>🎧 Kéo vào Bookmark: Office Jukebox</span>
        </a>

        {onOpenBridgeModal && (
          <button
            onClick={onOpenBridgeModal}
            className="w-full text-center text-[11px] text-[#2f80fa] hover:underline font-medium block pt-0.5"
          >
            Xem hướng dẫn chi tiết & code →
          </button>
        )}
      </div>

      {/* Pinned Corkboard Note (Office Jukebox Rules) */}
      <div className="p-3.5 rounded-[4px] bg-[#fdfdf8] border border-[#bfc1b7] relative shadow-sm">
        {/* Decorative Tape Pin on top */}
        <div className="w-12 h-2.5 bg-[#e1d7c2]/80 border border-[#bfc1b7] rounded-[1px] absolute -top-1.5 left-1/2 -translate-x-1/2" />

        <div className="flex items-center gap-1.5 text-xs font-bold text-[#23251d] mb-1.5 font-runde">
          <Headphones className="w-3.5 h-3.5 text-[#eb9d2a]" />
          <span>Office Music Etiquette</span>
        </div>

        <ul className="text-[11px] text-[#65675e] space-y-1 font-sans leading-relaxed">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-[#6aa84f] shrink-0 mt-0.5" />
            <span>Max {settings.maxRequestsPerDevice} active songs per person</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-[#6aa84f] shrink-0 mt-0.5" />
            <span>{settings.requestCooldownSeconds}s cooldown between requests</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-[#6aa84f] shrink-0 mt-0.5" />
            <span>Songs auto-play through the office speakers</span>
          </li>
        </ul>
      </div>

      {/* Local Server Connection Info Widget */}
      <div className="p-3 rounded-[4px] bg-[#eeefe9] border border-[#bfc1b7] text-[11px] text-[#4d4f46] space-y-1 font-mono">
        <div className="flex items-center justify-between text-[10px] text-[#65675e] uppercase">
          <span>HOST NODE</span>
          <span className="text-[#6aa84f] font-bold">ONLINE</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#23251d] font-semibold truncate">
          <Radio className="w-3 h-3 text-[#2f80fa] shrink-0" />
          <span className="truncate">{networkInfo.hostname}</span>
        </div>
        <div className="text-[10px] text-[#65675e] truncate">
          IP: <code className="text-[#23251d] font-bold">{networkInfo.ip}:{networkInfo.port}</code>
        </div>
      </div>
    </aside>
  );
};
