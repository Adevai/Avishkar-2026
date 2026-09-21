import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

const Tree = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.elapsedTime;
      lightRef.current.position.x = Math.sin(t) * 2;
      lightRef.current.position.y = Math.cos(t) * 1;
    }
  });

  return (
    <group>
      <pointLight ref={lightRef as any} color="#60a5fa" intensity={5} distance={3} />
      {[
        [-2, -1, 0], [0, 0, 0], [2, 1, 0]
      ].map((pos, i) => (
        <Sphere key={i} position={pos as any} args={[0.2, 32, 32]}>
          <meshStandardMaterial color="#f8fafc" metalness={0.8} roughness={0.2} />
        </Sphere>
      ))}
      <Line points={[[-2, -1, 0], [0, 0, 0], [2, 1, 0]]} color="#94a3b8" lineWidth={3} />
    </group>
  );
};

export const SkillTree3D = () => (
  <div className="w-full h-[300px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
    <Canvas camera={{ position: [0, 0, 4] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 5, 5]} intensity={1} />
      <Tree />
      <OrbitControls enableZoom={false} />
    </Canvas>
  </div>
);
