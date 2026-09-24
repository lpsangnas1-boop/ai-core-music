export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'buffering' | 'ended';

export type QueueItemStatus = 'queued' | 'playing' | 'played' | 'removed';

/** Which kind of client is producing audio: an embedded IFrame player or a youtube.com tab. */
export type MasterKind = 'embedded' | 'youtube-tab';

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
  /** Non-reversible hash of the requester's device id (see deviceKey). */
  requesterKey: string;
  status: QueueItemStatus;
  position: number;
  createdAt: string;
  playedAt?: string | null;
  shoutout?: string | null;
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
  shoutout?: string | null;
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
  /** Play the default playlist when the queue is empty (embedded players only). */
  autoPlay: boolean;
  volumeNormalization: boolean;
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
  /** Only present in the admin-only history endpoint. */
  requesterDeviceId?: string;
  status: string;
  createdAt: string;
  playedAt: string;
  shoutout?: string | null;
}

export interface SearchResultItem {
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationText?: string;
}

export interface VoteSkipState {
  count: number;
  required: number;
  /** deviceKey() of each voter. */
  voters: string[];
}

export interface ReactionItem {
  id: string;
  emoji: string;
  userName?: string;
  timestamp: number;
  xOffset: number; // 10% to 90%
}

export interface DanmakuItem {
  id: string;
  text: string;
  userName: string;
  color?: string;
  timestamp: number;
  yPercent: number; // Vertical position 10% to 80%
  duration: number; // Flight duration in seconds (e.g. 5 to 7s)
}

export interface MasterStatus {
  /** Socket id of the client currently allowed to play and report playback. */
  activeSocketId: string | null;
  kind: MasterKind | null;
}

export interface MasterRegisterResult {
  ok: boolean;
  active?: boolean;
  error?: string;
  status?: MasterStatus;
}

// Socket Events
export interface ServerToClientEvents {
  'player:state': (state: PlayerState) => void;
  'player:command': (command: { action: string; [key: string]: any }) => void;
  'player:vote_update': (voteState: VoteSkipState) => void;
  'master:status': (status: MasterStatus) => void;
  'reaction:new': (reaction: ReactionItem) => void;
  'danmaku:new': (item: DanmakuItem) => void;
  'queue:update': (queue: QueueItem[]) => void;
  'playlist:update': (playlist: PlaylistItem[]) => void;
  'settings:update': (settings: JukeboxSettings) => void;
  'notification:new_request': (data: { title: string; requesterName: string; position: number }) => void;
  'notification:song_changed': (song: CurrentSongState) => void;
  'notification:song_error': (data: { message: string }) => void;
  'error': (data: { message: string }) => void;
}

export interface SyncFromYouTubePayload {
  youtubeId: string;
  title?: string;
  channel?: string;
  thumbnail?: string;
  currentTime?: number;
  duration?: number;
  status?: PlaybackStatus;
}

export interface ClientToServerEvents {
  'master:register': (
    data: { pin: string; kind: MasterKind; takeover?: boolean },
    ack?: (result: MasterRegisterResult) => void
  ) => void;
  'master:release': () => void;
  'player:report_state': (data: {
    status: PlaybackStatus;
    currentTime: number;
    duration: number;
    volume?: number;
    isMuted?: boolean;
  }) => void;
  'player:song_ended': () => void;
  'player:song_error': (data: { youtubeId: string; errorCode?: number }) => void;
  'player:sync_from_youtube': (data: SyncFromYouTubePayload) => void;
  'reaction:send': (data: { emoji: string; userName?: string }) => void;
  'danmaku:send': (data: { text: string; userName?: string; color?: string }) => void;
}
