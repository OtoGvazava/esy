// A logo's main colour, picked in the browser (store plan, Phase 5): no
// server work, nothing uploaded. The image is drawn at 32 × 32 on a canvas;
// transparent, near-black and near-white pixels are skipped (they are the
// ground and the outline, not the brand), the rest are sorted into coarse
// colour buckets weighted by saturation, and the heaviest bucket's average is
// the answer. A bucket rather than one average keeps a two-colour mark from
// turning into the muddy colour between them.

const SIZE = 32;

/**
 * @param {string} src an image URL the page may read back (an object URL of
 *   the chosen file); a cross-origin image would taint the canvas
 * @returns {Promise<string|null>} `#rrggbb`, or null for an image with no
 *   colour to speak of (a black mark on white) or one that cannot be read
 */
export function logoColour(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const px = ctx.getImageData(0, 0, SIZE, SIZE).data;
        const buckets = new Map();
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 128) continue;
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          const hi = Math.max(r, g, b);
          const lo = Math.min(r, g, b);
          if (hi < 35 || lo > 225) continue;
          const sat = hi ? (hi - lo) / hi : 0;
          const w = 0.15 + sat * sat;
          // 4 bits a channel: close shades share a bucket.
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const acc = buckets.get(key) || { r: 0, g: 0, b: 0, w: 0 };
          acc.r += r * w;
          acc.g += g * w;
          acc.b += b * w;
          acc.w += w;
          buckets.set(key, acc);
        }
        let best = null;
        buckets.forEach((acc) => { if (!best || acc.w > best.w) best = acc; });
        if (!best) { resolve(null); return; }
        const hex = (v) => Math.round(v / best.w).toString(16).padStart(2, '0');
        resolve(`#${hex(best.r)}${hex(best.g)}${hex(best.b)}`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
