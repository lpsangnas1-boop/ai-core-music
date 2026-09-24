(function () {
  'use strict';

  console.log('[Office Jukebox Extension] Content script active on YouTube (CSP-compliant)');

  let serverUrl = 'http://localhost:8989';
  let adminPin = '';
  let socket = null;
  let isMaster = false;
  let currentPlayingVideoId = null;
  let lastSyncedVideoId = null;
  let hasSentEndedForCurrentVideo = false;
  let isChangingSong = false;
  let lastCommandTime = 0;
  let hookedVideo = null;
  let syncTimer = null;

  // Floating UI badge
  let badgeEl = null;
  let statusTextEl = null;
  let dotEl = null;

  function createBadge() {
    if (document.getElementById('office-jukebox-ext-badge')) {
      badgeEl = document.getElementById('office-jukebox-ext-badge');
      statusTextEl = document.getElementById('oj-status');
      dotEl = document.getElementById('oj-dot');
      return;
    }

    badgeEl = document.createElement('div');
    badgeEl.id = 'office-jukebox-ext-badge';
    badgeEl.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999999;
      background: #23251d;
      color: #ffffff;
      border: 1.5px solid #eb9d2a;
      border-radius: 6px;
      padding: 8px 14px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6);
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s ease;
    `;
    badgeEl.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #eb9d2a; display: inline-block;" id="oj-dot"></span>
      <span style="font-weight: bold; color: #eb9d2a;">Office Jukebox:</span>
      <span id="oj-status">Connecting...</span>
    `;

    badgeEl.addEventListener('mouseenter', () => (badgeEl.style.transform = 'scale(1.03)'));
    badgeEl.addEventListener('mouseleave', () => (badgeEl.style.transform = 'scale(1.0)'));
    // Click: take over audio when another player is active, otherwise open the Jukebox web app
    badgeEl.addEventListener('click', () => {
      if (socket && socket.connected && !isMaster && adminPin) {
        registerAsMaster(true);
      } else {
        window.open(serverUrl, '_blank');
      }
    });

    document.body.appendChild(badgeEl);
    statusTextEl = document.getElementById('oj-status');
    dotEl = document.getElementById('oj-dot');
  }

  function setStatus(text, color = '#6aa84f') {
    if (statusTextEl) statusTextEl.textContent = text;
    if (dotEl) dotEl.style.background = color;
  }

  function cleanUrl(url) {
    if (!url) return 'http://localhost:8989';
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    return clean;
  }

  /** YouTube adds "ad-showing" to the player while an ad plays in the same <video>. */
  function isAdPlaying() {
    const player = document.getElementById('movie_player');
    return Boolean(player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')));
  }

  function cancelYouTubeAutoplayOverlay() {
    try {
      const cancelBtn =
        document.querySelector('.ytp-autonav-endscreen-button-cancel') ||
        document.querySelector('.ytp-upnext-cancel-button') ||
        document.querySelector('.ytp-autonav-cancel-button');
      if (cancelBtn) {
        cancelBtn.click();
      }
    } catch (e) {}
  }

  function loadVideoOnYouTube(videoId) {
    hasSentEndedForCurrentVideo = false;
    currentPlayingVideoId = videoId;
    isChangingSong = true;
    lastCommandTime = Date.now();

    cancelYouTubeAutoplayOverlay();

    const video = document.querySelector('video');
    if (video) {
      video.pause();
    }

    setTimeout(() => {
      isChangingSong = false;
    }, 6000);

    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

    if (new URLSearchParams(window.location.search).get('v') === videoId) {
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    } else {
      console.log('[Office Jukebox Extension] Navigating to requested video:', targetUrl);
      window.location.href = targetUrl;
    }
  }

  function extractYouTubeInfo() {
    let videoId = null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      videoId = urlParams.get('v');
      if (!videoId && window.location.pathname.startsWith('/shorts/')) {
        videoId = window.location.pathname.split('/shorts/')[1].split('/')[0];
      }
    } catch (e) {}

    if (!videoId) return null;

    let title = '';
    const titleEl =
      document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
      document.querySelector('#title h1 yt-formatted-string') ||
      document.querySelector('ytd-watch-metadata #title') ||
      document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
      document.querySelector('h1.title yt-formatted-string');

    if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
      title = titleEl.textContent.trim();
    } else {
      title = document.title.replace(/\s*-\s*YouTube$/, '').trim();
    }

    let channel = '';
    const channelEl =
      document.querySelector('#channel-name yt-formatted-string a') ||
      document.querySelector('ytd-channel-name a') ||
      document.querySelector('#owner #channel-name') ||
      document.querySelector('#owner-name a');

    if (channelEl && channelEl.textContent && channelEl.textContent.trim()) {
      channel = channelEl.textContent.trim();
    } else {
      channel = 'YouTube Channel';
    }

    const video = document.querySelector('video');
    const duration = video && Number.isFinite(video.duration) ? Math.floor(video.duration) : 0;

    return {
      youtubeId: videoId,
      title: title || 'YouTube Video',
      channel: channel || 'YouTube',
      currentTime: video ? Math.floor(video.currentTime) : 0,
      duration,
      status: video && !video.paused && !video.ended ? 'playing' : 'paused',
    };
  }

  function syncCurrentVideoToJukebox() {
    if (!socket || !socket.connected || !isMaster) return;
    // During ads the <video> element reports the ad's time/duration, not the song's
    if (isAdPlaying()) return;

    const info = extractYouTubeInfo();
    if (!info || !info.youtubeId) return;

    // If we commanded a song transition, wait until the commanded song loads
    if (isChangingSong && currentPlayingVideoId && info.youtubeId !== currentPlayingVideoId) {
      return;
    }

    if (lastSyncedVideoId !== info.youtubeId) {
      hasSentEndedForCurrentVideo = false;
      lastSyncedVideoId = info.youtubeId;
    }

    socket.emit('player:sync_from_youtube', info);
    setStatus(`${info.status === 'playing' ? 'Playing' : 'Paused'}: ${info.title}`, '#2f80fa');
  }

  function registerAsMaster(takeover) {
    if (!socket || !socket.connected) return;
    if (!adminPin) {
      isMaster = false;
      setStatus('Cần nhập PIN DJ trong popup extension', '#f54e00');
      return;
    }
    socket.emit('master:register', { pin: adminPin, kind: 'youtube-tab', takeover: Boolean(takeover) }, (res) => {
      if (!res || !res.ok) {
        isMaster = false;
        setStatus((res && res.error) || 'PIN không đúng', '#f54e00');
        return;
      }
      isMaster = Boolean(res.active);
      if (isMaster) {
        setStatus('Linked & Ready', '#6aa84f');
        setTimeout(syncCurrentVideoToJukebox, 500);
      } else {
        setStatus('Đang phát ở tab khác — bấm để chuyển về đây', '#eb9d2a');
      }
    });
  }

  function connectSocket() {
    if (typeof io === 'undefined') {
      console.warn('[Office Jukebox Extension] io library is not loaded');
      return;
    }

    if (socket) {
      try {
        socket.disconnect();
      } catch (e) {}
    }
    isMaster = false;

    const targetUrl = cleanUrl(serverUrl);
    console.log('[Office Jukebox Extension] Connecting Socket.IO to:', targetUrl);
    setStatus(`Connecting to ${targetUrl}...`, '#eb9d2a');

    try {
      socket = io(targetUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        // Fall back to HTTP long-polling when a proxy/network blocks WebSockets
        tryAllTransports: true,
      });

      let isOffline = false;

      // 'connect' also fires after every automatic reconnection
      socket.on('connect', () => {
        console.log('[Office Jukebox Extension] Connected to', targetUrl);
        isOffline = false;
        registerAsMaster(false);
      });

      socket.on('disconnect', () => {
        isMaster = false;
        setStatus('Reconnecting...', '#eb9d2a');
      });

      socket.on('connect_error', (err) => {
        // Retries happen every few seconds while the DJ server is off: log once per outage
        // (console.log, not warn) so chrome://extensions is not flooded with "errors".
        if (!isOffline) {
          isOffline = true;
          console.log(`[Office Jukebox Extension] Cannot reach ${targetUrl} (${err.message}). Retrying in background...`);
        }
        setStatus(`Không kết nối được server — DJ Station đã bật chưa? (${targetUrl})`, '#eb9d2a');
      });

      socket.on('master:status', (status) => {
        const active = Boolean(status && status.activeSocketId && status.activeSocketId === socket.id);
        if (isMaster && !active) {
          setStatus('Đang phát ở tab khác — bấm để chuyển về đây', '#eb9d2a');
          const video = document.querySelector('video');
          if (video) video.pause();
        }
        isMaster = active;
      });

      socket.on('player:command', (cmd) => {
        if (!isMaster || !cmd) return;
        const video = document.querySelector('video');

        if (cmd.action === 'load_song' && cmd.song && cmd.song.youtubeId) {
          setStatus(`Order Playing: ${cmd.song.title}`, '#2f80fa');
          loadVideoOnYouTube(cmd.song.youtubeId);
        } else if (cmd.action === 'play') {
          if (video) video.play().catch(() => {});
        } else if (cmd.action === 'pause' || cmd.action === 'stop') {
          if (video) video.pause();
        } else if (cmd.action === 'seek' && typeof cmd.time === 'number') {
          if (video) video.currentTime = cmd.time;
        } else if (cmd.action === 'volume' && typeof cmd.volume === 'number') {
          if (video) {
            video.volume = Math.max(0, Math.min(1, cmd.volume / 100));
            video.muted = Boolean(cmd.isMuted);
          }
        } else if (cmd.action === 'skip' || cmd.action === 'next') {
          const nextBtn = document.querySelector('.ytp-next-button');
          if (nextBtn) {
            nextBtn.click();
          } else {
            const nextRecommendation = document.querySelector('ytd-compact-video-renderer a#thumbnail, #items ytd-compact-video-renderer a');
            if (nextRecommendation) nextRecommendation.click();
          }
        }
      });
    } catch (err) {
      console.error('[Office Jukebox Extension] Socket connection error:', err);
    }
  }

  function handleSongEnded(video) {
    if (hasSentEndedForCurrentVideo || isAdPlaying()) return;
    const now = Date.now();

    if (isChangingSong || now - lastCommandTime < 6000) {
      console.log('[Office Jukebox Extension] Ignored song change ended event.');
      return;
    }

    if (video.duration > 10 && video.currentTime < video.duration - 4) {
      console.log('[Office Jukebox Extension] Ignored premature ended event at:', video.currentTime);
      return;
    }

    hasSentEndedForCurrentVideo = true;
    cancelYouTubeAutoplayOverlay();
    console.log('[Office Jukebox Extension] Song ended legitimately! Requesting next queued song...');

    if (socket && socket.connected && isMaster) {
      socket.emit('player:song_ended');
    }
  }

  // Attach listeners once per <video> element (YouTube reuses it across SPA navigations)
  function hookVideo() {
    const video = document.querySelector('video');
    if (!video) {
      setTimeout(hookVideo, 1000);
      return;
    }
    if (video === hookedVideo) return;
    hookedVideo = video;

    video.addEventListener('ended', () => handleSongEnded(video));

    video.addEventListener('timeupdate', () => {
      // Trigger slightly early to beat YouTube's own autoplay countdown (never during ads)
      if (
        !isAdPlaying() &&
        video.duration > 10 &&
        video.currentTime >= video.duration - 1.2 &&
        !hasSentEndedForCurrentVideo
      ) {
        handleSongEnded(video);
      }
    });

    video.addEventListener('play', () => syncCurrentVideoToJukebox());
    video.addEventListener('pause', () => {
      if (!video.ended) syncCurrentVideoToJukebox();
    });
  }

  function startSyncTimer() {
    if (syncTimer) return;
    syncTimer = setInterval(syncCurrentVideoToJukebox, 1000);
  }

  function init() {
    createBadge();

    const start = () => {
      connectSocket();
      hookVideo();
      startSyncTimer();
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['jukeboxUrl', 'jukeboxPin'], (result) => {
        if (result && result.jukeboxUrl) serverUrl = result.jukeboxUrl;
        if (result && result.jukeboxPin) adminPin = result.jukeboxPin;
        start();
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.jukeboxPin) adminPin = changes.jukeboxPin.newValue || '';
        if (changes.jukeboxUrl) {
          serverUrl = changes.jukeboxUrl.newValue;
          console.log('[Office Jukebox Extension] URL changed to:', serverUrl);
          connectSocket();
        } else if (changes.jukeboxPin) {
          registerAsMaster(false);
        }
      });
    } else {
      start();
    }

    window.addEventListener('yt-navigate-finish', () => {
      createBadge();
      hookVideo();
      setTimeout(syncCurrentVideoToJukebox, 1000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
