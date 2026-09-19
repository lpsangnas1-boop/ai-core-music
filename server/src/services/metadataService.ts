import type { VideoMetadata, SearchResultItem } from '../types/shared.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const searchCache = new Map<string, CacheEntry<SearchResultItem[]>>();
const metadataCache = new Map<string, CacheEntry<VideoMetadata>>();

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();

  // If it's already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL patterns
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function fetchYouTubeMetadata(urlOrId: string): Promise<VideoMetadata> {
  const youtubeId = extractYouTubeId(urlOrId);

  if (!youtubeId) {
    throw new Error('Invalid YouTube URL or Video ID');
  }

  const cached = getFromCache(metadataCache, youtubeId);
  if (cached) {
    return cached;
  }

  const standardUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`;

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OfficeJukebox/1.0',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('YouTube video not found or is private');
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('YouTube video embedding is restricted by owner');
      }
      throw new Error(`YouTube metadata error (status ${response.status})`);
    }

    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    const title = (data.title || 'YouTube Video').trim();
    const channel = (data.author_name || 'Unknown Artist').trim();
    const thumbnail =
      data.thumbnail_url || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

    const metadata: VideoMetadata = {
      youtubeId,
      title,
      channel,
      thumbnail,
      duration: 0, // YouTube IFrame Player will provide accurate duration on playback
      url: standardUrl,
    };

    setInCache(metadataCache, youtubeId, metadata);
    return metadata;
  } catch (err: any) {
    if (err.message && err.message.includes('YouTube')) {
      throw err;
    }
    // If oEmbed request timed out or network glitch, provide fallback if valid ID
    console.warn(`[Metadata] oEmbed lookup fallback for ${youtubeId}:`, err.message);
    const fallbackMetadata: VideoMetadata = {
      youtubeId,
      title: `YouTube Video (${youtubeId})`,
      channel: 'YouTube Artist',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      duration: 0,
      url: standardUrl,
    };
    return fallbackMetadata;
  }
}

export async function searchYouTube(query: string): Promise<SearchResultItem[]> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();
  const cached = getFromCache(searchCache, cacheKey);
  if (cached) {
    return cached;
  }

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData = ({.*?});/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const results: SearchResultItem[] = [];
    for (const item of contents) {
      const vr = item.videoRenderer;
      if (vr && vr.videoId && vr.title?.runs?.[0]?.text) {
        results.push({
          youtubeId: vr.videoId,
          title: vr.title.runs[0].text,
          channel: vr.ownerText?.runs?.[0]?.text || '',
          thumbnail:
            vr.thumbnail?.thumbnails?.[0]?.url ||
            `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`,
          durationText: vr.lengthText?.simpleText || '',
        });
        if (results.length >= 6) break;
      }
    }
    setInCache(searchCache, cacheKey, results);
    return results;
  } catch (err: any) {
    console.warn('[Metadata] searchYouTube error:', err.message);
    return [];
  }
}
