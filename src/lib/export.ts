export type ExportFormat = 'png' | 'jpg';

/** set from inside the r3f Canvas; renders at w x h and returns a dataURL */
export const exportHandle: {
  current: ((w: number, h: number, format: ExportFormat) => string) | null;
} = { current: null };

// expose for dev-tools debugging
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__export = exportHandle;
}

function dataURLToBlob(dataURL: string): Blob {
  const [head, body] = dataURL.split(',');
  const mime = head.match(/:(.*?);/)![1];
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function exportImage(format: ExportFormat, w: number, h: number) {
  if (!exportHandle.current) return;
  const url = exportHandle.current(w, h, format);
  const a = document.createElement('a');
  a.href = url;
  a.download = `frame-${w}x${h}.${format}`;
  a.click();
}

export async function copyImage(w: number, h: number) {
  if (!exportHandle.current) return;
  const url = exportHandle.current(w, h, 'png');
  const blob = dataURLToBlob(url);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
