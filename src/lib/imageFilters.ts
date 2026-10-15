import type { PhotoFilter } from '../store';

const MAX = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** loads an image and bakes the chosen filter into a canvas */
export async function loadFiltered(src: string, filter: PhotoFilter): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  if (filter === 'original') return canvas;

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  if (filter === 'bw') {
    for (let i = 0; i < px.length; i += 4) {
      let g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      // gentle s-curve contrast
      g = 255 / (1 + Math.exp(-(g - 128) / 46));
      px[i] = px[i + 1] = px[i + 2] = g;
    }
  } else if (filter === 'vintage') {
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    let i = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        // sepia matrix
        let nr = 0.393 * r + 0.769 * g + 0.189 * b;
        let ng = 0.349 * r + 0.686 * g + 0.168 * b;
        let nb = 0.272 * r + 0.534 * g + 0.131 * b;
        // lift blacks, compress highlights
        nr = nr * 0.82 + 28;
        ng = ng * 0.82 + 24;
        nb = nb * 0.82 + 20;
        // vignette
        const dx = x - cx;
        const dy = y - cy;
        const v = 1 - 0.38 * Math.pow(Math.sqrt(dx * dx + dy * dy) / maxDist, 2.2);
        nr *= v;
        ng *= v;
        nb *= v;
        // grain
        const n = (Math.random() - 0.5) * 16;
        px[i] = Math.min(255, Math.max(0, nr + n));
        px[i + 1] = Math.min(255, Math.max(0, ng + n));
        px[i + 2] = Math.min(255, Math.max(0, nb + n));
      }
    }
  }

  ctx.putImageData(data, 0, 0);
  return canvas;
}

/** soft placeholder shown before an image is uploaded */
export function placeholderCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#8d8a83');
  g.addColorStop(1, '#6e6b64');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '500 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('upload a photo', 256, 256);
  return c;
}
