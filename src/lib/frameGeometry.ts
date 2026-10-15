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
  const { halfW, halfH } = frameExtents(d);
  const span = Math.min(halfW, halfH);
  const thickness = Math.min(0.11 + d.depth * 0.48, span * 0.55);
  const cornerR = Math.min(0.035 + d.depth * 0.1, span * 0.14, thickness * 0.55);
  // wide, shallow roll so the glaze slope is visible straight-on
  const lip = Math.min(0.055 + d.depth * 0.18, span * 0.2);
  const recess = Math.min(lip * 0.85, thickness * 0.58);
  const meshZ = 0.004;
  const frontZ = meshZ + thickness;
  // just under the inner lip, so the glaze overlaps the print
  const photoZ = meshZ + thickness - recess - 0.006;
  return { thickness, cornerR, lip, recess, meshZ, photoZ, frontZ };
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

/** outward normals of a CCW ring */
function ringNormals(pts: THREE.Vector2[]): THREE.Vector2[] {
  const n = pts.length;
  const normals: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    normals.push(new THREE.Vector2(dy / len, -dx / len));
  }
  return normals;
}

function offsetRing(pts: THREE.Vector2[], amount: number): THREE.Vector2[] {
  const normals = ringNormals(pts);
  return pts.map((p, i) => new THREE.Vector2(p.x + normals[i].x * amount, p.y + normals[i].y * amount));
}

/**
 * Pillow of clay with a quarter-round well around each photo.
 * The well starts wide on the front face and rolls down onto the print.
 */
export function buildFrameGeometry(d: Design): THREE.BufferGeometry {
  const { thickness, cornerR, lip: lipBase, recess } = frameDims(d);
  const outline = outlinePoints(d, 160);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const addRing = (pts: THREE.Vector2[], z: number, shade: number) =>
    pts.map((p) => {
      const i = positions.length / 3;
      positions.push(p.x, p.y, z);
      colors.push(shade, shade, shade);
      return i;
    });

  // lower ring -> higher ring. reverse = face the other way (into a well)
  const addStrip = (a: number[], b: number[], reverse: boolean) => {
    const n = a.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (!reverse) indices.push(a[i], a[j], b[j], a[i], b[j], b[i]);
      else indices.push(a[i], b[i], b[j], a[i], b[j], a[j]);
    }
  };

  // --- outer pillow: flat against the wall, quarter-round at the front edge ---
  const OUTER = 16;
  const outer: number[][] = [];
  for (let s = 0; s <= OUTER; s++) {
    const u = s / OUTER;
    const side = 0.58;
    let z: number;
    let inset: number;
    if (u <= side) {
      z = (u / side) * (thickness - cornerR);
      inset = 0;
    } else {
      const a = ((u - side) / (1 - side)) * (Math.PI / 2);
      z = thickness - cornerR + cornerR * Math.sin(a);
      inset = cornerR * (1 - Math.cos(a));
    }
    const shade = 0.78 + 0.22 * u;
    outer.push(addRing(offsetRing(outline, -inset), z, shade));
  }
  for (let s = 0; s < OUTER; s++) addStrip(outer[s], outer[s + 1], false);

  // --- wells: quarter-ellipse from the print up to the front face ---
  const WELL = 14;
  const wells: { front: number[]; frontPts: THREE.Vector2[] }[] = [];
  for (let p = 0; p < d.photoCount; p++) {
    const slot = d.photos[p];
    const { cx, cy, hw, hh } = windowRect(d, slot);
    const lip = Math.min(lipBase, Math.min(hw, hh) * 0.48);
    const overlap = Math.min(0.016, Math.min(hw, hh) * 0.08);
    const base = windowPoints(slot.shape, hw, hh, 72).map(
      (pt) => new THREE.Vector2(pt.x + cx, pt.y + cy)
    );
    const rings: number[][] = [];
    let frontPts: THREE.Vector2[] = base;
    for (let s = 0; s <= WELL; s++) {
      const a = (s / WELL) * (Math.PI / 2);
      const radial = -overlap + (lip + overlap) * (1 - Math.cos(a));
      const z = thickness - recess + recess * Math.sin(a);
      const shade = 0.78 + 0.22 * Math.sin(a);
      const pts = offsetRing(base, radial);
      rings.push(addRing(pts, z, shade));
      if (s === WELL) frontPts = pts;
    }
    for (let s = 0; s < WELL; s++) addStrip(rings[s], rings[s + 1], true);
    wells.push({ front: rings[WELL], frontPts });
  }

  // --- front face, holes matching the top of each well ---
  const frontIdx = outer[OUTER];
  const contour = frontIdx.map((i) => new THREE.Vector2(positions[i * 3], positions[i * 3 + 1]));
  const indexMap = [...frontIdx];
  const holePts = wells.map((w) => {
    const reversed = w.front.slice().reverse();
    indexMap.push(...reversed);
    return reversed.map((i) => new THREE.Vector2(positions[i * 3], positions[i * 3 + 1]));
  });
  const faces = THREE.ShapeUtils.triangulateShape(contour, holePts);
  for (const [a, b, c] of faces) indices.push(indexMap[a], indexMap[b], indexMap[c]);

  // back cap, facing the wall
  const backIdx = outer[0];
  const backContour = backIdx.map((i) => new THREE.Vector2(positions[i * 3], positions[i * 3 + 1]));
  const backFaces = THREE.ShapeUtils.triangulateShape(backContour, []);
  for (const [a, b, c] of backFaces) indices.push(backIdx[c], backIdx[b], backIdx[a]);

  let geo: THREE.BufferGeometry = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo = mergeVertices(geo, 1e-5);
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
