import * as THREE from 'three';
import type { Design } from '../store';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

const SIZE = 1024;

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return [c, c.getContext('2d')!];
}

function speckleTexture(d: Design): HTMLCanvasElement {
  const [c, ctx] = makeCanvas();
  const rand = mulberry32(Math.floor(d.seed * 997) + 11);
  ctx.fillStyle = d.glazeColor;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const count = Math.floor(60 + d.speckle * 900);
  const baseR = 6 + d.speckleSize * 26;
  const accent = new THREE.Color(d.accentColor);
  for (let i = 0; i < count; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = baseR * (0.55 + rand() * 0.75);
    const col = accent.clone();
    col.offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.15, (rand() - 0.5) * 0.14);
    const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, `#${col.getHexString()}`);
    g.addColorStop(0.75, `#${col.getHexString()}e8`);
    g.addColorStop(1, `#${col.getHexString()}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function crackleTexture(d: Design): HTMLCanvasElement {
  const [c, ctx] = makeCanvas();
  const rand = mulberry32(Math.floor(d.seed * 499) + 3);
  ctx.fillStyle = d.glazeColor;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const crackColor = shade(d.glazeColor, -0.28);
  ctx.strokeStyle = crackColor;
  ctx.globalAlpha = 0.5;
  const lines = Math.floor(30 + d.speckle * 90);
  for (let i = 0; i < lines; i++) {
    let x = rand() * SIZE;
    let y = rand() * SIZE;
    let ang = rand() * Math.PI * 2;
    ctx.lineWidth = 0.8 + rand() * (1 + d.speckleSize * 2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 6 + Math.floor(rand() * 10);
    for (let s = 0; s < segs; s++) {
      ang += (rand() - 0.5) * 1.4;
      const len = 18 + rand() * 50;
      x += Math.cos(ang) * len;
      y += Math.sin(ang) * len;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

function twotoneTexture(d: Design): HTMLCanvasElement {
  const [c, ctx] = makeCanvas();
  const rand = mulberry32(Math.floor(d.seed * 211) + 29);
  ctx.fillStyle = d.glazeColor;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // wavy drip boundary; accent occupies the top portion
  const boundary = SIZE * (0.38 + d.speckle * 0.3);
  const harmonic = [1, 2, 3].map(() => ({
    amp: (12 + rand() * 46) * (0.5 + d.speckleSize),
    freq: 1 + rand() * 4,
    phase: rand() * Math.PI * 2,
  }));
  ctx.fillStyle = d.accentColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(SIZE, 0);
  for (let x = SIZE; x >= 0; x -= 4) {
    let y = boundary;
    for (const h of harmonic) y += h.amp * Math.sin((x / SIZE) * Math.PI * 2 * h.freq + h.phase);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // drips
  const drips = 4 + Math.floor(rand() * 6);
  for (let i = 0; i < drips; i++) {
    const x = rand() * SIZE;
    const w = 10 + rand() * 26;
    const len = 40 + rand() * 170;
    ctx.beginPath();
    ctx.ellipse(x, boundary + len, w / 2, len, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function makeGlazeTexture(d: Design): HTMLCanvasElement | null {
  switch (d.finish) {
    case 'speckle':
      return speckleTexture(d);
    case 'crackle':
      return crackleTexture(d);
    case 'twotone':
      return twotoneTexture(d);
    default:
      return null;
  }
}

export function makeGlazeMaterial(d: Design): THREE.MeshPhysicalMaterial {
  const canvas = makeGlazeTexture(d);
  let map: THREE.CanvasTexture | null = null;
  if (canvas) {
    map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
  }

  const matte = d.finish === 'matte';
  const gloss = matte ? d.gloss * 0.25 : d.gloss;

  return new THREE.MeshPhysicalMaterial({
    color: map ? '#ffffff' : d.glazeColor,
    map: map ?? undefined,
    roughness: matte ? 0.85 : 1 - gloss * 0.82,
    clearcoat: matte ? 0 : gloss,
    clearcoatRoughness: 0.32 - gloss * 0.22,
    envMapIntensity: matte ? 0.35 : 0.5 + gloss * 0.7,
    sheen: matte ? 0.4 : 0,
    sheenColor: new THREE.Color(d.glazeColor),
  });
}

/** key of design props affecting the material */
export function materialKey(d: Design): string {
  return [
    d.finish,
    d.glazeColor,
    d.accentColor,
    d.gloss.toFixed(3),
    d.speckle.toFixed(3),
    d.speckleSize.toFixed(3),
    d.seed,
  ].join('§');
}
