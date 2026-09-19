(function () {
  'use strict';

  console.log('[Office Jukebox Extension] Content script active on YouTube (CSP-compliant)');

  let serverUrl = 'http://localhost:8989';
  let socket = null;
  let currentPlayingVideoId = null;
  let lastSyncedVideoId = null;
  let hasSentEndedForCurrentVideo = false;
  let isChangingSong = false;
  let lastCommandTime = 0;

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
    badgeEl.addEventListener('click', () => {
      window.open(serverUrl, '_blank');
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

    // Cancel any YouTube autoplay countdown
    cancelYouTubeAutoplayOverlay();

    const video = document.querySelector('video');
    if (video) {
      video.pause();
    }

    setTimeout(() => {
      isChangingSong = false;
    }, 6000);

    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const currentUrl = window.location.href;

    if (currentUrl.includes(videoId)) {
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

    // 1. Extract Title
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

    // 2. Extract Channel
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

    return {
      youtubeId: videoId,
      title: title || 'YouTube Video',
      channel: channel || 'YouTube',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      currentTime: video ? Math.floor(video.currentTime) : 0,
      duration: video ? Math.floor(video.duration) : 0,
    };
  }

  function syncCurrentVideoToJukebox() {
    if (!socket || !socket.connected) return;

    const info = extractYouTubeInfo();
    if (!info || !info.youtubeId) return;

    // If we commanded a song transition, wait until the commanded song loads
    if (isChangingSong && currentPlayingVideoId && info.youtubeId !== currentPlayingVideoId) {
      return;
    }

    // Reset ended flag when new video begins
    if (lastSyncedVideoId !== info.youtubeId) {
      hasSentEndedForCurrentVideo = false;
      lastSyncedVideoId = info.youtubeId;
    }

    socket.emit('player:sync_from_youtube', info);
    setStatus(`Playing: ${info.title}`, '#2f80fa');
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

    const targetUrl = cleanUrl(serverUrl);
    console.log('[Office Jukebox Extension] Connecting Socket.IO to:', targetUrl);
    setStatus(`Connecting to ${targetUrl}...`, '#eb9d2a');

    try {
      socket = io(targetUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('[Office Jukebox Extension] Connected to', targetUrl);
        setStatus('Linked & Ready', '#6aa84f');
        setTimeout(syncCurrentVideoToJukebox, 500);
      });

      socket.on('disconnect', () => {
        console.warn('[Office Jukebox Extension] Disconnected from server');
        setStatus('Reconnecting...', '#eb9d2a');
      });

      socket.io.on('reconnect', () => {
        console.log('[Office Jukebox Extension] Reconnected to server');
        setStatus('Linked & Ready', '#6aa84f');
        setTimeout(syncCurrentVideoToJukebox, 500);
      });

      socket.on('connect_error', (err) => {
        console.warn('[Office Jukebox Extension] Connect error:', err.message);
        setStatus(`Cannot reach ${targetUrl}`, '#eb9d2a');
      });

      // Handle playback commands from Jukebox (100% CSP-safe)
      socket.on('player:command', (cmd) => {
        console.log('[Office Jukebox Extension] Received command from Jukebox:', cmd);
        const video = document.querySelector('video');

        if (cmd.action === 'load_song' && cmd.song && cmd.song.youtubeId) {
          const videoId = cmd.song.youtubeId;
          setStatus(`Order Playing: ${cmd.song.title}`, '#2f80fa');
          loadVideoOnYouTube(videoId);
        } else if (cmd.action === 'play') {
          if (video) video.play().catch(() => {});
        } else if (cmd.action === 'pause') {
          if (video) video.pause();
        } else if (cmd.action === 'seek' && typeof cmd.time === 'number') {
          if (video) video.currentTime = cmd.time;
        } else if (cmd.action === 'volume' && typeof cmd.volume === 'number') {
          if (video) video.volume = Math.max(0, Math.min(1, cmd.volume / 100));
        } else if (cmd.action === 'skip' || cmd.action === 'next') {
          const nextBtn = document.querySelector('.ytp-next-button') || document.querySelector('a.ytp-next-button');
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

  // Hook YouTube <video> element events
  let isHooked = false;
  function hookVideo() {
    const video = document.querySelector('video');
    if (!video) {
      setTimeout(hookVideo, 1000);
      return;
    }

    if (isHooked) return;
    isHooked = true;

    function handleSongEnded() {
      if (hasSentEndedForCurrentVideo) return; // ONLY ONCE per song!
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
      
      if (socket && socket.connected) {
        socket.emit('player:song_ended');
      }
    }

    video.addEventListener('ended', handleSongEnded);

    video.addEventListener('timeupdate', () => {
      // If video is within 1s of ending, trigger early to override YouTube autoplay countdown!
      if (video.duration > 10 && video.currentTime >= video.duration - 1.2 && !hasSentEndedForCurrentVideo) {
        handleSongEnded();
      }
    });

    video.addEventListener('play', () => {
      syncCurrentVideoToJukebox();
      if (socket && socket.connected) {
        socket.emit('player:report_state', {
          status: 'playing',
          currentTime: video.currentTime || 0,
          duration: video.duration || 0,
        });
      }
    });

    video.addEventListener('pause', () => {
      if (!video.ended && socket && socket.connected) {
        socket.emit('player:report_state', {
          status: 'paused',
          currentTime: video.currentTime || 0,
          duration: video.duration || 0,
        });
      }
    });

    // Periodic synchronization every 1s
    setInterval(() => {
      if (socket && socket.connected) {
        syncCurrentVideoToJukebox();
      }
    }, 1000);
  }

  // Initialize
  function init() {
    createBadge();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['jukeboxUrl'], (result) => {
        if (result && result.jukeboxUrl) {
          serverUrl = result.jukeboxUrl;
        }
        connectSocket();
        hookVideo();
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.jukeboxUrl) {
          serverUrl = changes.jukeboxUrl.newValue;
          console.log('[Office Jukebox Extension] URL changed to:', serverUrl);
          connectSocket();
        }
      });
    } else {
      connectSocket();
      hookVideo();
    }

    window.addEventListener('yt-navigate-finish', () => {
      createBadge();
      isHooked = false;
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
