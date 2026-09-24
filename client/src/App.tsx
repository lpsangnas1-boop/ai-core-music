import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useJukebox } from './hooks/useJukebox.js';
import { useDeviceId } from './hooks/useDeviceId.js';
import { usePictureInPicture } from './hooks/usePictureInPicture.js';
import { Navbar } from './components/common/Navbar.js';
import { YouTubeBridgeModal } from './components/common/YouTubeBridgeModal.js';
import { OrderHistoryModal } from './components/common/OrderHistoryModal.js';
import { DanmakuOverlay } from './components/common/DanmakuOverlay.js';
import { ToastContainer } from './components/common/ToastContainer.js';
import { AdminPinModal } from './components/admin/AdminPinModal.js';
import { MiniPlayer } from './components/common/MiniPlayer.js';
import { GuestPage } from './pages/GuestPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { PlayerPage } from './pages/PlayerPage.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { useToast } from './hooks/useToast.js';
import { api, ADMIN_UNAUTHORIZED_EVENT } from './services/api.js';

const requiresAdmin = (path: string) => path.startsWith('/admin') || path === '/player';

export const App: React.FC = () => {
  const {
    deviceId,
    requesterName,
    saveRequesterName,
    userAvatar,
    saveUserAvatar,
    adminPin,
    saveAdminPin,
    clearAdminPin,
  } = useDeviceId();
  const jukebox = useJukebox(adminPin);
  const pip = usePictureInPicture();
  const { addToast } = useToast();
  const isAdmin = Boolean(adminPin);

  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Dynamic Browser Tab Title like YouTube
  useEffect(() => {
    const currentSong = jukebox.playerState.currentSong;
    const isPlaying = jukebox.playerState.status === 'playing';

    if (currentSong && currentSong.title) {
      const icon = isPlaying ? '▶ ' : '⏸ ';
      document.title = `${icon}${currentSong.title} • AI Core music`;
    } else {
      document.title = 'AI Core music 🤖🎵';
    }
  }, [jukebox.playerState.currentSong, jukebox.playerState.status]);

  // Developer Console Signature (F12 / Ctrl+Shift+J)
  useEffect(() => {
    const logoAscii = `
██╗      ███████╗    ██████╗ ██╗  ██╗██╗   ██╗ ██████╗  ██████╗    ███████╗ █████╗ ███╗   ██╗ ██████╗ 
██║      ██╔════╝    ██╔══██╗██║  ██║██║   ██║██╔═══██╗██╔════╝    ██╔════╝██╔══██╗████╗  ██║██╔════╝ 
██║      █████╗      ██████╔╝███████║██║   ██║██║   ██║██║         ███████╗███████║██╔██╗ ██║██║  ███╗
██║      ██╔══╝      ██╔═══╝ ██╔══██║██║   ██║██║   ██║██║         ╚════██║██╔══██║██║╚██╗██║██║   ██║
███████╗███████╗     ██║     ██║  ██║╚██████╔╝╚██████╔╝╚██████╗    ███████║██║  ██║██║ ╚████║╚██████╔╝
╚══════╝╚══════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝  ╚═════╝    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚══════╝
`;

    console.log(
      `%c${logoAscii}%c\n      🎵  AI CORE MUSIC • OFFICE JUKEBOX  🎵\n`,
      'color: #3252f4; font-family: monospace; font-weight: bold; line-height: 1.0; font-size: 7px;',
      'color: #25385b; font-family: sans-serif; font-weight: bold; font-size: 11px;'
    );

    console.log(
      '──────────────────────────────────────────────────\n Developed by %cLe Phuoc Sang%c • %chttps://lpsang.id.vn/%c\n──────────────────────────────────────────────────',
      'color: #3252f4; font-weight: bold;',
      'color: inherit;',
      'color: #3252f4; text-decoration: underline;',
      'color: inherit;'
    );

    console.log(
      '%c💡 Tip: Press Ctrl + Shift + J (Cmd + Option + J on Mac) to focus directly on Console!%c',
      'color: #10b981; font-weight: 600; font-size: 11px;',
      'color: inherit;'
    );
  }, []);

  // Opening /admin or /player directly without a stored PIN asks for it instead of silently showing the guest page
  useEffect(() => {
    if (requiresAdmin(currentPath) && !adminPin) {
      setIsPinModalOpen(true);
    }
  }, [currentPath, adminPin]);

  // Check a stored PIN once on load: a stale PIN (e.g. changed in .env) is dropped via the
  // unauthorized event below instead of silently lingering in this browser.
  useEffect(() => {
    if (adminPin) {
      api.verifyStoredPin(adminPin).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A stored PIN that the server rejects (e.g. PIN changed in .env) is dropped and asked again
  useEffect(() => {
    const onUnauthorized = () => {
      clearAdminPin();
      addToast({
        type: 'warning',
        title: 'Phiên DJ đã hết hiệu lực',
        message: 'Mã PIN không còn đúng. Vui lòng nhập lại PIN.',
      });
      if (requiresAdmin(window.location.pathname)) {
        setIsPinModalOpen(true);
      }
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [addToast]);

  const navigate = (path: string) => {
    if (requiresAdmin(path) && !adminPin) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setIsPinModalOpen(true);
      return;
    }
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handlePinSuccess = (pin: string) => {
    saveAdminPin(pin);
    setIsPinModalOpen(false);
    if (!requiresAdmin(currentPath)) {
      window.history.pushState({}, '', '/admin');
      setCurrentPath('/admin');
    }
  };

  const handleCancelPin = () => {
    setIsPinModalOpen(false);
    if (requiresAdmin(currentPath)) {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  const reactionName = `${userAvatar || '🐱'} ${requesterName || 'Ẩn danh'}`;
  // Anyone can skip with one click; Play/Pause stay on DJ screens only.
  const hasDjControls = isAdmin && requiresAdmin(currentPath);

  const handleLogoutAdmin = () => {
    clearAdminPin();
    navigate('/');
  };

  const isAdminView = currentPath.startsWith('/admin') && isAdmin;

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#25385b] selection:bg-[#a2b0ff] selection:text-[#25385b] relative overflow-x-hidden">
      {/* Recess Signature Floating Sunset Atmosphere Orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Warm Sunset Peach / Tangerine Orb (Top Right) */}
        <div className="absolute -top-[10%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-[#ff8a7a]/60 via-[#fed7aa]/50 to-[#fbcfe8]/40 blur-[100px] animate-recess-float-slow" />

        {/* Swimming Pool Periwinkle / Water Orb (Top Left) */}
        <div className="absolute top-[8%] -left-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#93c5fd]/65 via-[#a5b4fc]/55 to-[#c7d2fe]/45 blur-[110px] animate-recess-float-reverse" />

        {/* Golden Apricot Sunlight Glow (Center) */}
        <div className="absolute top-[40%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-r from-[#fef08a]/50 via-[#fed7aa]/45 to-[#ffedd5]/35 blur-[120px] animate-recess-pulse-glow" />

        {/* Pool Mint / Lilac Mist Orb (Bottom Right) */}
        <div className="absolute -bottom-[15%] right-[5%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-[#a7f3d0]/55 via-[#bfdbfe]/50 to-[#ddd6fe]/60 blur-[110px] animate-recess-float-slow" />

        {/* Rose Sunset Dusk Orb (Bottom Left) */}
        <div className="absolute -bottom-[10%] -left-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-[#f472b6]/45 via-[#fbcfe8]/40 to-[#fed7aa]/45 blur-[100px] animate-recess-float-reverse" />
      </div>

      {/* Toast Stack */}
      <ToastContainer />

      {/* Recess Signature Top Marquee Banner */}
      <div className="w-full h-8 sm:h-9 bg-[#25385b] text-[#ffffff] overflow-hidden flex items-center select-none border-b border-[#25385b] z-30">
        <div className="animate-marquee-infinite text-[11px] sm:text-xs font-semibold tracking-wider uppercase font-runde">
          <span className="flex items-center gap-6 px-4 shrink-0">
            <span>AI CORE MUSIC</span>
            <span>•</span>
            <span>PASTEL SUNSET VIBES</span>
            <span>•</span>
            <span>ORDER YOUR SONGS</span>
            <span>•</span>
            <span>DELIBERATE CALM</span>
            <span>•</span>
            <span>CHILL & FOCUS</span>
            <span>•</span>
            <span>SWIMMING POOL HORIZON</span>
            <span>•</span>
          </span>
          <span className="flex items-center gap-6 px-4 shrink-0">
            <span>AI CORE MUSIC</span>
            <span>•</span>
            <span>PASTEL SUNSET VIBES</span>
            <span>•</span>
            <span>ORDER YOUR SONGS</span>
            <span>•</span>
            <span>DELIBERATE CALM</span>
            <span>•</span>
            <span>CHILL & FOCUS</span>
            <span>•</span>
            <span>SWIMMING POOL HORIZON</span>
            <span>•</span>
          </span>
        </div>
      </div>

      {/* YouTube Tab Link Guide Modal Window */}
      <YouTubeBridgeModal
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
        networkInfo={jukebox.networkInfo}
      />

      {/* Order History Modal Window */}
      <OrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onReorderSong={(youtubeId) =>
          jukebox.requestSong(youtubeId, `${userAvatar || '🐱'} ${requesterName || 'Đồng nghiệp'}`)
        }
      />

      {/* Live Danmaku Bullet Chat Overlay */}
      <ErrorBoundary fallback={null}>
        <DanmakuOverlay
          danmakuList={jukebox.danmakuList}
          onSendDanmaku={jukebox.sendDanmaku}
          defaultUserName={`${userAvatar || '🐱'} ${requesterName || ''}`.trim()}
        />
      </ErrorBoundary>

      {/* Admin PIN Modal Window */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onSuccess={handlePinSuccess}
        onCancel={handleCancelPin}
      />

      {/* Navigation Bar on Sandy Desk */}
      <Navbar
        serverName={jukebox.settings.serverName}
        isConnected={jukebox.isConnected}
        onOpenBridgeModal={() => setIsBridgeModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isAdminView={isAdminView}
        currentPath={currentPath}
        onNavigate={navigate}
        networkInfo={jukebox.networkInfo}
        isDocPipSupported={pip.isDocPipSupported}
        isDocPipActive={pip.isDocPipActive}
        isInPageMiniActive={pip.isInPageMiniActive}
        onToggleDocPip={pip.toggleDocPip}
        onToggleInPageMini={pip.toggleInPageMini}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 pb-12">
        <ErrorBoundary resetKey={currentPath}>
        {currentPath === '/player' && isAdmin ? (
          <PlayerPage
            playerState={jukebox.playerState}
            queue={jukebox.queue}
            settings={jukebox.settings}
            adminPin={adminPin}
            onStartJukebox={jukebox.startJukebox}
            onPlay={jukebox.play}
            onPause={jukebox.pause}
            onNext={jukebox.next}
            onPrevious={jukebox.previous}
            onSeek={jukebox.seek}
            onVolume={jukebox.setVolume}
            onNavigateBack={() => navigate('/')}
            onOpenBridgeModal={() => setIsBridgeModalOpen(true)}
            onTogglePip={() => {
              pip.toggleInPageMini();
            }}
          />
        ) : currentPath === '/admin/settings' && isAdminView ? (
          <SettingsPage
            settings={jukebox.settings}
            onUpdateSettings={jukebox.updateSettings}
            onNavigateBack={() => navigate('/admin')}
          />
        ) : currentPath === '/admin' && isAdminView ? (
          <AdminPage
            playerState={jukebox.playerState}
            queue={jukebox.queue}
            playlist={jukebox.playlist}
            settings={jukebox.settings}
            networkInfo={jukebox.networkInfo}
            adminPin={adminPin}
            onLogoutAdmin={handleLogoutAdmin}
            onStartJukebox={jukebox.startJukebox}
            onPlay={jukebox.play}
            onPause={jukebox.pause}
            onNext={jukebox.next}
            onPrevious={jukebox.previous}
            onSeek={jukebox.seek}
            onVolume={jukebox.setVolume}
            onRemoveQueueItem={jukebox.removeQueueItem}
            onPlayNextQueue={jukebox.playNextQueue}
            onReorderQueue={jukebox.reorderQueue}
            onClearQueue={jukebox.clearQueue}
            onAddQueueSong={jukebox.requestSong}
            onAddPlaylistSong={jukebox.addPlaylistSong}
            onRemovePlaylistSong={jukebox.removePlaylistSong}
            onTogglePlaylistSong={jukebox.togglePlaylistSong}
            onReorderPlaylist={jukebox.reorderPlaylist}
            onPlayNow={jukebox.playNow}
          />
        ) : (
          <GuestPage
            playerState={jukebox.playerState}
            queue={jukebox.queue}
            settings={jukebox.settings}
            networkInfo={jukebox.networkInfo}
            deviceId={deviceId}
            requesterName={requesterName}
            userAvatar={userAvatar}
            reactions={jukebox.reactions}
            onSaveRequesterName={saveRequesterName}
            onSaveUserAvatar={saveUserAvatar}
            onRequestSong={jukebox.requestSong}
            onSkipSong={jukebox.next}
            onSendReaction={(emoji) => jukebox.sendReaction(emoji, reactionName)}
            onTogglePip={() => {
              pip.toggleInPageMini();
            }}
          />
        )}
        </ErrorBoundary>
      </main>

      {/* 1. Document Picture-in-Picture Portal (OS Always-on-Top Floating Window) */}
      {pip.isDocPipActive &&
        pip.pipContainer &&
        createPortal(
          <MiniPlayer
            playerState={jukebox.playerState}
            isDocPip
            isDocPipSupported={pip.isDocPipSupported}
            onClose={pip.closeDocPip}
            onSkipSong={jukebox.next}
            onPlay={hasDjControls ? jukebox.play : undefined}
            onPause={hasDjControls ? jukebox.pause : undefined}
            onSendReaction={(emoji) => jukebox.sendReaction(emoji, reactionName)}
            onFocusMainWindow={pip.focusMainWindow}
          />,
          pip.pipContainer
        )}

      {/* 2. In-Page Floating Mini Player (Pinned Bottom-Right Widget) */}
      {pip.isInPageMiniActive && (
        <MiniPlayer
          playerState={jukebox.playerState}
          isInPage
          isPillMode={pip.isPillMode}
          isDocPipSupported={pip.isDocPipSupported}
          onTogglePillMode={pip.togglePillMode}
          onOpenDocPip={pip.openDocPip}
          onClose={() => pip.setIsInPageMiniActive(false)}
          onSkipSong={jukebox.next}
          onPlay={hasDjControls ? jukebox.play : undefined}
          onPause={hasDjControls ? jukebox.pause : undefined}
          onSendReaction={(emoji) => jukebox.sendReaction(emoji, reactionName)}
        />
      )}

      {/* Recess Dusk Indigo Footer */}
      <footer className="py-6 bg-[#0a0a3a] border-t border-[#25385b] text-center text-xs text-[#ffffff]/80 flex flex-col items-center justify-center gap-1 font-runde">
        <div className="flex items-center gap-2">
          <span className="font-script text-2xl text-[#a2b0ff]">AI Core music</span>
          <span className="text-[#84849c]">•</span>
          <span className="text-[11px] uppercase tracking-widest text-[#a2b0ff]">Office Jukebox</span>
        </div>
        <p className="text-[11px] text-[#84849c]">
          Created by{' '}
          <a
            href="https://lpsang.id.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#a2b0ff] hover:text-white hover:underline underline-offset-2 transition-colors font-medium"
          >
            Le Phuoc Sang
          </a>
        </p>
      </footer>
    </div>
  );
};
