import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket.js';
import type {
  JukeboxSettings,
  MasterKind,
  MasterRegisterResult,
  MasterStatus,
  PlayerState,
} from '../types/index.js';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApiPromise: Promise<void> | null = null;

/** Load the YouTube IFrame API once per page. */
function loadYouTubeApi(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (!youTubeApiPromise) {
    youTubeApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    });
  }
  return youTubeApiPromise;
}

const LOUD_TRACK_PATTERN = /remix|vinahouse|phonk|bass|edm|quẩy|quay|trap|rave|club/i;

// YT.PlayerState values
const YT_UNSTARTED = -1;
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_CUED = 5;

interface UseMasterPlayerOptions {
  /** id of the element the IFrame player replaces */
  containerId: string;
  playerState: PlayerState;
  settings?: JukeboxSettings;
  adminPin: string;
  /** Take over audio from another master when this player mounts (explicit "player tab"). */
  takeoverOnMount: boolean;
  showControls?: boolean;
}

/**
 * Embedded YouTube "master" player: the only thing that produces audio in the browser.
 * The server accepts playback reports only from the single active, PIN-authenticated master.
 */
export function useMasterPlayer({
  containerId,
  playerState,
  settings,
  adminPin,
  takeoverOnMount,
  showControls = false,
}: UseMasterPlayerOptions) {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [activeKind, setActiveKind] = useState<MasterKind | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  const isActiveRef = useRef(false);
  const isPlayerReadyRef = useRef(false);
  const stateRef = useRef(playerState);
  stateRef.current = playerState;

  const isNormalizing =
    Boolean(playerState.currentSong && LOUD_TRACK_PATTERN.test(playerState.currentSong.title)) &&
    settings?.volumeNormalization !== false;
  const effectiveVolume = isNormalizing ? Math.round(playerState.volume * 0.82) : playerState.volume;

  const applyStatus = useCallback((status: MasterStatus) => {
    const socket = getSocket();
    const active = status.activeSocketId !== null && status.activeSocketId === socket.id;
    isActiveRef.current = active;
    setIsActive(active);
    setActiveKind(status.kind);
  }, []);

  // 1. Create the IFrame player
  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || playerRef.current) return;
      try {
        playerRef.current = new window.YT.Player(containerId, {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 0,
            controls: showControls ? 1 : 0,
            disablekb: showControls ? 0 : 1,
            fs: showControls ? 1 : 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              isPlayerReadyRef.current = true;
              setIsPlayerReady(true);
            },
            onStateChange: (event: any) => {
              if (!isActiveRef.current) return;
              const socket = getSocket();
              if (event.data === YT_ENDED) {
                socket.emit('player:song_ended');
              } else if (event.data === YT_PLAYING || event.data === YT_PAUSED) {
                if (event.data === YT_PLAYING) setNeedsUserGesture(false);
                socket.emit('player:report_state', {
                  status: event.data === YT_PLAYING ? 'playing' : 'paused',
                  currentTime: event.target.getCurrentTime() || 0,
                  duration: event.target.getDuration() || 0,
                });
              }
            },
            onError: (event: any) => {
              if (!isActiveRef.current) return;
              getSocket().emit('player:song_error', {
                youtubeId: stateRef.current.currentSong?.youtubeId || '',
                errorCode: event.data,
              });
            },
          },
        });
      } catch (err) {
        console.error('[MasterPlayer] Could not create YouTube player:', err);
      }
    });

    return () => {
      cancelled = true;
      isPlayerReadyRef.current = false;
      setIsPlayerReady(false);
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [containerId, showControls]);

  // 2. Register as master with the admin PIN (and again after every reconnect)
  const register = useCallback(
    (takeover: boolean) => {
      if (!adminPin) {
        setRegisterError('Cần đăng nhập PIN để phát nhạc');
        return;
      }
      getSocket().emit(
        'master:register',
        { pin: adminPin, kind: 'embedded', takeover },
        (result: MasterRegisterResult) => {
          if (!result?.ok) {
            setRegisterError(result?.error || 'Không thể xác thực máy phát');
            return;
          }
          setRegisterError(null);
          if (result.status) applyStatus(result.status);
        }
      );
    },
    [adminPin, applyStatus]
  );

  useEffect(() => {
    const socket = getSocket();
    let isFirstRegistration = true;

    const onConnect = () => {
      register(isFirstRegistration && takeoverOnMount);
      isFirstRegistration = false;
    };

    socket.on('master:status', applyStatus);
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off('master:status', applyStatus);
      socket.off('connect', onConnect);
      if (isActiveRef.current) socket.emit('master:release');
      isActiveRef.current = false;
    };
  }, [register, takeoverOnMount, applyStatus]);

  // 3. Becoming active: resume the current song; becoming standby: go silent
  useEffect(() => {
    const player = playerRef.current;
    if (!isPlayerReady || !player) return;
    const state = stateRef.current;
    try {
      if (isActive) {
        if (state.currentSong?.youtubeId && state.isJukeboxStarted) {
          const video = { videoId: state.currentSong.youtubeId, startSeconds: state.currentTime || 0 };
          if (state.status === 'playing') player.loadVideoById(video);
          else player.cueVideoById(video);
        }
      } else {
        player.stopVideo();
        setNeedsUserGesture(false);
      }
    } catch {
      // player not ready for API calls yet
    }
  }, [isActive, isPlayerReady]);

  // 4. Playback commands from the server
  useEffect(() => {
    const socket = getSocket();
    const onCommand = (command: { action: string; [key: string]: any }) => {
      const player = playerRef.current;
      if (!isActiveRef.current || !player || !isPlayerReadyRef.current) return;
      try {
        switch (command.action) {
          case 'load_song':
            if (command.song?.youtubeId) {
              player.loadVideoById({ videoId: command.song.youtubeId, startSeconds: 0 });
            }
            break;
          case 'play':
            player.playVideo();
            break;
          case 'pause':
            player.pauseVideo();
            break;
          case 'seek':
            if (typeof command.time === 'number') player.seekTo(command.time, true);
            break;
          case 'stop':
            player.stopVideo();
            break;
          default:
            // 'volume' is applied from player state; 'skip'/'queue_empty' only matter to the YouTube tab
            break;
        }
      } catch (err) {
        console.warn('[MasterPlayer] Command failed:', err);
      }
    };
    socket.on('player:command', onCommand);
    return () => {
      socket.off('player:command', onCommand);
    };
  }, []);

  // 5. Volume / mute (with the loud-track normalizer)
  useEffect(() => {
    const player = playerRef.current;
    if (!isPlayerReady || !player) return;
    try {
      player.setVolume(effectiveVolume);
      if (playerState.isMuted) player.mute();
      else player.unMute();
    } catch {
      // ignore
    }
  }, [effectiveVolume, playerState.isMuted, isPlayerReady]);

  // 6. Progress reports + detection of browser autoplay blocking
  useEffect(() => {
    if (!isPlayerReady) return;
    let blockedTicks = 0;
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!isActiveRef.current || !player || typeof player.getPlayerState !== 'function') return;
      try {
        const code = player.getPlayerState();
        const state = stateRef.current;
        if (code === YT_PLAYING) {
          blockedTicks = 0;
          getSocket().emit('player:report_state', {
            status: 'playing',
            currentTime: player.getCurrentTime() || 0,
            duration: player.getDuration() || 0,
          });
        } else if (
          state.status === 'playing' &&
          state.currentSong &&
          (code === YT_UNSTARTED || code === YT_CUED)
        ) {
          blockedTicks++;
          if (blockedTicks >= 3) setNeedsUserGesture(true);
        } else {
          blockedTicks = 0;
        }
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlayerReady]);

  /** Make this tab the audio output (called from a click, which also unlocks autoplay). */
  const claim = useCallback(() => register(true), [register]);

  /** Retry playback from a user gesture when the browser blocked autoplay. */
  const unlockAudio = useCallback(() => {
    setNeedsUserGesture(false);
    try {
      playerRef.current?.playVideo?.();
    } catch {
      // ignore
    }
  }, []);

  return {
    isPlayerReady,
    isActive,
    activeKind,
    registerError,
    needsUserGesture,
    isNormalizing,
    claim,
    unlockAudio,
  };
}
