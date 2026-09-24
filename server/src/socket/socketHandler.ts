import { Server as SocketIOServer, Socket } from 'socket.io';
import { playbackService } from '../services/playbackService.js';
import { getQueue } from '../services/queueService.js';
import { getDefaultPlaylist } from '../services/playlistService.js';
import { getSettings } from '../services/settingsService.js';
import { fetchYouTubeMetadata, extractYouTubeId } from '../services/metadataService.js';
import { checkAdminPin, createRateLimiter, getClientIp } from '../security.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  PlayerState,
  PlaybackStatus,
  MasterKind,
  MasterStatus,
} from '../types/shared.js';

type JukeboxServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type JukeboxSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

let ioInstance: JukeboxServer | null = null;

/** The single client allowed to play audio and report playback. */
let activeMaster: { socketId: string; kind: MasterKind } | null = null;

const PLAYBACK_STATUSES: PlaybackStatus[] = ['idle', 'playing', 'paused', 'buffering', 'ended'];
const ALLOWED_REACTIONS = new Set(['🔥', '❤️', '👏', '😂', '💤', '☕']);
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

// Per-socket and per-IP limits for chat-like events (office users may share one public IP).
const reactionPerSocket = createRateLimiter(3_000, 6);
const reactionPerIp = createRateLimiter(10_000, 80);
const danmakuPerSocket = createRateLimiter(5_000, 2);
const danmakuPerIp = createRateLimiter(10_000, 20);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finiteNumber = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;
const shortString = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

/** Wrap a socket listener so a bad payload can never crash the process. */
function safe<T extends unknown[]>(name: string, fn: (...args: T) => unknown | Promise<unknown>) {
  return (...args: T) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        result.catch((err) => console.error(`[Socket] Handler "${name}" failed:`, err));
      }
    } catch (err) {
      console.error(`[Socket] Handler "${name}" failed:`, err);
    }
  };
}

function masterStatus(): MasterStatus {
  return { activeSocketId: activeMaster?.socketId ?? null, kind: activeMaster?.kind ?? null };
}

function setActiveMaster(io: JukeboxServer, master: { socketId: string; kind: MasterKind } | null) {
  activeMaster = master;
  playbackService.setMasterKind(master?.kind ?? null);
  io.emit('master:status', masterStatus());
}

export function initSocketIO(io: JukeboxServer) {
  ioInstance = io;

  // Subscribe to playback service changes
  playbackService.subscribe((state: PlayerState, eventType?: string, payload?: any) => {
    io.emit('player:state', state);
    io.emit('queue:update', getQueue());

    if (eventType === 'player:vote_update') {
      io.emit('player:vote_update', payload);
    } else if (eventType === 'notification:song_error') {
      io.emit('notification:song_error', payload);
    } else if (eventType && eventType.startsWith('command:')) {
      const action = eventType.replace('command:', '');
      io.emit('player:command', { action, ...payload });
    }
  });

  io.on('connection', (socket: JukeboxSocket) => {
    const clientIp = getClientIp(socket.handshake.address, socket.handshake.headers);
    const isActiveMaster = () => activeMaster?.socketId === socket.id;

    // Initial snapshot for the newly connected client
    socket.emit('player:state', playbackService.getState());
    socket.emit('player:vote_update', playbackService.getVoteSkipState());
    socket.emit('master:status', masterStatus());
    socket.emit('queue:update', getQueue());
    socket.emit('playlist:update', getDefaultPlaylist());
    socket.emit('settings:update', getSettings());

    // A DJ player (embedded page or YouTube tab) asks to become the audio output.
    socket.on('master:register', safe('master:register', (data: unknown, ack?: unknown) => {
      const reply = typeof ack === 'function' ? (ack as (r: object) => void) : () => {};
      if (!isRecord(data)) return reply({ ok: false, error: 'Invalid payload' });

      const kind: MasterKind = data.kind === 'youtube-tab' ? 'youtube-tab' : 'embedded';
      const auth = checkAdminPin(data.pin, clientIp);
      if (!auth.ok) return reply({ ok: false, error: auth.error });

      if (!activeMaster || isActiveMaster() || data.takeover === true) {
        setActiveMaster(io, { socketId: socket.id, kind });
        console.log(`[Socket] Master player active: ${kind} (${socket.id})`);
        return reply({ ok: true, active: true, status: masterStatus() });
      }
      reply({ ok: true, active: false, status: masterStatus() });
    }));

    socket.on('master:release', safe('master:release', () => {
      if (isActiveMaster()) setActiveMaster(io, null);
    }));

    // Reactions from guests (only whitelisted emoji, rate limited)
    socket.on('reaction:send', safe('reaction:send', (data: unknown) => {
      if (!isRecord(data) || typeof data.emoji !== 'string' || !ALLOWED_REACTIONS.has(data.emoji)) return;
      if (!reactionPerSocket.hit(socket.id).allowed || !reactionPerIp.hit(clientIp).allowed) return;

      io.emit('reaction:new', {
        id: 'rx_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        emoji: data.emoji,
        userName: shortString(data.userName, 40) || 'Guest',
        timestamp: Date.now(),
        xOffset: Math.floor(Math.random() * 80) + 10,
      });
    }));

    // Danmaku bullet comments (strings only, rate limited)
    socket.on('danmaku:send', safe('danmaku:send', (data: unknown) => {
      if (!isRecord(data)) return;
      const text = shortString(data.text, 120);
      if (!text) return;
      if (!danmakuPerSocket.hit(socket.id).allowed || !danmakuPerIp.hit(clientIp).allowed) return;

      io.emit('danmaku:new', {
        id: 'dm_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        text,
        userName: shortString(data.userName, 30) || 'Ẩn danh',
        color: typeof data.color === 'string' && COLOR_PATTERN.test(data.color) ? data.color : undefined,
        timestamp: Date.now(),
        yPercent: Math.floor(Math.random() * 65) + 12, // 12% to 77%
        duration: Math.floor(Math.random() * 3) + 5, // 5 to 7 seconds
      });
    }));

    // ---- Events below are accepted only from the active, PIN-authenticated master ----

    socket.on('player:report_state', safe('player:report_state', (data: unknown) => {
      if (!isActiveMaster() || !isRecord(data)) return;
      playbackService.reportProgress({
        status: PLAYBACK_STATUSES.includes(data.status as PlaybackStatus) ? (data.status as PlaybackStatus) : undefined,
        currentTime: finiteNumber(data.currentTime),
        duration: finiteNumber(data.duration),
        volume: typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 100 ? data.volume : undefined,
        isMuted: typeof data.isMuted === 'boolean' ? data.isMuted : undefined,
      });
      socket.broadcast.emit('player:state', playbackService.getState());
    }));

    socket.on('player:sync_from_youtube', safe('player:sync_from_youtube', async (data: unknown) => {
      if (!isActiveMaster() || !isRecord(data) || typeof data.youtubeId !== 'string') return;
      const youtubeId = extractYouTubeId(data.youtubeId);
      if (!youtubeId) return;

      const payload = {
        youtubeId,
        title: shortString(data.title, 200),
        channel: shortString(data.channel, 100),
        currentTime: finiteNumber(data.currentTime),
        duration: finiteNumber(data.duration),
        status: PLAYBACK_STATUSES.includes(data.status as PlaybackStatus) ? (data.status as PlaybackStatus) : undefined,
      };

      if (!payload.title || payload.title === 'YouTube Video' || payload.title === 'YouTube') {
        try {
          const meta = await fetchYouTubeMetadata(youtubeId);
          payload.title = meta.title;
          payload.channel = meta.channel;
        } catch {
          // keep whatever the tab reported
        }
      }
      if (!isActiveMaster()) return;
      playbackService.syncFromYouTubeTab(payload);
      io.emit('player:state', playbackService.getState());
    }));

    socket.on('player:song_ended', safe('player:song_ended', () => {
      if (!isActiveMaster()) return;
      playbackService.onSongEnded();
      broadcastQueueUpdate();
    }));

    socket.on('player:song_error', safe('player:song_error', (data: unknown) => {
      if (!isActiveMaster() || !isRecord(data)) return;
      const youtubeId = typeof data.youtubeId === 'string' ? data.youtubeId.slice(0, 20) : '';
      // Ignore stale errors for a video that is no longer the current song
      if (youtubeId && playbackService.getState().currentSong?.youtubeId !== youtubeId) return;
      playbackService.onSongError(youtubeId, typeof data.errorCode === 'number' ? data.errorCode : undefined);
      broadcastQueueUpdate();
    }));

    socket.on('disconnect', () => {
      if (isActiveMaster()) {
        console.log(`[Socket] Master player disconnected (${socket.id})`);
        setActiveMaster(io, null);
      }
    });
  });
}

export function broadcastQueueUpdate() {
  if (ioInstance) {
    ioInstance.emit('queue:update', getQueue());
  }
}

export function broadcastPlaylistUpdate() {
  if (ioInstance) {
    ioInstance.emit('playlist:update', getDefaultPlaylist());
  }
}

export function broadcastSettingsUpdate() {
  if (ioInstance) {
    ioInstance.emit('settings:update', getSettings());
  }
}

export function broadcastNewRequest(title: string, requesterName: string, position: number) {
  if (ioInstance) {
    ioInstance.emit('notification:new_request', { title, requesterName, position });
  }
}

export function broadcastPlayerState() {
  if (ioInstance) {
    ioInstance.emit('player:state', playbackService.getState());
  }
}
