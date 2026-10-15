import { useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
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
      <meshStandardMaterial color={wallColor} roughness={0.96} metalness={0} />
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

export function Scene() {
  const photoCount = useStore((s) => s.design.photoCount);
  const setUi = useStore((s) => s.setUi);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: 30, position: [0, 0, 7.2], near: 0.1, far: 100 }}
      onPointerMissed={() => setUi({ selected: -1 })}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[2.6, 3.8, 5.5]}
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-radius={14}
        shadow-bias={-0.0004}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <directionalLight position={[-4, 0.5, 3.5]} intensity={0.55} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 4, 4]} scale={[6, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} position={[-5, 1, 3]} scale={[3, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} position={[5, -1, 2]} scale={[3, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={1.4} position={[1.5, 2.5, 6]} scale={2.4} target={[0, 0, 0]} />
      </Environment>

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
