import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePictureInPictureReturn {
  isDocPipSupported: boolean;
  isDocPipActive: boolean;
  pipWindow: Window | null;
  pipContainer: HTMLElement | null;
  isInPageMiniActive: boolean;
  isPillMode: boolean;
  openDocPip: () => Promise<boolean>;
  closeDocPip: () => void;
  toggleDocPip: () => Promise<void>;
  setIsInPageMiniActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  toggleInPageMini: () => void;
  setIsPillMode: (pill: boolean | ((prev: boolean) => boolean)) => void;
  togglePillMode: () => void;
  focusMainWindow: () => void;
}

export function usePictureInPicture(): UsePictureInPictureReturn {
  const isDocPipSupported =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  const [isDocPipActive, setIsDocPipActive] = useState<boolean>(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);

  const [isInPageMiniActive, setIsInPageMiniActive] = useState<boolean>(false);
  const [isPillMode, setIsPillMode] = useState<boolean>(false);

  const pipWinRef = useRef<Window | null>(null);

  // Close Document PiP
  const closeDocPip = useCallback(() => {
    if (pipWinRef.current && !pipWinRef.current.closed) {
      pipWinRef.current.close();
    }
    pipWinRef.current = null;
    setPipWindow(null);
    setPipContainer(null);
    setIsDocPipActive(false);
  }, []);

  // Open Document PiP
  const openDocPip = useCallback(async (): Promise<boolean> => {
    if (!isDocPipSupported) {
      // Fallback to in-page mini player if Document PiP is not supported
      setIsInPageMiniActive(true);
      return false;
    }

    try {
      // If already open, close first or focus
      if (pipWinRef.current && !pipWinRef.current.closed) {
        pipWinRef.current.focus();
        return true;
      }

      const isCompact = typeof window !== 'undefined' && localStorage.getItem('pip_compact_mode') !== 'false';
      // @ts-ignore
      const win = await window.documentPictureInPicture.requestWindow({
        width: isCompact ? 330 : 380,
        height: isCompact ? 112 : 180,
      });

      // Clone stylesheets into the PiP window
      Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(
        (styleEl) => {
          win.document.head.appendChild(styleEl.cloneNode(true));
        }
      );

      // Add favicon & title
      win.document.title = 'AI Core music • PiP';
      const iconLink = win.document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.href = '/logo.png';
      win.document.head.appendChild(iconLink);

      // Setup html and body style - completely override global background gradient from index.css
      win.document.documentElement.style.margin = '0';
      win.document.documentElement.style.padding = '0';
      win.document.documentElement.style.height = '100%';
      win.document.documentElement.style.backgroundColor = '#fffcef';
      win.document.documentElement.style.backgroundImage = 'none';

      win.document.body.className = 'm-0 p-0 overflow-hidden font-sans select-none antialiased';
      win.document.body.style.margin = '0';
      win.document.body.style.padding = '0';
      win.document.body.style.overflow = 'hidden';
      win.document.body.style.width = '100vw';
      win.document.body.style.height = '100vh';
      win.document.body.style.backgroundColor = '#fffcef';
      win.document.body.style.backgroundImage = 'none';

      // Container for React portal
      const container = win.document.createElement('div');
      container.id = 'pip-root';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.backgroundColor = '#fffcef';
      win.document.body.appendChild(container);

      pipWinRef.current = win;
      setPipWindow(win);
      setPipContainer(container);
      setIsDocPipActive(true);

      // When PiP window is closed by user or OS
      win.addEventListener('pagehide', () => {
        pipWinRef.current = null;
        setPipWindow(null);
        setPipContainer(null);
        setIsDocPipActive(false);
      });

      return true;
    } catch (err) {
      console.warn('[PiP] Error opening Document PiP window:', err);
      // Fallback to in-page mini player if user denies permission or error occurs
      setIsInPageMiniActive(true);
      return false;
    }
  }, [isDocPipSupported]);

  const toggleDocPip = useCallback(async () => {
    if (isDocPipActive) {
      closeDocPip();
    } else {
      await openDocPip();
    }
  }, [isDocPipActive, closeDocPip, openDocPip]);

  const toggleInPageMini = useCallback(() => {
    setIsInPageMiniActive((prev) => !prev);
  }, []);

  const togglePillMode = useCallback(() => {
    setIsPillMode((prev) => !prev);
  }, []);

  const focusMainWindow = useCallback(() => {
    window.focus();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipWinRef.current && !pipWinRef.current.closed) {
        pipWinRef.current.close();
      }
    };
  }, []);

  return {
    isDocPipSupported,
    isDocPipActive,
    pipWindow,
    pipContainer,
    isInPageMiniActive,
    isPillMode,
    openDocPip,
    closeDocPip,
    toggleDocPip,
    setIsInPageMiniActive,
    toggleInPageMini,
    setIsPillMode,
    togglePillMode,
    focusMainWindow,
  };
}
