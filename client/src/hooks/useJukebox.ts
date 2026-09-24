import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket.js';
import { api } from '../services/api.js';
import { useToast } from './useToast.js';
import { useDeviceId } from './useDeviceId.js';
import { deviceKey } from '../utils/deviceKey.js';
import type {
  PlayerState,
  QueueItem,
  PlaylistItem,
  JukeboxSettings,
  NetworkInfo,
  VoteSkipState,
  ReactionItem,
  DanmakuItem,
} from '../types/index.js';

export function useJukebox(passedAdminPin?: string) {
  const { addToast } = useToast();
  const { deviceId } = useDeviceId();
  // Only the PIN owned by App: once App clears a stale PIN it must not be sent again.
  const adminPin = passedAdminPin || '';

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    status: 'idle',
    currentTime: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    isJukeboxStarted: false,
  });

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [settings, setSettings] = useState<JukeboxSettings>({
    serverName: 'Office Jukebox',
    requestsEnabled: true,
    requestCooldownSeconds: 120,
    maxRequestsPerDevice: 2,
    loopDefaultPlaylist: true,
    showRequesterNames: true,
    autoPlay: true,
    volumeNormalization: true,
  });

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    ip: '127.0.0.1',
    port: 3000,
    url: 'http://localhost:3000',
    hostname: 'localhost',
  });

  const [voteState, setVoteState] = useState<VoteSkipState>({
    count: 0,
    required: 3,
    voters: [],
    userVoted: false,
  });
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastToastSongIdRef = useRef<string | null>(null);

  // Fetch initial state via REST
  const refreshAll = useCallback(async () => {
    try {
      const [net, player, q, pl, sett, vote] = await Promise.allSettled([
        api.getNetworkInfo(),
        api.getPlayerState(),
        api.getQueue(),
        api.getPlaylist(),
        api.getSettings(),
        api.getVoteSkip(deviceId),
      ]);

      if (net.status === 'fulfilled') setNetworkInfo(net.value);
      if (player.status === 'fulfilled') setPlayerState(player.value);
      if (q.status === 'fulfilled') setQueue(q.value);
      if (pl.status === 'fulfilled') setPlaylist(pl.value);
      if (sett.status === 'fulfilled') setSettings(sett.value);
      if (vote.status === 'fulfilled') setVoteState(vote.value);
    } catch (e) {
      console.error('Initial state fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    refreshAll();

    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onPlayerState = (state: PlayerState) => {
      setPlayerState(state);

      // Only record the current song id without popup toast spam
      if (state.currentSong && state.currentSong.id !== lastToastSongIdRef.current) {
        lastToastSongIdRef.current = state.currentSong.id;
      }
    };

    const onQueueUpdate = (updatedQueue: QueueItem[]) => {
      setQueue(updatedQueue);
    };

    const onPlaylistUpdate = (updatedPlaylist: PlaylistItem[]) => {
      setPlaylist(updatedPlaylist);
    };

    const onSettingsUpdate = (updatedSettings: JukeboxSettings) => {
      setSettings(updatedSettings);
    };

    const onVoteUpdate = (updatedVote: VoteSkipState) => {
      setVoteState({
        ...updatedVote,
        userVoted: deviceId ? updatedVote.voters.includes(deviceKey(deviceId)) : false,
      });
    };

    const onReactionNew = (rx: ReactionItem) => {
      // Never render unexpected shapes (a non-string child would crash React)
      if (!rx || typeof rx.emoji !== 'string' || (rx.userName !== undefined && typeof rx.userName !== 'string')) return;
      setReactions((prev) => [...prev.slice(-25), rx]);
    };

    const onDanmakuNew = (dm: DanmakuItem) => {
      if (!dm || typeof dm.text !== 'string' || typeof dm.userName !== 'string') return;
      setDanmakuList((prev) => [...prev.slice(-30), dm]);
    };

    const onNewRequest = (data: { title: string; requesterName: string; position: number }) => {
      addToast({
        type: 'song',
        title: `🎵 ${data.requesterName} vừa order bài (#${data.position})`,
        message: data.title,
      });
    };

    const onSongError = (data: { message: string }) => {
      addToast({
        type: 'warning',
        title: 'Bản quyền YouTube',
        message: data.message,
        duration: 5000,
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('player:state', onPlayerState);
    socket.on('player:vote_update', onVoteUpdate);
    socket.on('reaction:new', onReactionNew);
    socket.on('danmaku:new', onDanmakuNew);
    socket.on('queue:update', onQueueUpdate);
    socket.on('playlist:update', onPlaylistUpdate);
    socket.on('settings:update', onSettingsUpdate);
    socket.on('notification:new_request', onNewRequest);
    socket.on('notification:song_error', onSongError);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('player:state', onPlayerState);
      socket.off('player:vote_update', onVoteUpdate);
      socket.off('reaction:new', onReactionNew);
      socket.off('danmaku:new', onDanmakuNew);
      socket.off('queue:update', onQueueUpdate);
      socket.off('playlist:update', onPlaylistUpdate);
      socket.off('settings:update', onSettingsUpdate);
      socket.off('notification:new_request', onNewRequest);
      socket.off('notification:song_error', onSongError);
    };
  }, [addToast, refreshAll, deviceId]);

  // Actions
  const handleRequestSong = async (url: string, name: string, shoutout?: string) => {
    const result = await api.requestSong(url, name, deviceId, adminPin, shoutout);
    return result;
  };

  const handleStartJukebox = async () => {
    try {
      const state = await api.startJukebox(adminPin);
      setPlayerState(state);
      addToast({ type: 'success', title: 'Jukebox Started!', message: 'Music is now live.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to start Jukebox', message: err.message });
    }
  };

  const handlePlay = async () => {
    try {
      await api.play(adminPin);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Playback Error', message: err.message });
    }
  };

  const handlePause = async () => {
    try {
      await api.pause(adminPin);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Playback Error', message: err.message });
    }
  };

  const handleNext = async () => {
    try {
      await api.next(adminPin);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Skip Error', message: err.message });
    }
  };

  const handlePrevious = async () => {
    try {
      await api.previous(adminPin);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Previous Song Error', message: err.message });
    }
  };

  const handleSeek = async (time: number) => {
    try {
      await api.seek(time, adminPin);
    } catch (err: any) {
      console.warn('Seek error:', err.message);
    }
  };

  const handleVolume = async (vol: number, muted: boolean) => {
    try {
      await api.setVolume(vol, muted, adminPin);
    } catch (err: any) {
      console.warn('Volume error:', err.message);
    }
  };

  const handlePlayNow = async (url: string) => {
    try {
      await api.playNow(url, adminPin);
      addToast({ type: 'success', title: 'Playing now' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to play track', message: err.message });
    }
  };

  const handleRemoveQueueItem = async (id: string) => {
    try {
      await api.removeQueueItem(id, adminPin);
      addToast({ type: 'info', title: 'Song removed from queue' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to remove song', message: err.message });
    }
  };

  const handlePlayNextQueue = async (id: string) => {
    try {
      await api.playNextQueueItem(id, adminPin);
      addToast({ type: 'success', title: 'Moved to top of queue' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action failed', message: err.message });
    }
  };

  const handleReorderQueue = async (orderedIds: string[]) => {
    try {
      await api.reorderQueue(orderedIds, adminPin);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reorder failed', message: err.message });
    }
  };

  const handleClearQueue = async () => {
    try {
      await api.clearQueue(adminPin);
      addToast({ type: 'info', title: 'Queue cleared' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Clear failed', message: err.message });
    }
  };

  const handleAddPlaylistSong = async (url: string) => {
    try {
      const added = await api.addPlaylistSong(url, adminPin);
      addToast({ type: 'success', title: 'Added to Playlist', message: added.title });
      return added;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to add song', message: err.message });
      throw err;
    }
  };

  const handleRemovePlaylistSong = async (id: string) => {
    try {
      await api.removePlaylistSong(id, adminPin);
      addToast({ type: 'info', title: 'Removed from Playlist' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to remove', message: err.message });
    }
  };

  const handleTogglePlaylistSong = async (id: string, isEnabled: boolean) => {
    try {
      await api.togglePlaylistSong(id, isEnabled, adminPin);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to toggle', message: err.message });
    }
  };

  const handleReorderPlaylist = async (orderedIds: string[]) => {
    try {
      await api.reorderPlaylist(orderedIds, adminPin);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to reorder playlist', message: err.message });
    }
  };

  const handleUpdateSettings = async (partial: Partial<JukeboxSettings>) => {
    try {
      const updated = await api.updateSettings(partial, adminPin);
      setSettings(updated);
      addToast({ type: 'success', title: 'Settings saved' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to save settings', message: err.message });
      throw err;
    }
  };

  const handleVoteSkip = async () => {
    try {
      const res = await api.voteSkip(deviceId);
      setVoteState(res);
      if (res.skipped) {
        addToast({ type: 'success', title: 'Đã đủ 3 vote! Đang chuyển bài tiếp theo...' });
      } else {
        const hasVoted = Boolean(res.userVoted);
        addToast({
          type: 'info',
          title: hasVoted ? `Đã vote bỏ qua (${res.count}/${res.required})` : 'Đã hủy vote bỏ qua',
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Vote thất bại', message: err.message });
    }
  };

  const handleSendReaction = (emoji: string, userName?: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('reaction:send', { emoji, userName });
    }
  };

  const handleSendDanmaku = (text: string, userName?: string, color?: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('danmaku:send', { text, userName, color });
    }
  };

  const handleSearchSongs = async (query: string) => {
    return api.searchYouTube(query);
  };

  return {
    isConnected,
    isLoading,
    playerState,
    queue,
    playlist,
    settings,
    networkInfo,
    deviceId,
    adminPin,
    voteState,
    reactions,
    danmakuList,
    refreshAll,
    requestSong: handleRequestSong,
    searchSongs: handleSearchSongs,
    sendReaction: handleSendReaction,
    sendDanmaku: handleSendDanmaku,
    voteSkip: handleVoteSkip,
    startJukebox: handleStartJukebox,
    play: handlePlay,
    pause: handlePause,
    next: handleNext,
    previous: handlePrevious,
    seek: handleSeek,
    setVolume: handleVolume,
    playNow: handlePlayNow,
    removeQueueItem: handleRemoveQueueItem,
    playNextQueue: handlePlayNextQueue,
    reorderQueue: handleReorderQueue,
    clearQueue: handleClearQueue,
    addPlaylistSong: handleAddPlaylistSong,
    removePlaylistSong: handleRemovePlaylistSong,
    togglePlaylistSong: handleTogglePlaylistSong,
    reorderPlaylist: handleReorderPlaylist,
    updateSettings: handleUpdateSettings,
  };
}
