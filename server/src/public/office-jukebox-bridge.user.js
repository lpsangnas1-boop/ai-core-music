// ==UserScript==
// @name         Office Jukebox — YouTube Tab Bridge
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Links your native YouTube tab directly to Office Jukebox local music queue
// @author       Office Jukebox Team
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[Office Jukebox Bridge] Initializing YouTube tab connector...');

  // Auto-detect server URL from current origin or default localhost:8989
  const SERVER_URL = window.__OFFICE_JUKEBOX_SERVER_URL__ || 'http://localhost:8989';

  // Dynamically load Socket.IO client if not present
  function loadSocketIO(callback) {
    if (window.io) {
      callback(window.io);
      return;
    }
    const script = document.createElement('script');
    script.src = SERVER_URL + '/socket.io/socket.io.js';
    script.onload = () => callback(window.io);
    script.onerror = () => {
      // Fallback CDN
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
      fallbackScript.onload = () => callback(window.io);
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  }

  // Create floating indicator badge on YouTube page
  function createIndicator() {
    const badge = document.createElement('div');
    badge.id = 'office-jukebox-indicator';
    badge.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #23251d;
      color: #ffffff;
      border: 1px solid #eb9d2a;
      border-radius: 6px;
      padding: 8px 14px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      cursor: pointer;
      user-select: none;
    `;
    badge.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #6aa84f;" id="oj-dot"></span>
      <span style="font-weight: bold; color: #eb9d2a;">Office Jukebox:</span>
      <span id="oj-status">Connecting to server...</span>
    `;
    document.body.appendChild(badge);
    return badge;
  }

  function initBridge(io) {
    const badge = createIndicator();
    const statusText = document.getElementById('oj-status');
    const dot = document.getElementById('oj-dot');

    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    let currentPlayingId = null;

    socket.on('connect', () => {
      console.log('[Office Jukebox Bridge] Connected to server!');
      if (statusText) statusText.textContent = 'Linked & Ready';
      if (dot) dot.style.background = '#6aa84f';
      socket.emit('bridge:register', { role: 'youtube_tab' });
    });

    socket.on('disconnect', () => {
      console.warn('[Office Jukebox Bridge] Disconnected from server');
      if (statusText) statusText.textContent = 'Server Offline';
      if (dot) dot.style.background = '#f54e00';
    });

    // Handle commands from Office Jukebox web app
    socket.on('player:command', (cmd) => {
      console.log('[Office Jukebox Bridge] Command received:', cmd);
      const player = document.getElementById('movie_player') || window.movie_player;

      if (cmd.action === 'load_song' && cmd.song && cmd.song.youtubeId) {
        const videoId = cmd.song.youtubeId;
        if (currentPlayingId === videoId) return;
        currentPlayingId = videoId;

        if (statusText) statusText.textContent = `Playing: ${cmd.song.title}`;

        if (player && typeof player.loadVideoById === 'function') {
          player.loadVideoById(videoId, 0);
          player.playVideo();
        } else {
          // Fallback location change
          if (!window.location.href.includes(videoId)) {
            window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
          }
        }
      } else if (cmd.action === 'play') {
        if (player && typeof player.playVideo === 'function') player.playVideo();
        const video = document.querySelector('video');
        if (video) video.play();
      } else if (cmd.action === 'pause') {
        if (player && typeof player.pauseVideo === 'function') player.pauseVideo();
        const video = document.querySelector('video');
        if (video) video.pause();
      } else if (cmd.action === 'seek' && typeof cmd.time === 'number') {
        if (player && typeof player.seekTo === 'function') player.seekTo(cmd.time, true);
      } else if (cmd.action === 'volume' && typeof cmd.volume === 'number') {
        if (player && typeof player.setVolume === 'function') player.setVolume(cmd.volume);
      }
    });

    // Listen to native YouTube <video> element events
    function hookVideoElement() {
      const video = document.querySelector('video');
      if (!video) {
        setTimeout(hookVideoElement, 1000);
        return;
      }

      video.addEventListener('ended', () => {
        console.log('[Office Jukebox Bridge] Video ended -> sending song_ended to server');
        socket.emit('player:song_ended');
      });

      // Report state periodically
      setInterval(() => {
        if (video) {
          const isPlaying = !video.paused && !video.ended && video.readyState > 2;
          socket.emit('player:report_state', {
            status: isPlaying ? 'playing' : video.paused ? 'paused' : 'idle',
            currentTime: video.currentTime || 0,
            duration: video.duration || 0,
          });
        }
      }, 1000);
    }

    hookVideoElement();
  }

  // Start initialization after DOM is ready
  window.addEventListener('load', () => {
    loadSocketIO((io) => {
      if (io) initBridge(io);
    });
  });
})();
