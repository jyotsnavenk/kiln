import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Design, PhotoShape, PhotoSlot } from '../store';

/** deterministic rng */
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function frameExtents(d: Design) {
  const halfW = d.frameScale * 1.05 * Math.sqrt(d.frameAspect);
  const halfH = (d.frameScale * 1.05) / Math.sqrt(d.frameAspect);
  return { halfW, halfH };
}

export function frameDims(d: Design) {
  const extrudeDepth = d.depth * 0.45;
  const bevelThickness = d.depth * 0.28;
  const bevelSize = Math.min(0.085 * d.frameScale, 0.11);
  // frame mesh is positioned so its back bevel touches the wall (z=0)
  const meshZ = bevelThickness + 0.005;
  const photoZ = meshZ + extrudeDepth * 0.45;
  const frontZ = meshZ + extrudeDepth + bevelThickness;
  return { extrudeDepth, bevelThickness, bevelSize, meshZ, photoZ, frontZ };
}

/** superellipse point for parameter t (0..2PI) */
function superPoint(t: number, halfW: number, halfH: number, n: number): [number, number] {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const e = 2 / n;
  return [
    halfW * Math.sign(c) * Math.pow(Math.abs(c), e),
    halfH * Math.sign(s) * Math.pow(Math.abs(s), e),
  ];
}

/** outer silhouette of the frame */
export function outlinePoints(d: Design, N = 192): THREE.Vector2[] {
  const { halfW, halfH } = frameExtents(d);
  const rand = mulberry32(Math.floor(d.seed * 1000) + 1);

  // base roundness exponent per shape, modulated by curviness (1 = round)
  const baseN = d.baseShape === 'square' ? 5.0 : d.baseShape === 'oval' ? 2.0 : 2.7;
  const n = Math.max(1.8, baseN * lerp(1.7, 0.72, d.curviness));

  // goop harmonics
  const harmonics: { k: number; amp: number; phase: number }[] = [];
  for (let k = 2; k <= 5; k++) {
    harmonics.push({ k, amp: (0.4 / k) * (0.4 + rand() * 0.6), phase: rand() * Math.PI * 2 });
  }
  // subtle hand-formed asymmetry, always on for pebble
  const asymAmp = d.baseShape === 'pebble' ? 0.05 : 0.02;
  const asymPhase = rand() * Math.PI * 2;

  // corner directions follow the actual rect diagonals
  const corners = [
    Math.atan2(halfH, halfW),
    Math.atan2(halfH, -halfW),
    Math.atan2(-halfH, -halfW),
    Math.atan2(-halfH, halfW),
  ];

  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const [x, y] = superPoint(t, halfW, halfH, n);

    let bump = 0;
    for (const c of corners) {
      const dd = angDiff(t, c);
      bump += 0.42 * Math.exp(-(dd * dd) / (2 * 0.3 * 0.3));
    }
    bump *= d.cornerExtend;

    let goop = asymAmp * Math.sin(t + asymPhase);
    for (const h of harmonics) {
      goop += d.goopiness * h.amp * Math.sin(h.k * t + h.phase);
    }

    const sc = 1 + bump + goop * 0.35;
    pts.push(new THREE.Vector2(x * sc, y * sc));
  }
  return pts;
}

/** window rect in frame-local coords for a photo slot */
export function windowRect(d: Design, slot: PhotoSlot) {
  const { halfW, halfH } = frameExtents(d);
  const m = Math.min(halfW, halfH);
  const isCircle = slot.shape === 'circle';
  const aspect = isCircle ? 1 : slot.aspect;
  const hw = slot.scale * 0.5 * m * Math.sqrt(aspect);
  const hh = (slot.scale * 0.5 * m) / Math.sqrt(aspect);
  const cx = slot.x * (halfW - hw) * 0.72;
  const cy = slot.y * (halfH - hh) * 0.72;
  return { cx, cy, hw, hh };
}

/** superellipse-based window outline */
export function windowPoints(shape: PhotoShape, hw: number, hh: number, N = 64): THREE.Vector2[] {
  let n: number;
  switch (shape) {
    case 'rect':
      n = 14;
      break;
    case 'rounded':
      n = 4;
      break;
    default:
      n = 2; // oval & circle
  }
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const [x, y] = superPoint(t, hw, hh, n);
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}

function setPlanarUVs(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const sizeX = bb.max.x - bb.min.x || 1;
  const sizeY = bb.max.y - bb.min.y || 1;
  const size = Math.max(sizeX, sizeY);
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bb.min.x) / size;
    uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / size;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function buildFrameGeometry(d: Design): THREE.BufferGeometry {
  const shape = new THREE.Shape(outlinePoints(d));

  for (let i = 0; i < d.photoCount; i++) {
    const slot = d.photos[i];
    const { cx, cy, hw, hh } = windowRect(d, slot);
    const pts = windowPoints(slot.shape, hw, hh).map((p) => new THREE.Vector2(p.x + cx, p.y + cy));
    const hole = new THREE.Path(pts);
    shape.holes.push(hole);
  }

  const { extrudeDepth, bevelThickness, bevelSize } = frameDims(d);
  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelOffset: 0,
    bevelSegments: 9,
    steps: 1,
    curveSegments: 4,
  });

  // smooth the pillowy ceramic surface
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  geo = mergeVertices(geo, 1e-4);
  geo.computeVertexNormals();
  setPlanarUVs(geo);
  return geo;
}

/** key of all design props that affect geometry, for memoization */
export function geometryKey(d: Design): string {
  const photoKey = d.photos
    .slice(0, d.photoCount)
    .map((p) => [p.x.toFixed(3), p.y.toFixed(3), p.scale.toFixed(3), p.aspect.toFixed(3), p.shape].join(','))
    .join('|');
  return [
    d.baseShape,
    d.frameAspect.toFixed(3),
    d.cornerExtend.toFixed(3),
    d.goopiness.toFixed(3),
    d.curviness.toFixed(3),
    d.depth.toFixed(3),
    d.frameScale.toFixed(3),
    d.seed,
    d.photoCount,
    photoKey,
  ].join('§');
}
