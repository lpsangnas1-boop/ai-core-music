import { getQueue, markQueueItemPlayed } from './queueService.js';
import { getDefaultPlaylist } from './playlistService.js';
import { getSettings } from './settingsService.js';
import { deviceKey } from '../security.js';
import type {
  CurrentSongState,
  MasterKind,
  PlayerState,
  PlaybackStatus,
  PlaylistItem,
  SyncFromYouTubePayload,
  VideoMetadata,
  VoteSkipState,
} from '../types/shared.js';

type StateChangeCallback = (state: PlayerState, eventType?: string, payload?: any) => void;

class PlaybackService {
  private currentSong: CurrentSongState | null = null;
  private status: PlaybackStatus = 'idle';
  private currentTime = 0;
  private duration = 0;
  private volume = 80;
  private isMuted = false;
  private isJukeboxStarted = false;
  /** Id of the last default-playlist song that was played (cursor for the fallback playlist). */
  private lastDefaultSongId: string | null = null;
  /** Kind of the active master player; decides what happens when the queue runs out. */
  private masterKind: MasterKind | null = null;
  private listeners: StateChangeCallback[] = [];
  private skipVotes = new Set<string>();
  private skipVotesRequired = 3;

  public subscribe(listener: StateChangeCallback): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(eventType?: string, payload?: any) {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state, eventType, payload);
      } catch (err) {
        console.error('[PlaybackService] Listener error:', err);
      }
    }
  }

  public getState(): PlayerState {
    return {
      currentSong: this.currentSong,
      status: this.status,
      currentTime: Math.floor(this.currentTime),
      duration: Math.floor(this.duration),
      volume: this.volume,
      isMuted: this.isMuted,
      isJukeboxStarted: this.isJukeboxStarted,
    };
  }

  public setMasterKind(kind: MasterKind | null): void {
    this.masterKind = kind;
  }

  public startJukebox(): PlayerState {
    this.isJukeboxStarted = true;
    if (!this.currentSong) {
      this.resolveNextSong();
    } else {
      this.status = 'playing';
      this.notify('command:play');
    }
    return this.getState();
  }

  public play(): PlayerState {
    if (!this.isJukeboxStarted) {
      return this.startJukebox();
    }
    if (!this.currentSong) {
      this.resolveNextSong();
    } else {
      this.status = 'playing';
      this.notify('command:play');
    }
    return this.getState();
  }

  public pause(): PlayerState {
    this.status = 'paused';
    this.notify('command:pause');
    return this.getState();
  }

  public next(): PlayerState {
    const queue = getQueue();
    if (queue.length === 0 && this.masterKind === 'youtube-tab') {
      // Let the YouTube tab pick its own next video (YouTube autoplay radio).
      this.clearVotes();
      this.notify('command:skip');
    } else {
      this.resolveNextSong();
    }
    return this.getState();
  }

  private clearVotes(): void {
    if (this.skipVotes.size === 0) return;
    this.skipVotes.clear();
    this.notify('player:vote_update', this.getVoteSkipState());
  }

  public getVoteSkipState(): VoteSkipState {
    return {
      count: this.skipVotes.size,
      required: this.skipVotesRequired,
      voters: Array.from(this.skipVotes),
    };
  }

  public voteSkip(deviceId: string): { skipped: boolean; voteState: VoteSkipState } {
    if (!deviceId || !this.currentSong) {
      return { skipped: false, voteState: this.getVoteSkipState() };
    }

    const key = deviceKey(deviceId);
    if (this.skipVotes.has(key)) {
      this.skipVotes.delete(key);
    } else {
      this.skipVotes.add(key);
    }

    const voteState = this.getVoteSkipState();
    this.notify('player:vote_update', voteState);

    if (this.skipVotes.size >= this.skipVotesRequired) {
      console.log(`[PlaybackService] Reached ${this.skipVotesRequired} votes! Automatically skipping song.`);
      this.next();
      return { skipped: true, voteState: this.getVoteSkipState() };
    }

    return { skipped: false, voteState };
  }

  public previous(): PlayerState {
    const playlist = getDefaultPlaylist().filter((s) => s.isEnabled);
    if (playlist.length === 0) {
      this.currentTime = 0;
      this.notify('command:seek', { time: 0 });
      return this.getState();
    }

    const lastIdx = this.lastDefaultSongId
      ? playlist.findIndex((s) => s.id === this.lastDefaultSongId)
      : -1;
    const prevIdx = lastIdx <= 0 ? playlist.length - 1 : lastIdx - 1;
    this.playDefaultSong(playlist[prevIdx]);
    return this.getState();
  }

  public seek(timeSeconds: number): PlayerState {
    this.currentTime = timeSeconds;
    this.notify('command:seek', { time: timeSeconds });
    return this.getState();
  }

  public setVolume(vol: number): PlayerState {
    this.volume = Math.max(0, Math.min(100, vol));
    if (this.volume > 0 && this.isMuted) {
      this.isMuted = false;
    }
    this.notify('command:volume', { volume: this.volume, isMuted: this.isMuted });
    return this.getState();
  }

  public setMuted(muted: boolean): PlayerState {
    this.isMuted = muted;
    this.notify('command:volume', { volume: this.volume, isMuted: this.isMuted });
    return this.getState();
  }

  public playSongImmediately(metadata: VideoMetadata, isDefault = false, requesterName?: string, shoutout?: string): PlayerState {
    this.clearVotes();
    this.isJukeboxStarted = true;
    this.currentSong = {
      id: metadata.youtubeId,
      youtubeId: metadata.youtubeId,
      title: metadata.title,
      channel: metadata.channel,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration || 0,
      requesterName: requesterName,
      isDefault,
      startedAt: Date.now(),
      shoutout: shoutout || null,
    };

    this.status = 'playing';
    this.currentTime = 0;
    this.duration = metadata.duration || 0;
    this.notify('command:load_song', { song: this.currentSong });

    return this.getState();
  }

  private lastSongEndedTime = 0;

  public onSongEnded(): void {
    const now = Date.now();
    if (now - this.lastSongEndedTime < 4000) {
      console.log('[PlaybackService] Ignored rapid duplicate song_ended call.');
      return;
    }
    this.lastSongEndedTime = now;
    console.log('[PlaybackService] Current song ended, advancing to next song...');
    this.resolveNextSong();
  }

  public onSongError(youtubeId: string, errorCode?: number): void {
    console.warn(`[PlaybackService] Player error on video ${youtubeId} (code: ${errorCode}). Auto skipping...`);
    const isEmbedBlocked = errorCode === 150 || errorCode === 101;
    const msg = isEmbedBlocked
      ? 'Bài hát bị YouTube chặn bản quyền nhúng ngoài, đã tự động chuyển bài tiếp theo!'
      : `Không thể phát video (mã lỗi ${errorCode || 'không xác định'}), đang chuyển bài tiếp...`;
    this.notify('notification:song_error', { message: msg });
    this.resolveNextSong();
  }

  public reportProgress(data: {
    status?: PlaybackStatus;
    currentTime?: number;
    duration?: number;
    volume?: number;
    isMuted?: boolean;
  }): void {
    if (data.status) this.status = data.status;
    if (typeof data.currentTime === 'number') this.currentTime = data.currentTime;
    if (typeof data.duration === 'number' && data.duration > 0) this.duration = data.duration;
    if (typeof data.volume === 'number') this.volume = data.volume;
    if (typeof data.isMuted === 'boolean') this.isMuted = data.isMuted;
  }

  public syncFromYouTubeTab(data: SyncFromYouTubePayload): void {
    if (!data || !data.youtubeId) return;

    this.isJukeboxStarted = true;
    this.status = data.status || 'playing';

    // 1. Same video as currently playing -> update progress and metadata
    if (this.currentSong && this.currentSong.youtubeId === data.youtubeId) {
      if (typeof data.currentTime === 'number') this.currentTime = data.currentTime;
      if (typeof data.duration === 'number' && data.duration > 0) this.duration = data.duration;

      let changed = false;
      if (data.title && data.title !== 'YouTube Video' && data.title !== 'YouTube' && this.currentSong.title !== data.title) {
        this.currentSong.title = data.title;
        changed = true;
      }
      if (data.channel && data.channel !== 'YouTube Channel' && data.channel !== 'YouTube' && this.currentSong.channel !== data.channel) {
        this.currentSong.channel = data.channel;
        changed = true;
      }
      if (changed) {
        this.notify();
      }
      return;
    }

    // 2. Video changed on YouTube -> votes belonged to the previous song
    this.clearVotes();

    const queue = getQueue();
    if (queue.length > 0) {
      if (queue[0].youtubeId === data.youtubeId) {
        // YouTube loaded the queued song correctly
        const queueItem = queue[0];
        markQueueItemPlayed(queueItem.id);
        this.currentSong = {
          id: queueItem.id,
          youtubeId: queueItem.youtubeId,
          title: queueItem.title || data.title || 'YouTube Video',
          channel: queueItem.channel || data.channel || 'YouTube Channel',
          thumbnail: queueItem.thumbnail || `https://i.ytimg.com/vi/${data.youtubeId}/hqdefault.jpg`,
          duration: data.duration || queueItem.duration || 0,
          isDefault: false,
          requesterName: queueItem.requesterName,
          startedAt: Date.now(),
          shoutout: queueItem.shoutout || null,
        };
      } else {
        // YouTube autoplayed its own video while a user order is waiting -> enforce the queue.
        console.log(`[PlaybackService] Intercepted YouTube autoplay "${data.title}". Enforcing queued song "${queue[0].title}".`);
        this.resolveNextSong();
        return;
      }
    } else {
      // Queue is genuinely empty -> let YouTube autoplay and sync its info
      this.currentSong = {
        id: data.youtubeId,
        youtubeId: data.youtubeId,
        title: data.title || 'YouTube Video',
        channel: data.channel || 'YouTube Channel',
        thumbnail: `https://i.ytimg.com/vi/${data.youtubeId}/hqdefault.jpg`,
        duration: data.duration || 0,
        isDefault: false,
        requesterName: 'YouTube Autoplay',
        startedAt: Date.now(),
        shoutout: null,
      };
    }

    if (typeof data.currentTime === 'number') this.currentTime = data.currentTime;
    if (typeof data.duration === 'number' && data.duration > 0) this.duration = data.duration;
    this.notify();
  }

  /** Next enabled default-playlist song after the last one played, honoring the loop setting. */
  private pickNextDefaultSong(): PlaylistItem | null {
    const playlist = getDefaultPlaylist().filter((s) => s.isEnabled);
    if (playlist.length === 0) return null;

    const lastIdx = this.lastDefaultSongId
      ? playlist.findIndex((s) => s.id === this.lastDefaultSongId)
      : -1;
    const nextIdx = lastIdx + 1;
    if (nextIdx < playlist.length) return playlist[nextIdx];
    return getSettings().loopDefaultPlaylist ? playlist[0] : null;
  }

  private playDefaultSong(song: PlaylistItem): void {
    this.clearVotes();
    this.lastDefaultSongId = song.id;
    this.isJukeboxStarted = true;
    this.currentSong = {
      id: song.id,
      youtubeId: song.youtubeId,
      title: song.title,
      channel: song.channel,
      thumbnail: song.thumbnail,
      duration: song.duration,
      isDefault: true,
      startedAt: Date.now(),
      shoutout: null,
    };
    this.status = 'playing';
    this.currentTime = 0;
    this.duration = song.duration;
    console.log(`[PlaybackService] Queue empty -> playing default playlist song "${song.title}"`);
    this.notify('command:load_song', { song: this.currentSong });
  }

  public resolveNextSong(): void {
    this.clearVotes();
    // If there was a queued song currently playing, mark it as played
    if (this.currentSong && !this.currentSong.isDefault) {
      markQueueItemPlayed(this.currentSong.id);
    }

    const queue = getQueue();
    this.isJukeboxStarted = true;

    // 1. Queued requests always have the highest priority
    if (queue.length > 0) {
      const nextQueueItem = queue[0];
      markQueueItemPlayed(nextQueueItem.id);

      this.currentSong = {
        id: nextQueueItem.id,
        youtubeId: nextQueueItem.youtubeId,
        title: nextQueueItem.title,
        channel: nextQueueItem.channel,
        thumbnail: nextQueueItem.thumbnail,
        duration: nextQueueItem.duration,
        requesterName: nextQueueItem.requesterName,
        isDefault: false,
        startedAt: Date.now(),
        shoutout: nextQueueItem.shoutout || null,
      };

      this.status = 'playing';
      this.currentTime = 0;
      this.duration = nextQueueItem.duration;

      console.log(`[PlaybackService] Playing next queued song: "${nextQueueItem.title}" requested by ${nextQueueItem.requesterName}`);
      this.notify('command:load_song', { song: this.currentSong });
      return;
    }

    // 2a. YouTube tab master: let YouTube keep playing its own recommendations.
    if (this.masterKind === 'youtube-tab') {
      console.log('[PlaybackService] Queue is empty. Letting the YouTube tab autoplay.');
      if (this.currentSong && !this.currentSong.isDefault) {
        this.currentSong = { ...this.currentSong, requesterName: 'YouTube Autoplay' };
      }
      this.notify('command:queue_empty');
      return;
    }

    // 2b. Embedded players cannot autoplay -> fall back to the default playlist.
    const defaultSong = getSettings().autoPlay ? this.pickNextDefaultSong() : null;
    if (defaultSong) {
      this.playDefaultSong(defaultSong);
      return;
    }

    console.log('[PlaybackService] Queue and default playlist exhausted. Stopping.');
    this.currentSong = null;
    this.status = 'idle';
    this.currentTime = 0;
    this.duration = 0;
    this.notify('command:stop');
  }
}

export const playbackService = new PlaybackService();
