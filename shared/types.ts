export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'buffering' | 'ended';

export type QueueItemStatus = 'queued' | 'playing' | 'played' | 'removed';

export interface BaseSong {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number; // in seconds
}

export interface QueueItem extends BaseSong {
  requesterName: string;
  requesterDeviceId: string;
  status: QueueItemStatus;
  position: number;
  createdAt: string;
  playedAt?: string | null;
}

export interface PlaylistItem extends BaseSong {
  position: number;
  isEnabled: boolean;
  createdAt: string;
}

export interface CurrentSongState {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number;
  requesterName?: string;
  isDefault: boolean;
  startedAt?: number;
}

export interface PlayerState {
  currentSong: CurrentSongState | null;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isJukeboxStarted: boolean;
}

export interface JukeboxSettings {
  serverName: string;
  requestsEnabled: boolean;
  requestCooldownSeconds: number;
  maxRequestsPerDevice: number;
  loopDefaultPlaylist: boolean;
  showRequesterNames: boolean;
  autoPlay: boolean;
}

export interface NetworkInfo {
  ip: string;
  port: number;
  url: string;
  hostname: string;
}

export interface VideoMetadata {
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number;
  url: string;
}

export interface RequestHistoryItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number;
  requesterName: string;
  requesterDeviceId: string;
  status: string;
  createdAt: string;
  playedAt: string;
}

// Socket Events
export interface ServerToClientEvents {
  'player:state': (state: PlayerState) => void;
  'player:command': (command: { action: string; [key: string]: any }) => void;
  'queue:update': (queue: QueueItem[]) => void;
  'playlist:update': (playlist: PlaylistItem[]) => void;
  'settings:update': (settings: JukeboxSettings) => void;
  'notification:new_request': (data: { title: string; requesterName: string; position: number }) => void;
  'notification:song_changed': (song: CurrentSongState) => void;
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'player:report_state': (data: {
    status: PlaybackStatus;
    currentTime: number;
    duration: number;
    volume?: number;
    isMuted?: boolean;
  }) => void;
  'player:song_ended': () => void;
  'player:song_error': (data: { youtubeId: string; errorCode?: number }) => void;
}
