import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const Brain = ({ isThinking }: { isThinking: boolean }) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = clock.elapsedTime * (isThinking ? 1 : 0.2);
      sphereRef.current.rotation.y = clock.elapsedTime * (isThinking ? 1 : 0.3);
    }
  });

  return (
    <Sphere ref={sphereRef} args={[1, 64, 64]} scale={1.2}>
      <MeshDistortMaterial 
        color="#3b82f6"
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={0.1}
        roughness={0.4}
        distort={isThinking ? 0.6 : 0.2}
        speed={isThinking ? 4 : 1}
      />
    </Sphere>
  );
};

export const AICopilotBrain = ({ isThinking = false }: { isThinking?: boolean }) => (
  <div className="w-[120px] h-[120px] mx-auto">
    <Canvas camera={{ position: [0, 0, 3] }}>
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} intensity={2} />
      <Brain isThinking={isThinking} />
    </Canvas>
  </div>
);
