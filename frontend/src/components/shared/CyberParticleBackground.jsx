import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ── palette ── */
const COLORS = [
  new THREE.Color('#3b82f6'),  // Electric Blue
  new THREE.Color('#10b981'),  // Neon Green
  new THREE.Color('#ef4444'),  // Alert Red
  new THREE.Color('#a855f7'),  // Purple
  new THREE.Color('#06b6d4'),  // Cyan
];

const PARTICLE_COUNT = 1800;
const REPULSION_RADIUS_SQ = 2.8 * 2.8;   // squared radius for faster comparison
const REPULSION_STRENGTH = 0.12;
const LERP_SPEED = 0.04;

function ParticleSwarm() {
  const meshRef = useRef();
  const { pointer, viewport } = useThree();

  /* pre-compute origins, colors, and working positions */
  const { origins, colors, positions, dummy } = useMemo(() => {
    const _origins = new Float32Array(PARTICLE_COUNT * 3);
    const _positions = new Float32Array(PARTICLE_COUNT * 3);
    const _colors = new Float32Array(PARTICLE_COUNT * 3);
    const _dummy = new THREE.Object3D();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      /* spread in a disc/sphere shape */
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.5) * 8; // sqrt for uniform disc
      const z = (Math.random() - 0.5) * 3;

      _origins[i3] = Math.cos(angle) * radius;
      _origins[i3 + 1] = Math.sin(angle) * radius;
      _origins[i3 + 2] = z;

      _positions[i3] = _origins[i3];
      _positions[i3 + 1] = _origins[i3 + 1];
      _positions[i3 + 2] = _origins[i3 + 2];

      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      _colors[i3] = c.r;
      _colors[i3 + 1] = c.g;
      _colors[i3 + 2] = c.b;
    }

    return { origins: _origins, colors: _colors, positions: _positions, dummy: _dummy };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const time = state.clock.elapsedTime;

    /* map NDC pointer (-1…+1) to world coordinates */
    const mouseX = (pointer.x * viewport.width) / 2;
    const mouseY = (pointer.y * viewport.height) / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      /* gentle floating drift on origin */
      const ox = origins[i3] + Math.sin(time * 0.3 + i * 0.01) * 0.15;
      const oy = origins[i3 + 1] + Math.cos(time * 0.25 + i * 0.01) * 0.15;
      const oz = origins[i3 + 2] + Math.sin(time * 0.2 + i * 0.02) * 0.1;

      /* distance squared from cursor in XY */
      const dx = positions[i3] - mouseX;
      const dy = positions[i3 + 1] - mouseY;
      const distSq = dx * dx + dy * dy;

      let targetX = ox;
      let targetY = oy;
      let targetZ = oz;

      /* repulsion */
      if (distSq < REPULSION_RADIUS_SQ) {
        const dist = Math.sqrt(distSq) || 0.001; // only calc sqrt if within radius
        const force = (1 - dist / 2.8) * REPULSION_STRENGTH;
        targetX = positions[i3] + (dx / dist) * force * 60;
        targetY = positions[i3 + 1] + (dy / dist) * force * 60;
        targetZ = positions[i3 + 2] + (Math.random() - 0.5) * force * 15;
      }

      /* smooth lerp toward target */
      positions[i3] = THREE.MathUtils.lerp(positions[i3], targetX, LERP_SPEED);
      positions[i3 + 1] = THREE.MathUtils.lerp(positions[i3 + 1], targetY, LERP_SPEED);
      positions[i3 + 2] = THREE.MathUtils.lerp(positions[i3 + 2], targetZ, LERP_SPEED);

      /* update instance matrix */
      dummy.position.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      const scale = 0.015 + Math.sin(time * 2 + i) * 0.005;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      /* set instance color */
      mesh.setColorAt(i, new THREE.Color(colors[i3], colors[i3 + 1], colors[i3 + 2]));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}

export default function CyberParticleBackground() {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        dpr={1}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <ParticleSwarm />
      </Canvas>
    </div>
  );
}
