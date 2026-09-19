// Utility to extract vibrant ambient color from thumbnail or fallback deterministically

const RECESS_PALETTE = [
  '#25385b', // Twilight Navy
  '#1a2b88', // Cobalt Pop
  '#ff8a7a', // Coral Blush
  '#a2b0ff', // Soft Periwinkle
  '#7a8aff', // Vivid Periwinkle
  '#ff5a5a', // Peach Pink Glow
  '#4a55a2', // Sky Blue
  '#d67b93', // Rose Sunset
];

const colorCache = new Map<string, string>();

/**
 * Deterministically pick a Recess pastel color based on a string seed (e.g. youtubeId or title)
 */
export function getDeterministicColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % RECESS_PALETTE.length;
  return RECESS_PALETTE[index];
}

/**
 * Extracts dominant vibrant color from an image URL.
 * Falls back safely to deterministic color if CORS fails.
 */
export async function extractAmbientColor(imageUrl?: string, fallbackSeed = ''): Promise<string> {
  if (!imageUrl) {
    return getDeterministicColor(fallbackSeed);
  }

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    const fallback = () => {
      const color = getDeterministicColor(fallbackSeed || imageUrl);
      colorCache.set(imageUrl, color);
      resolve(color);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return fallback();
        }

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          // Filter out pure black or near white to get vibrant color
          const brightness = (pr * 299 + pg * 587 + pb * 114) / 1000;
          if (brightness > 35 && brightness < 235) {
            r += pr;
            g += pg;
            b += pb;
            count++;
          }
        }

        if (count === 0) {
          return fallback();
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        colorCache.set(imageUrl, hex);
        resolve(hex);
      } catch {
        fallback();
      }
    };

    img.onerror = () => {
      fallback();
    };
  });
}
