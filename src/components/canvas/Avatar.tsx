import React, { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

const AvatarPlane: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useTexture('/frames/male0001.png');
  const { cursorPosition, scrollProgress } = useStore();

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const targetX = 2.1 - scrollProgress * 1.4;
    const targetY = Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
    const targetScale = 1.1 - scrollProgress * 0.22;

    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 4, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 4, delta);
    groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 4, delta));
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, cursorPosition.px * 0.16, 4, delta);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, -cursorPosition.py * 0.08, 4, delta);
  });

  return (
    <group ref={groupRef} position={[2.1, 0, 0]} scale={1.1}>
      <mesh>
        <planeGeometry args={[3.4, 4.4]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Avatar: React.FC = () => (
  <Suspense fallback={null}>
    <AvatarPlane />
  </Suspense>
);

export const GlbAvatar = Avatar;
