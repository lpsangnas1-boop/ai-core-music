import React, { useState, useEffect, useRef } from 'react';
import { NowPlayingCard } from '../components/guest/NowPlayingCard.js';
import { RequestSongForm } from '../components/guest/RequestSongForm.js';
import { QueueList } from '../components/guest/QueueList.js';
import type {
  PlayerState,
  QueueItem,
  JukeboxSettings,
  NetworkInfo,
  ReactionItem,
} from '../types/index.js';

interface GuestPageProps {
  playerState: PlayerState;
  queue: QueueItem[];
  settings: JukeboxSettings;
  networkInfo: NetworkInfo;
  deviceId: string;
  requesterName: string;
  userAvatar?: string;
  reactions?: ReactionItem[];
  onSaveRequesterName: (name: string) => void;
  onSaveUserAvatar?: (avatar: string) => void;
  onRequestSong: (url: string, name: string, shoutout?: string) => Promise<{ position: number; message: string }>;
  onSkipSong?: () => void;
  onSendReaction?: (emoji: string) => void;
  onTogglePip?: () => void;
}

export const GuestPage: React.FC<GuestPageProps> = ({
  playerState,
  queue,
  settings,
  deviceId,
  requesterName,
  userAvatar,
  reactions,
  onSaveRequesterName,
  onSaveUserAvatar,
  onRequestSong,
  onSkipSong,
  onSendReaction,
  onTogglePip,
}) => {
  const leftColRef = useRef<HTMLDivElement>(null);
  const [leftColHeight, setLeftColHeight] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const measure = () => {
      if (leftColRef.current) {
        setLeftColHeight(leftColRef.current.offsetHeight);
      }
    };

    measure();

    if (!leftColRef.current || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(leftColRef.current);
    return () => observer.disconnect();
  }, [playerState.currentSong, playerState.status]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 2-Column Responsive Balanced Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column (7 cols): Now Playing + Order Song Form */}
        <div ref={leftColRef} className="lg:col-span-7 space-y-4 sm:space-y-6">
          <NowPlayingCard
            playerState={playerState}
            reactions={reactions}
            onSkipSong={onSkipSong}
            onSendReaction={onSendReaction}
            onTogglePip={onTogglePip}
          />

          <RequestSongForm
            onRequestSong={onRequestSong}
            requesterName={requesterName}
            onSaveRequesterName={onSaveRequesterName}
            userAvatar={userAvatar}
            onSaveUserAvatar={onSaveUserAvatar}
            deviceId={deviceId}
            settings={settings}
          />
        </div>

        {/* Right Column (5 cols): Up Next Queue */}
        <div
          className="lg:col-span-5 flex flex-col"
          style={{
            height: isDesktop && leftColHeight ? `${leftColHeight}px` : undefined,
          }}
        >
          <QueueList
            queue={queue}
            currentSongId={playerState.currentSong?.id}
            deviceId={deviceId}
            showRequesterNames={settings.showRequesterNames}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};
