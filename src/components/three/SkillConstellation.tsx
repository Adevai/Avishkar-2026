import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

const Nodes = () => {
  const group = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={group}>
      <Sphere position={[0, 0, 0]} args={[0.3, 32, 32]}>
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
      </Sphere>
      <Text position={[0, -0.5, 0]} fontSize={0.2} color="#1e293b">Core</Text>
      
      {[
        [2, 1, 1], [-2, -1, 1], [1, 2, -1], [-1, -2, -1]
      ].map((pos, i) => (
        <group key={i} position={pos as any}>
          <Sphere args={[0.2, 16, 16]}>
            <meshStandardMaterial color="#8b5cf6" wireframe />
          </Sphere>
          <Text position={[0, -0.4, 0]} fontSize={0.15} color="#475569">Target {i}</Text>
          <Line points={[[0,0,0], [-pos[0], -pos[1], -pos[2]]]} color="#94a3b8" lineWidth={1} dashed />
        </group>
      ))}
    </group>
  );
};

export const SkillConstellation = () => (
  <div className="w-full h-[300px] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Nodes />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  </div>
);
