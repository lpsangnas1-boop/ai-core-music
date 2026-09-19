import { getQueue, markQueueItemPlayed } from './queueService.js';
import { getDefaultPlaylist } from './playlistService.js';
import { getSettings } from './settingsService.js';
import type { CurrentSongState, PlayerState, PlaybackStatus, VideoMetadata, VoteSkipState } from '../types/shared.js';

type StateChangeCallback = (state: PlayerState, eventType?: string, payload?: any) => void;

class PlaybackService {
  private currentSong: CurrentSongState | null = null;
  private status: PlaybackStatus = 'idle';
  private currentTime = 0;
  private duration = 0;
  private volume = 80;
  private isMuted = false;
  private isJukeboxStarted = false;
  private defaultPlaylistIndex = 0;
  private listeners: StateChangeCallback[] = [];
  private skipVotes = new Set<string>();
  private skipVotesRequired = 3;

  constructor() {
    // Initial state
  }

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
    this.skipVotes.clear();
    this.notify('player:vote_update', this.getVoteSkipState());
    const queue = getQueue();
    if (queue.length > 0) {
      this.resolveNextSong();
    } else {
      this.notify('command:skip');
    }
    return this.getState();
  }

  public getVoteSkipState(): VoteSkipState {
    return {
      count: this.skipVotes.size,
      required: this.skipVotesRequired,
      voters: Array.from(this.skipVotes),
    };
  }

  public voteSkip(deviceId: string): { skipped: boolean; voteState: VoteSkipState } {
    if (!deviceId) {
      return { skipped: false, voteState: this.getVoteSkipState() };
    }

    if (this.skipVotes.has(deviceId)) {
      this.skipVotes.delete(deviceId);
    } else {
      this.skipVotes.add(deviceId);
    }

    const voteState = this.getVoteSkipState();
    this.notify('player:vote_update', voteState);

    if (this.skipVotes.size >= this.skipVotesRequired) {
      console.log(`[PlaybackService] Reached ${this.skipVotesRequired} votes! Automatically skipping song.`);
      this.skipVotes.clear();
      this.notify('player:vote_update', this.getVoteSkipState());
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

    this.defaultPlaylistIndex = (this.defaultPlaylistIndex - 1 + playlist.length) % playlist.length;
    const prevSong = playlist[this.defaultPlaylistIndex];

    this.currentSong = {
      id: prevSong.id,
      youtubeId: prevSong.youtubeId,
      title: prevSong.title,
      channel: prevSong.channel,
      thumbnail: prevSong.thumbnail,
      duration: prevSong.duration,
      isDefault: true,
      startedAt: Date.now(),
      shoutout: null,
    };

    this.status = 'playing';
    this.currentTime = 0;
    this.duration = prevSong.duration;
    this.notify('command:load_song', { song: this.currentSong });

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
    this.skipVotes.clear();
    this.notify('player:vote_update', this.getVoteSkipState());
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
    console.log('[PlaybackService] Current song ended, advancing to next song in queue...');
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

  public syncFromYouTubeTab(data: {
    youtubeId: string;
    title: string;
    channel?: string;
    thumbnail?: string;
    currentTime?: number;
    duration?: number;
  }): void {
    if (!data || !data.youtubeId) return;

    this.isJukeboxStarted = true;
    this.status = 'playing';

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

    // 2. Video changed on YouTube!
    const queue = getQueue();
    // If there are songs waiting in the user queue:
    if (queue.length > 0) {
      if (queue[0].youtubeId === data.youtubeId) {
        // YouTube loaded the queued song correctly
        const queueItem = queue[0];
        markQueueItemPlayed(queueItem.id);
        this.currentSong = {
          id: queueItem.id,
          youtubeId: queueItem.youtubeId,
          title: queueItem.title || data.title,
          channel: queueItem.channel || data.channel || 'YouTube Channel',
          thumbnail: queueItem.thumbnail || data.thumbnail || `https://i.ytimg.com/vi/${data.youtubeId}/hqdefault.jpg`,
          duration: data.duration || queueItem.duration || 0,
          isDefault: false,
          requesterName: queueItem.requesterName,
          startedAt: Date.now(),
          shoutout: queueItem.shoutout || null,
        };
      } else {
        // YouTube tried to autoplay its own random video while a user order is in queue!
        // Immediately override and FORCE YouTube to play the user's queued song!
        console.log(`[PlaybackService] Intercepted YouTube autoplay "${data.title}". Enforcing queued song "${queue[0].title}" requested by ${queue[0].requesterName}!`);
        this.resolveNextSong();
        return;
      }
    } else {
      // Queue is genuinely empty -> Let YouTube autoplay and sync its info
      this.currentSong = {
        id: data.youtubeId,
        youtubeId: data.youtubeId,
        title: data.title || 'YouTube Video',
        channel: data.channel || 'YouTube Channel',
        thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.youtubeId}/hqdefault.jpg`,
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

  public resolveNextSong(): void {
    this.skipVotes.clear();
    this.notify('player:vote_update', this.getVoteSkipState());
    // If there was a queued song currently playing, mark it as played
    if (this.currentSong && !this.currentSong.isDefault) {
      markQueueItemPlayed(this.currentSong.id);
    }

    const queue = getQueue();
    this.isJukeboxStarted = true;

    // 1. Check if there are songs in the queue (ALWAYS HIGHEST PRIORITY)
    if (queue.length > 0) {
      const nextQueueItem = queue[0];
      // Mark as played/popped so it transitions out of queued status
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

    // 2. Queue is empty -> DO NOT INTERVENE, let YouTube play naturally!
    console.log('[PlaybackService] Queue is empty. No intervention, letting YouTube play naturally.');
    if (this.currentSong && !this.currentSong.isDefault) {
      this.currentSong = {
        ...this.currentSong,
        requesterName: 'YouTube Autoplay',
      };
    }
    this.notify('command:queue_empty');
  }
}

export const playbackService = new PlaybackService();
