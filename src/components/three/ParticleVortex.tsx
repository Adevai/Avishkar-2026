import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const Vortex = () => {
  const ref = useRef<THREE.Points>(null);
  const particlesPosition = useMemo(() => {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2 * Math.sqrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const y = (Math.random() - 0.5) * 4;
      positions[i * 3] = r * Math.cos(theta + y);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta + y);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Points ref={ref as any} positions={particlesPosition} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#3b82f6" size={0.05} sizeAttenuation={true} depthWrite={false} />
    </Points>
  );
};

export const ParticleVortex = () => (
  <div className="w-full h-[200px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner">
    <Canvas camera={{ position: [0, 0, 4] }}>
      <Vortex />
    </Canvas>
  </div>
);
