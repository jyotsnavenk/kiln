import { useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { buildFrameGeometry, frameDims, geometryKey } from '../lib/frameGeometry';
import { makeGlazeMaterial, materialKey } from '../lib/glaze';

export function FrameMesh() {
  const design = useStore((s) => s.design);

  const geoKey = geometryKey(design);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => buildFrameGeometry(design), [geoKey]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const matKey = materialKey(design);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => makeGlazeMaterial(design), [matKey]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material]
  );

  const { meshZ } = frameDims(design);

  return (
    <mesh geometry={geometry} material={material} position-z={meshZ} castShadow receiveShadow />
  );
}
