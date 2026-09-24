import React from 'react';
import { Radio, Volume2, AlertTriangle } from 'lucide-react';
import type { MasterKind } from '../../types/index.js';

interface MasterStatusBannerProps {
  isActive: boolean;
  activeKind: MasterKind | null;
  registerError: string | null;
  needsUserGesture: boolean;
  onClaim: () => void;
  onUnlock: () => void;
}

/** Tells the DJ whether this tab is the audio output, and lets them take it over. */
export const MasterStatusBanner: React.FC<MasterStatusBannerProps> = ({
  isActive,
  activeKind,
  registerError,
  needsUserGesture,
  onClaim,
  onUnlock,
}) => {
  if (registerError) {
    return (
      <div className="p-3 rounded-xl bg-[#fff1f2] border border-[#ff5a5a] text-xs text-[#ff5a5a] flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="font-semibold">Máy phát chưa được xác thực: {registerError}</span>
      </div>
    );
  }

  if (isActive && needsUserGesture) {
    return (
      <button
        onClick={onUnlock}
        className="w-full p-3 rounded-xl bg-[#25385b] hover:bg-[#1a2b88] text-[#fffcef] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-recess"
      >
        <Volume2 className="w-4 h-4" />
        <span>Trình duyệt đang chặn tự phát — bấm để bật âm thanh</span>
      </button>
    );
  }

  if (isActive) return null;

  const where =
    activeKind === 'youtube-tab'
      ? 'một tab youtube.com (extension)'
      : activeKind === 'embedded'
        ? 'một tab DJ khác'
        : null;

  return (
    <div className="p-3 rounded-xl bg-[#fffcef] border border-[#25385b]/40 text-xs text-[#25385b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-[#3252f4] shrink-0" />
        <span>
          {where
            ? `Tab này đang chờ — nhạc đang phát ở ${where}.`
            : 'Chưa có máy nào đang phát nhạc ra loa.'}
        </span>
      </div>
      <button
        onClick={onClaim}
        className="btn-primary px-3.5 py-1.5 text-xs font-bold rounded-full cursor-pointer shrink-0"
      >
        Phát nhạc tại tab này
      </button>
    </div>
  );
};
