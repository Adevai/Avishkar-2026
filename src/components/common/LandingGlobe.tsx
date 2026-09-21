import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const LandingGlobe: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 400;
    const height = mount.clientHeight || 400;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 210;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Wireframe Outer Sphere
    const sphereGeo = new THREE.SphereGeometry(65, 36, 36);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphere);

    // 2. Inner Glow Core
    const coreGeo = new THREE.SphereGeometry(62, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x1d4ed8,
      transparent: true,
      opacity: 0.08,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(core);

    // 3. Floating Digital Coordinate Points on Sphere Surface
    const pointCount = 650;
    const pointPositions = new Float32Array(pointCount * 3);
    const pointColors = new Float32Array(pointCount * 3);

    const radius = 65.5;
    for (let i = 0; i < pointCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / pointCount);
      const theta = Math.sqrt(pointCount * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      pointPositions[i * 3] = x;
      pointPositions[i * 3 + 1] = y;
      pointPositions[i * 3 + 2] = z;

      // Color variation between cyan, amber, and blue
      if (i % 5 === 0) {
        // Amber spark points
        pointColors[i * 3] = 0.96;
        pointColors[i * 3 + 1] = 0.62;
        pointColors[i * 3 + 2] = 0.04;
      } else if (i % 3 === 0) {
        // Sky blue
        pointColors[i * 3] = 0.22;
        pointColors[i * 3 + 1] = 0.74;
        pointColors[i * 3 + 2] = 0.97;
      } else {
        // Navy blue
        pointColors[i * 3] = 0.23;
        pointColors[i * 3 + 1] = 0.51;
        pointColors[i * 3 + 2] = 0.96;
      }
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const pointsMesh = new THREE.Points(pointGeo, pointMat);
    globeGroup.add(pointsMesh);

    // 4. Arcs Connecting Key Hubs (Academia to Industry Arcs)
    const arcPointsList: THREE.Vector3[][] = [
      [
        new THREE.Vector3(20, 45, 45),
        new THREE.Vector3(5, 75, 55),
        new THREE.Vector3(-40, 30, 40)
      ],
      [
        new THREE.Vector3(-35, -20, 50),
        new THREE.Vector3(0, -10, 80),
        new THREE.Vector3(45, 20, 40)
      ],
      [
        new THREE.Vector3(50, -30, 25),
        new THREE.Vector3(65, 0, 50),
        new THREE.Vector3(10, 55, 30)
      ]
    ];

    arcPointsList.forEach((pts) => {
      const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
      const curvePoints = curve.getPoints(32);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const arcMat = new THREE.LineBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.7,
        linewidth: 1.5,
      });
      const arcLine = new THREE.Line(arcGeo, arcMat);
      globeGroup.add(arcLine);
    });

    // Mouse Interaction for interactive parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = event.clientX - rect.left - width / 2;
      const y = event.clientY - rect.top - height / 2;
      mouseX = (x / width) * 2;
      mouseY = (y / height) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      const newW = mount.clientWidth;
      const newH = mount.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth idle rotation
      globeGroup.rotation.y += 0.0035;
      globeGroup.rotation.x += 0.001;

      // Mouse Parallax Response
      targetRotationY = mouseX * 0.4;
      targetRotationX = mouseY * 0.4;

      globeGroup.rotation.y += (targetRotationY - globeGroup.rotation.y) * 0.05;
      globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      pointGeo.dispose();
      pointMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[280px] sm:h-[320px] flex items-center justify-center pointer-events-none">
      <div ref={mountRef} className="w-full h-full pointer-events-auto" />
      <div className="absolute bottom-2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/10 text-[10px] text-blue-200 pointer-events-none shadow-sm font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>3D Global Academia–Industry Mesh</span>
      </div>
    </div>
  );
};
