// Shared API/socket types live in one place (the server) and are imported type-only here.
import type { VoteSkipState as ServerVoteSkipState } from '../../../server/src/types/shared.js';

export type {
  PlaybackStatus,
  QueueItemStatus,
  MasterKind,
  BaseSong,
  QueueItem,
  PlaylistItem,
  CurrentSongState,
  PlayerState,
  JukeboxSettings,
  NetworkInfo,
  VideoMetadata,
  RequestHistoryItem,
  SearchResultItem,
  ReactionItem,
  DanmakuItem,
  MasterStatus,
  MasterRegisterResult,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../../../server/src/types/shared.js';

export interface VoteSkipState extends ServerVoteSkipState {
  userVoted?: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'song';
  title: string;
  message?: string;
  duration?: number;
}
