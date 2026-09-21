import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows, MeshTransmissionMaterial, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

const Card = ({ student }: { student: any }) => {
  const cardRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (cardRef.current) {
      cardRef.current.rotation.x = THREE.MathUtils.lerp(cardRef.current.rotation.x, (state.pointer.y * Math.PI) / 8, 0.05);
      cardRef.current.rotation.y = THREE.MathUtils.lerp(cardRef.current.rotation.y, (state.pointer.x * Math.PI) / 8, 0.05);
    }
  });

  return (
    <Float floatIntensity={1} speed={1.5} rotationIntensity={0.5}>
      <mesh ref={cardRef}>
        <RoundedBox args={[4.5, 2.8, 0.1]} radius={0.15} smoothness={4}>
          <MeshTransmissionMaterial 
            backside
            samples={4}
            thickness={0.5}
            chromaticAberration={0.02}
            anisotropy={0.1}
            distortion={0}
            distortionScale={0}
            temporalDistortion={0}
            iridescence={1}
            iridescenceIOR={1}
            iridescenceThicknessRange={[0, 1400]}
            clearcoat={1}
            transmission={0.9}
            opacity={1}
            metalness={0.1}
            roughness={0.2}
            color="#ffffff"
          />
        </RoundedBox>

        <Html transform position={[0, 0, 0.06]} zIndexRange={[100, 0]}>
          <div className="w-[420px] h-[260px] p-8 flex flex-col justify-between text-slate-900 select-none pointer-events-none">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Competency Passport</p>
                <h3 className="font-extrabold text-2xl tracking-tight">{student.name}</h3>
                <p className="text-sm font-bold text-blue-600 mt-1">{student.targetRole}</p>
              </div>
              <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                Verified
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Passport ID</p>
                <p className="font-mono text-sm font-semibold tracking-wider">SPK-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Readiness</p>
                <p className="font-black text-xl text-indigo-600">{student.readinessScore}%</p>
              </div>
            </div>
          </div>
        </Html>
      </mesh>
    </Float>
  );
};

export const HolographicCard = ({ student }: { student: any }) => {
  return (
    <div className="w-full h-[400px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <Environment preset="city" />
        <Card student={student} />
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      </Canvas>
    </div>
  );
};
