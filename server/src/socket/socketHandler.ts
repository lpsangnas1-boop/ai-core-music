import { Server as SocketIOServer, Socket } from 'socket.io';
import { playbackService } from '../services/playbackService.js';
import { getQueue } from '../services/queueService.js';
import { getDefaultPlaylist } from '../services/playlistService.js';
import { getSettings } from '../services/settingsService.js';
import { fetchYouTubeMetadata } from '../services/metadataService.js';
import type { ServerToClientEvents, ClientToServerEvents, PlayerState } from '../types/shared.js';

let ioInstance: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function initSocketIO(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
  ioInstance = io;

  // Subscribe to playback service changes
  playbackService.subscribe((state: PlayerState, eventType?: string, payload?: any) => {
    // Broadcast latest state to all clients
    io.emit('player:state', state);
    // Real-time queue broadcast so queue list always reflects latest state
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

  io.on('connection', (socket: Socket) => {
    // Send initial snapshot to newly connected client
    socket.emit('player:state', playbackService.getState());
    socket.emit('player:vote_update', playbackService.getVoteSkipState());
    socket.emit('queue:update', getQueue());
    socket.emit('playlist:update', getDefaultPlaylist());
    socket.emit('settings:update', getSettings());

    // Reaction sent by user
    socket.on('reaction:send', (data: any) => {
      if (data && data.emoji) {
        const reaction = {
          id: 'rx_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
          emoji: data.emoji,
          userName: data.userName || 'Guest',
          timestamp: Date.now(),
          xOffset: Math.floor(Math.random() * 80) + 10,
        };
        io.emit('reaction:new', reaction);
      }
    });

    // Danmaku bullet comment sent by user
    socket.on('danmaku:send', (data: any) => {
      if (data && typeof data.text === 'string' && data.text.trim()) {
        const text = data.text.trim().slice(0, 120);
        const danmakuItem = {
          id: 'dm_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
          text,
          userName: (data.userName || 'Ẩn danh').trim().slice(0, 30),
          color: data.color || undefined,
          timestamp: Date.now(),
          yPercent: Math.floor(Math.random() * 65) + 12, // 12% to 77%
          duration: Math.floor(Math.random() * 3) + 5, // 5 to 7 seconds
        };
        io.emit('danmaku:new', danmakuItem);
      }
    });

    // Master Player reports state from DJ browser or extension
    socket.on('player:report_state', (data) => {
      playbackService.reportProgress(data);
      // Relay lightweight state update to other clients without flooding
      socket.broadcast.emit('player:state', playbackService.getState());
    });

    // YouTube tab extension syncs currently playing video back to Jukebox
    socket.on('player:sync_from_youtube', async (data: any) => {
      if (data && data.youtubeId) {
        if (!data.title || data.title === 'YouTube Video' || data.title === 'YouTube') {
          try {
            const meta = await fetchYouTubeMetadata(data.youtubeId);
            if (meta) {
              data.title = meta.title;
              data.channel = meta.channel;
              data.thumbnail = meta.thumbnail;
              if (meta.duration && !data.duration) data.duration = meta.duration;
            }
          } catch (e) {}
        }
        playbackService.syncFromYouTubeTab(data);
        io.emit('player:state', playbackService.getState());
      }
    });

    // Master Player reports song ended
    socket.on('player:song_ended', () => {
      playbackService.onSongEnded();
      broadcastQueueUpdate();
    });

    // Master Player reports YouTube playback error
    socket.on('player:song_error', (data) => {
      playbackService.onSongError(data.youtubeId, data.errorCode);
      broadcastQueueUpdate();
    });

    socket.on('disconnect', () => {
      // client disconnected
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
