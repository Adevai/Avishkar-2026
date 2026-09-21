import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface SkillNode {
  name: string;
  category: 'cloud' | 'core' | 'framework' | 'data' | 'gap';
  score: number;
  benchmark: number;
  position: THREE.Vector3;
}

export const SkillGalaxy3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 500;
    const height = mount.clientHeight || 340;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.003);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 30, 130);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;

    // Center Core Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x60a5fa, 2, 250);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Skills Taxonomy for Galaxy
    const skillsData: { name: string; category: SkillNode['category']; score: number; benchmark: number }[] = [
      { name: 'Data Structures', category: 'core', score: 88, benchmark: 80 },
      { name: 'Algorithms', category: 'core', score: 85, benchmark: 75 },
      { name: 'React 19 & TS', category: 'framework', score: 92, benchmark: 75 },
      { name: 'Tailwind CSS', category: 'framework', score: 95, benchmark: 70 },
      { name: 'Node.js & Express', category: 'framework', score: 85, benchmark: 75 },
      { name: 'PostgreSQL 18', category: 'data', score: 82, benchmark: 70 },
      { name: 'Redis Caching', category: 'data', score: 72, benchmark: 65 },
      { name: 'System Design', category: 'core', score: 62, benchmark: 70 },
      { name: 'Docker Multi-stage', category: 'gap', score: 54, benchmark: 75 },
      { name: 'Kubernetes Pods & K8s', category: 'gap', score: 38, benchmark: 70 },
      { name: 'GitHub Actions CI/CD', category: 'gap', score: 45, benchmark: 75 },
      { name: 'Cloud Architecture (AWS)', category: 'cloud', score: 68, benchmark: 75 },
      { name: 'Microservices & gRPC', category: 'cloud', score: 70, benchmark: 70 },
    ];

    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    const nodes: SkillNode[] = [];
    const meshes: THREE.Mesh[] = [];

    // Category Color Mapping
    const getColor = (category: SkillNode['category'], score: number, benchmark: number) => {
      if (score < benchmark) return 0xf43f5e; // Rose Red for critical gap
      if (category === 'framework') return 0x38bdf8; // Sky Blue
      if (category === 'data') return 0x10b981; // Emerald Green
      if (category === 'cloud') return 0x818cf8; // Indigo
      return 0xf59e0b; // Amber Core
    };

    // Distribute nodes in a 3D spherical galaxy spiral
    skillsData.forEach((skill, i) => {
      const phi = Math.acos(-1 + (2 * i) / skillsData.length);
      const theta = Math.sqrt(skillsData.length * Math.PI) * phi + (i * 0.4);
      const radius = 35 + (i % 3) * 14;

      const pos = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        (radius * Math.sin(theta) * Math.sin(phi)) * 0.6,
        radius * Math.cos(phi)
      );

      const node: SkillNode = {
        ...skill,
        position: pos,
      };
      nodes.push(node);

      // Node Mesh (Sphere)
      const color = getColor(skill.category, skill.score, skill.benchmark);
      const nodeGeo = new THREE.SphereGeometry(skill.score < skill.benchmark ? 4.2 : 3.4, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.2,
      });

      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      mesh.position.copy(pos);
      mesh.userData = { skill: node };
      nodesGroup.add(mesh);
      meshes.push(mesh);

      // Glow halo ring for gap nodes
      if (skill.score < skill.benchmark) {
        const ringGeo = new THREE.RingGeometry(5.0, 5.8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(camera.position);
        nodesGroup.add(ring);
      }
    });

    // Synaptic filaments connecting neighboring nodes
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.25,
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < 46) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            nodes[i].position,
            nodes[j].position,
          ]);
          const line = new THREE.Line(lineGeo, lineMat);
          nodesGroup.add(line);
        }
      }
    }

    // Background Particle Stardust
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 350;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 1.2,
      transparent: true,
      opacity: 0.5,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Raycaster for click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const target = intersects[0].object.userData.skill as SkillNode;
        if (target) {
          setSelectedSkill(target);
        }
      }
    };

    mount.addEventListener('pointerdown', handlePointerDown);

    // Handle Resize
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
      controls.update();
      nodesGroup.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      mount.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      lineMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[320px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Galaxy HUD Overlay */}
      <div className="absolute top-3 left-4 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          3D Skill Galaxy Constellation (Drag to Rotate & Orbit)
        </span>
      </div>

      {/* Selected Skill Popover Pill */}
      {selectedSkill && (
        <div className="absolute top-3 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-2xl shadow-xl max-w-xs animate-in fade-in duration-200 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-bold text-white">{selectedSkill.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              selectedSkill.score < selectedSkill.benchmark 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {selectedSkill.score < selectedSkill.benchmark ? 'DEFICIT' : 'OPTIMAL'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Score: <strong className="text-white">{selectedSkill.score}%</strong></span>
            <span>Target: <strong className="text-slate-300">{selectedSkill.benchmark}%</strong></span>
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="absolute bottom-3 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Gap Needs Mastery</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Frameworks</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Data / SQL</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Core Logic</span>
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[9px] text-slate-500">Three.js WebGL Engine</span>
      </div>
    </div>
  );
};
