import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useStore, type Design } from '../store';
import { frameDims, frameExtents, windowPoints, windowRect } from '../lib/frameGeometry';
import { loadFiltered, placeholderCanvas } from '../lib/imageFilters';

/** shared drag state between PhotoPlane and DragCatcher */
export const dragState = { index: -1, offX: 0, offY: 0 };

export function PhotoPlane({ index }: { index: number }) {
  const design = useStore((s) => s.design);
  const selected = useStore((s) => s.selected);
  const showHandles = useStore((s) => s.showHandles);
  const commit = useStore((s) => s.commit);
  const setUi = useStore((s) => s.setUi);

  const slot = design.photos[index];
  const { cx, cy, hw, hh } = windowRect(design, slot);
  const { photoZ } = frameDims(design);

  // --- texture ---
  const [canvas, setCanvas] = useState<HTMLCanvasElement>(() => placeholderCanvas());
  useEffect(() => {
    let alive = true;
    if (!slot.src) {
      setCanvas(placeholderCanvas());
      return;
    }
    loadFiltered(slot.src, slot.filter).then((c) => {
      if (alive) setCanvas(c);
    });
    return () => {
      alive = false;
    };
  }, [slot.src, slot.filter]);

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);

  // cover-fit crop
  useEffect(() => {
    const ia = canvas.width / canvas.height;
    const wa = hw / hh;
    let rx = 1;
    let ry = 1;
    if (ia > wa) rx = wa / ia;
    else ry = ia / wa;
    texture.repeat.set(rx, ry);
    texture.offset.set((1 - rx) / 2, (1 - ry) / 2);
    texture.needsUpdate = true;
  }, [canvas, texture, hw, hh]);

  // exact window; the ceramic lip overlaps the print
  const geometry = useMemo(() => {
    const pts = windowPoints(slot.shape, hw, hh);
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
    const pos = geo.getAttribute('position');
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + hw) / (hw * 2);
      uv[i * 2 + 1] = (pos.getY(i) + hh) / (hh * 2);
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  }, [slot.shape, hw, hh]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!showHandles) return;
    e.stopPropagation();
    setUi({ selected: index, dragging: true });
    commit();
    dragState.index = index;
    dragState.offX = e.point.x - cx;
    dragState.offY = e.point.y - cy;
  };

  const isSelected = selected === index && showHandles;
  const ringR = Math.max(hw, hh) * 1.3;

  return (
    <group position={[cx, cy, photoZ]}>
      <mesh geometry={geometry} onPointerDown={onPointerDown} receiveShadow>
        <meshStandardMaterial map={texture} roughness={0.82} metalness={0} envMapIntensity={0.25} />
      </mesh>
      {isSelected && (
        <group name="handle">
          <mesh position-z={0.02}>
            <ringGeometry args={[ringR, ringR + 0.006, 80]} />
            <meshBasicMaterial color="#1c1c1c" transparent opacity={0.65} />
          </mesh>
          <mesh position-z={0.02}>
            <circleGeometry args={[0.022, 24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position-z={0.019}>
            <circleGeometry args={[0.028, 24]} />
            <meshBasicMaterial color="#1c1c1c" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** invisible plane that captures pointer moves while dragging a photo */
export function DragCatcher() {
  const dragging = useStore((s) => s.dragging);
  const design = useStore((s) => s.design);
  const setPhoto = useStore((s) => s.setPhoto);
  const setUi = useStore((s) => s.setUi);
  const { photoZ } = frameDims(design);

  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      dragState.index = -1;
      setUi({ dragging: false });
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [dragging, setUi]);

  if (!dragging) return null;

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const i = dragState.index;
    if (i < 0) return;
    const slot = design.photos[i];
    const { hw, hh } = windowRect(design, slot);
    const ext = windowExtents(design, hw, hh);
    const nx = clamp((e.point.x - dragState.offX) / ext.x, -1, 1);
    const ny = clamp((e.point.y - dragState.offY) / ext.y, -1, 1);
    setPhoto(i, { x: nx, y: ny });
  };

  return (
    <mesh position-z={photoZ + 0.001} onPointerMove={onMove} visible={false}>
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial />
    </mesh>
  );
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function windowExtents(design: Design, hw: number, hh: number) {
  const { halfW, halfH } = frameExtents(design);
  return { x: (halfW - hw) * 0.72 || 1e-6, y: (halfH - hh) * 0.72 || 1e-6 };
}
