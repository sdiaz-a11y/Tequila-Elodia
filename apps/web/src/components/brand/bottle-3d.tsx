'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';

export const BOTTLE_MODEL = '/brand/elodia-botella-3d.glb';

function Bottle() {
  const { scene } = useGLTF(BOTTLE_MODEL);
  // The model is 1 unit tall, standing on y = 0; centre it so it turns about its own axis.
  return <primitive object={scene} position={[0, -0.5, 0]} />;
}

/** Studio reflections built in code (no HDR download): softboxes left and right, a warm top light and a gold rim. */
function Studio() {
  const L = (p: {
    position: [number, number, number];
    scale: [number, number, number];
    intensity: number;
    color: string;
  }) => <Lightformer form="rect" target={[0, 0, 0]} {...p} />;
  return (
    <Environment resolution={256} frames={1}>
      {/* front softbox: the gold artwork is metallic and needs something bright to reflect */}
      {L({ position: [0, 0.4, 4], scale: [5, 5, 1], intensity: 2.2, color: '#fff4e0' })}
      {/* tall strips at the sides give the glass its bright edges */}
      {L({ position: [-3.2, 0.3, 1.2], scale: [0.9, 5, 1], intensity: 7, color: '#ffffff' })}
      {L({ position: [3.2, 0.3, 1.2], scale: [0.9, 5, 1], intensity: 7, color: '#ffffff' })}
      {/* warm top light and a gold rim from behind */}
      {L({ position: [0, 4, 0.5], scale: [5, 1.6, 1], intensity: 3, color: '#ffd9a0' })}
      {L({ position: [0, 0.3, -4], scale: [6, 4, 1], intensity: 3.5, color: '#d4a85f' })}
    </Environment>
  );
}

/** The ELODIA bottle, turning slowly on a transparent background. Drag to spin it by hand. */
export default function Bottle3D({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.55], fov: 30 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      aria-hidden
    >
      <Studio />
      <ambientLight intensity={0.35} />
      <Bottle />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        autoRotate={!reducedMotion}
        autoRotateSpeed={2.2}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}

useGLTF.preload(BOTTLE_MODEL);
