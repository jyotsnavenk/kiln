import { useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, SoftShadows } from '@react-three/drei';
import { useStore } from '../store';
import { FrameMesh } from './FrameMesh';
import { PhotoPlane, DragCatcher } from './PhotoPlane';
import { exportHandle, type ExportFormat } from '../lib/export';

function Wall() {
  const wallColor = useStore((s) => s.design.wallColor);
  return (
    <mesh
      receiveShadow
      onPointerDown={
        import.meta.env.DEV
          ? (e) => {
              (window as unknown as Record<string, unknown>).__lastPoint = [e.point.x, e.point.y];
            }
          : undefined
      }
    >
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color={wallColor} roughness={0.97} metalness={0} />
    </mesh>
  );
}

function ExportBridge() {
  const { gl, scene, camera, size, viewport } = useThree();

  useEffect(() => {
    exportHandle.current = (w: number, h: number, format: ExportFormat) => {
      const cam = camera as THREE.PerspectiveCamera;
      const prevPR = gl.getPixelRatio();
      const prevAspect = cam.aspect;

      // hide selection handles during export
      const handles: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.name === 'handle' && o.visible) {
          handles.push(o);
          o.visible = false;
        }
      });

      gl.setPixelRatio(1);
      gl.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      gl.render(scene, camera);
      const url =
        format === 'jpg'
          ? gl.domElement.toDataURL('image/jpeg', 0.93)
          : gl.domElement.toDataURL('image/png');

      // restore
      handles.forEach((o) => (o.visible = true));
      gl.setPixelRatio(prevPR);
      gl.setSize(size.width, size.height, false);
      cam.aspect = prevAspect;
      cam.updateProjectionMatrix();
      gl.render(scene, camera);
      return url;
    };
    return () => {
      exportHandle.current = null;
    };
  }, [gl, scene, camera, size, viewport]);

  return null;
}

function lightPosition(angle: number, height: number, distance: number): [number, number, number] {
  const az = ((angle ?? 72) * Math.PI) / 180;
  const elev = 0.18 + (height ?? 0.5) * 1.15;
  const dist = distance ?? 7;
  const x = Math.cos(az) * Math.cos(elev);
  const y = Math.sin(az) * Math.cos(elev);
  const z = Math.sin(elev);
  return [x * dist, y * dist, z * dist];
}

function Lights() {
  const angle = useStore((s) => s.design.lightAngle);
  const height = useStore((s) => s.design.lightHeight);
  const distance = useStore((s) => s.design.lightDistance);
  const dist = Math.max(2.4, distance ?? 7);
  const [x, y, z] = lightPosition(angle, height, dist);
  // closer lamp reads hotter; farther stays visible but flatter
  const power = 78 * Math.pow(dist / 7, 1.25);
  const cone = Math.min(1.15, Math.atan(2.6 / dist) * 1.7);
  const quant = `${Math.round((angle ?? 72) / 15)}-${Math.round((height ?? 0.5) * 6)}-${Math.round(dist)}`;

  return (
    <>
      <SoftShadows size={22} samples={16} focus={0.55} />
      <ambientLight color="#4a3222" intensity={0.2} />
      <spotLight
        color="#ffe2b8"
        position={[x, y, z]}
        angle={cone}
        penumbra={0.82}
        intensity={power}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.02}
        shadow-camera-near={0.3}
        shadow-camera-far={dist + 8}
      />
      <pointLight color="#c47840" position={[-x * 0.45, -y * 0.45, 3.2]} intensity={2.2} distance={14} decay={2} />
      <Environment key={quant} resolution={256} frames={1}>
        <Lightformer form="rect" color="#ffe6c0" intensity={1.15} position={[x * 0.55, y * 0.55, Math.max(2.2, z * 0.7)]} scale={[3.2, 1.6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" color="#ffb060" intensity={0.35} position={[-x * 0.4, -y * 0.25, 2.8]} scale={[2.2, 3.2, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" color="#ffd9a0" intensity={0.7} position={[x * 0.25, y * 0.25, 5.4]} scale={1.6} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

export function Scene() {
  const photoCount = useStore((s) => s.design.photoCount);
  const setUi = useStore((s) => s.setUi);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.92,
      }}
      camera={{ fov: 30, position: [0, 0, 7.2], near: 0.1, far: 100 }}
      onPointerMissed={() => setUi({ selected: -1 })}
    >
      <Lights />

      <Wall />
      <FrameMesh />
      {Array.from({ length: photoCount }, (_, i) => (
        <PhotoPlane key={i} index={i} />
      ))}
      <DragCatcher />
      <ExportBridge />
    </Canvas>
  );
}
