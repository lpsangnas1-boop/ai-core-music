import type {
  PlayerState,
  QueueItem,
  PlaylistItem,
  JukeboxSettings,
  NetworkInfo,
  VideoMetadata,
  RequestHistoryItem,
  VoteSkipState,
  SearchResultItem,
} from '../types/index.js';
const API_BASE = '/api';

/** Fired when a request carrying the stored admin PIN is rejected (PIN changed or wrong). */
export const ADMIN_UNAUTHORIZED_EVENT = 'jukebox:admin-unauthorized';

// The admin PIN is sent only when a caller passes it explicitly (admin actions),
// never implicitly on every request.
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  adminPin?: string
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const effectivePin = adminPin;
  if (effectivePin) {
    headers.set('x-admin-pin', effectivePin);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body, e.g. a tunnel error page when the server is down
  }

  // The server accepted the request but ignored a stale PIN (e.g. a song order)
  if (data?.adminPinRejected && effectivePin) {
    window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
  }

  if (!response.ok || !data || data.success === false) {
    if (response.status === 401 && effectivePin) {
      window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
    }
    const fallback =
      response.status >= 502 && response.status <= 504
        ? 'Không kết nối được tới máy chủ nhạc. Vui lòng thử lại sau.'
        : `Request failed with status ${response.status}`;
    throw new Error(data?.error || data?.message || fallback);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Network
  getNetworkInfo: () => request<NetworkInfo>('/network'),

  // Metadata
  getMetadata: (url: string) =>
    request<VideoMetadata>(`/metadata?url=${encodeURIComponent(url)}`),

  // Player
  getPlayerState: () => request<PlayerState>('/player'),
  startJukebox: (adminPin?: string) =>
    request<PlayerState>('/player/start', { method: 'POST' }, adminPin),
  play: (adminPin?: string) =>
    request<PlayerState>('/player/play', { method: 'POST' }, adminPin),
  pause: (adminPin?: string) =>
    request<PlayerState>('/player/pause', { method: 'POST' }, adminPin),
  next: (adminPin?: string) =>
    request<PlayerState>('/player/next', { method: 'POST' }, adminPin),
  getVoteSkip: (deviceId: string) =>
    request<VoteSkipState>(`/player/vote-skip?deviceId=${encodeURIComponent(deviceId)}`),
  voteSkip: (deviceId: string) =>
    request<VoteSkipState & { skipped: boolean }>('/player/vote-skip', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    }),
  previous: (adminPin?: string) =>
    request<PlayerState>('/player/previous', { method: 'POST' }, adminPin),
  seek: (time: number, adminPin?: string) =>
    request<PlayerState>('/player/seek', { method: 'POST', body: JSON.stringify({ time }) }, adminPin),
  setVolume: (volume: number, isMuted: boolean, adminPin?: string) =>
    request<PlayerState>(
      '/player/volume',
      { method: 'POST', body: JSON.stringify({ volume, isMuted }) },
      adminPin
    ),
  playNow: (url: string, adminPin?: string) =>
    request<PlayerState>('/player/play-now', { method: 'POST', body: JSON.stringify({ url }) }, adminPin),

  // Queue
  getQueue: () => request<QueueItem[]>('/queue'),
  searchYouTube: (query: string) =>
    request<SearchResultItem[]>(`/queue/search?q=${encodeURIComponent(query)}`),
  getRequestHistory: (limit = 1000) => request<RequestHistoryItem[]>(`/queue/history?limit=${limit}`),
  canRequest: (deviceId: string) =>
    request<{ allowed: boolean; reason?: string; retryAfter?: number }>(
      `/queue/can-request?deviceId=${encodeURIComponent(deviceId)}`
    ),
  requestSong: (url: string, requesterName: string, deviceId: string, adminPin?: string, shoutout?: string) =>
    request<{ item: QueueItem; position: number; message: string }>(
      '/queue',
      {
        method: 'POST',
        body: JSON.stringify({ url, requesterName, deviceId, shoutout }),
      },
      adminPin
    ),
  removeQueueItem: (id: string, adminPin: string) =>
    request<{ message: string }>(`/queue/${id}`, { method: 'DELETE' }, adminPin),
  playNextQueueItem: (id: string, adminPin: string) =>
    request<QueueItem[]>(`/queue/${id}/play-next`, { method: 'POST' }, adminPin),
  reorderQueue: (orderedIds: string[], adminPin: string) =>
    request<QueueItem[]>(
      '/queue/reorder',
      { method: 'PATCH', body: JSON.stringify({ orderedIds }) },
      adminPin
    ),
  clearQueue: (adminPin: string) =>
    request<{ message: string }>('/queue', { method: 'DELETE' }, adminPin),

  // Playlist
  getPlaylist: () => request<PlaylistItem[]>('/playlist'),
  addPlaylistSong: (url: string, adminPin: string) =>
    request<PlaylistItem>('/playlist', { method: 'POST', body: JSON.stringify({ url }) }, adminPin),
  removePlaylistSong: (id: string, adminPin: string) =>
    request<{ message: string }>(`/playlist/${id}`, { method: 'DELETE' }, adminPin),
  togglePlaylistSong: (id: string, isEnabled: boolean, adminPin: string) =>
    request<{ message: string }>(
      `/playlist/${id}/toggle`,
      { method: 'PATCH', body: JSON.stringify({ isEnabled }) },
      adminPin
    ),
  reorderPlaylist: (orderedIds: string[], adminPin: string) =>
    request<PlaylistItem[]>(
      '/playlist/reorder',
      { method: 'PATCH', body: JSON.stringify({ orderedIds }) },
      adminPin
    ),

  // Settings
  getSettings: () => request<JukeboxSettings>('/settings'),
  updateSettings: (settings: Partial<JukeboxSettings>, adminPin: string) =>
    request<JukeboxSettings>(
      '/settings',
      { method: 'PATCH', body: JSON.stringify(settings) },
      adminPin
    ),

  // Auth
  verifyStoredPin: (pin: string) =>
    request<{ success: boolean; isAdmin: boolean }>('/admin/verify', {}, pin),
  verifyAdmin: (pin: string) =>
    request<{ success: boolean; message?: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  // History
  getHistory: (limit: number = 50, adminPin: string) =>
    request<RequestHistoryItem[]>(`/history?limit=${limit}`, {}, adminPin),
};
