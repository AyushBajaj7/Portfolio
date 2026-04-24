import React, { useRef, useMemo, Suspense, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, useGLTF, useAnimations } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import * as THREE from 'three';

// ─── GLSL Shaders (image-based avatar) ─────────────────────────────────────
const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
uniform sampler2D tDiffuse;
uniform vec3 uTint;
uniform float uTintStr;
uniform float uBrightness;
uniform float uImageOpacity;
uniform float uGlobalOpacity;
uniform float uSaturation;
varying vec2 vUv;

vec3 applySaturation(vec3 c, float s) {
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(luma), c, s);
}

void main() {
  vec4 tex = texture2D(tDiffuse, vUv);
  if (tex.a < 0.01) discard;
  vec3 col = tex.rgb;
  col = applySaturation(col, uSaturation);
  col = mix(col, uTint * (col + 0.15), uTintStr);
  col *= uBrightness;
  gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.5)), tex.a * uImageOpacity * uGlobalOpacity);
}
`;

// ─── Scroll-based state configs ─────────────────────────────────────────────
interface StateConfig {
  x: number; y: number; z: number;
  scale: number;
  rotY: number; rotX: number;
  glowR: number; glowG: number; glowB: number; glowOpa: number;
  tintR: number; tintG: number; tintB: number;
  tintStr: number;
  brightness: number;
  saturation: number;
  opacity: number;
  expression: number;
}

export const STATES: StateConfig[] = [
  { // 0: Hero — right side, close
    x: 2.5, y: 0.15, z: 0.0,
    scale: 1.0, rotY: 0.0, rotX: 0.0,
    glowR: 0.37, glowG: 0.42, glowB: 0.82, glowOpa: 0.0,
    tintR: 0.55, tintG: 0.65, tintB: 1.0,
    tintStr: 0.0, brightness: 1.0, saturation: 1.0, opacity: 1.0,
    expression: 0.0,
  },
  { // 1: About — right side clear
    x: 2.2, y: 0.2, z: 0.3,
    scale: 1.05, rotY: 0.12, rotX: -0.06,
    glowR: 0.66, glowG: 0.30, glowB: 0.97, glowOpa: 0.0,
    tintR: 0.82, tintG: 0.50, tintB: 1.0,
    tintStr: 0.18, brightness: 1.06, saturation: 1.08, opacity: 1.0,
    expression: 0.5,
  },
  { // 2: Projects — far left to avoid overlap
    x: -3.6, y: 0.3, z: 0.0,
    scale: 1.1, rotY: -0.18, rotX: 0.05,
    glowR: 0.02, glowG: 0.71, glowB: 0.84, glowOpa: 0.0,
    tintR: 0.35, tintG: 0.92, tintB: 0.98,
    tintStr: 0.20, brightness: 1.10, saturation: 1.12, opacity: 1.0,
    expression: 1.0,
  },
  { // 3: Skills — far right, avoids left-aligned list
    x: 3.0, y: -0.1, z: -0.3,
    scale: 0.88, rotY: 0.20, rotX: -0.10,
    glowR: 0.89, glowG: 0.34, glowB: 0.55, glowOpa: 0.0,
    tintR: 1.0, tintG: 0.7, tintB: 0.8,
    tintStr: 0.28, brightness: 1.04, saturation: 1.04, opacity: 1.0,
    expression: 1.8,
  },
  { // 4: Contact — center, fades out
    x: 0.0, y: -1.0, z: -3.0,
    scale: 0.65, rotY: 0.0, rotX: -0.08,
    glowR: 0.10, glowG: 0.08, glowB: 0.22, glowOpa: 0.0,
    tintR: 0.38, tintG: 0.40, tintB: 0.46,
    tintStr: 0.5, brightness: 0.5, saturation: 0.3, opacity: 0.12,
    expression: 2.0,
  },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function interpStates(progress: number): StateConfig {
  const n = STATES.length;
  const t = Math.max(0, Math.min(1, progress)) * (n - 1);
  const i = Math.min(Math.floor(t), n - 2);
  const f = t - i;
  const A = STATES[i], B = STATES[i + 1];
  const L = (a: number, b: number) => lerp(a, b, f);
  return {
    x: L(A.x, B.x), y: L(A.y, B.y), z: L(A.z, B.z),
    scale: L(A.scale, B.scale),
    rotY: L(A.rotY, B.rotY), rotX: L(A.rotX, B.rotX),
    glowR: L(A.glowR, B.glowR), glowG: L(A.glowG, B.glowG),
    glowB: L(A.glowB, B.glowB), glowOpa: L(A.glowOpa, B.glowOpa),
    tintR: L(A.tintR, B.tintR), tintG: L(A.tintG, B.tintG), tintB: L(A.tintB, B.tintB),
    tintStr: L(A.tintStr, B.tintStr),
    brightness: L(A.brightness, B.brightness),
    saturation: L(A.saturation, B.saturation),
    opacity: L(A.opacity, B.opacity),
    expression: L(A.expression, B.expression),
  };
}

// ─── Shared position/rotation animation hook ────────────────────────────────
function useAvatarAnim() {
  const groupRef = useRef<THREE.Group>(null);
  const { cursorPosition, scrollProgress } = useStore();
  const cur = useRef({ ...STATES[0] });

  const animate = (state: { clock: THREE.Clock }, delta: number) => {
    if (!groupRef.current) return cur.current;
    const tgt = interpStates(scrollProgress);
    const ls = Math.min(delta * 2.8, 1);
    const fs = Math.min(delta * 5.0, 1);
    const c = cur.current;
    const L = lerp;

    c.x = L(c.x, tgt.x, ls);
    c.y = L(c.y, tgt.y, ls);
    c.z = L(c.z, tgt.z, ls);
    c.scale = L(c.scale, tgt.scale, ls);

    c.rotY = L(c.rotY, tgt.rotY + cursorPosition.px * 0.28, ls);
    c.rotX = L(c.rotX, tgt.rotX - cursorPosition.py * 0.18, ls);

    c.tintStr    = L(c.tintStr,    tgt.tintStr,    fs);
    c.brightness = L(c.brightness, tgt.brightness,  fs);
    c.saturation = L(c.saturation, tgt.saturation,  fs);
    c.opacity    = L(c.opacity,    tgt.opacity,     fs);
    c.expression = L(c.expression, tgt.expression,  fs);
    c.tintR = L(c.tintR, tgt.tintR, fs);
    c.tintG = L(c.tintG, tgt.tintG, fs);
    c.tintB = L(c.tintB, tgt.tintB, fs);
    c.glowR = L(c.glowR, tgt.glowR, fs);
    c.glowG = L(c.glowG, tgt.glowG, fs);
    c.glowB = L(c.glowB, tgt.glowB, fs);
    c.glowOpa = L(c.glowOpa, tgt.glowOpa, fs);

    const float = Math.sin(state.clock.getElapsedTime() * 1.35) * 0.065;
    groupRef.current.position.set(c.x, c.y + float, c.z);
    groupRef.current.scale.setScalar(c.scale);
    groupRef.current.rotation.y = c.rotY;
    groupRef.current.rotation.x = c.rotX;

    return c;
  };

  return { groupRef, animate, cur };
}

// ─── Image-based Avatar (ACTIVE — stable fallback) ──────────────────────────
function ImageAvatarMesh() {
  const { groupRef, animate } = useAvatarAnim();
  const { scrollProgress } = useStore();

  const [tex1, tex2, tex3] = useTexture([
    '/avatar_1.png',
    '/avatar_2.png',
    '/avatar_3.png'
  ]);

  const matConfig = useMemo(() => ({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  }), []);

  const mat1 = useMemo(() => new THREE.ShaderMaterial({
    ...matConfig,
    uniforms: {
      tDiffuse: { value: tex1 },
      uTint: { value: new THREE.Color(0.55, 0.65, 1.0) },
      uTintStr: { value: 0.0 }, uBrightness: { value: 1.0 },
      uImageOpacity: { value: 1.0 }, uGlobalOpacity: { value: 1.0 }, uSaturation: { value: 1.0 }
    }
  }), [tex1, matConfig]);

  const mat2 = useMemo(() => new THREE.ShaderMaterial({
    ...matConfig,
    uniforms: {
      tDiffuse: { value: tex2 },
      uTint: { value: new THREE.Color(0.55, 0.65, 1.0) },
      uTintStr: { value: 0.0 }, uBrightness: { value: 1.0 },
      uImageOpacity: { value: 0.0 }, uGlobalOpacity: { value: 1.0 }, uSaturation: { value: 1.0 }
    }
  }), [tex2, matConfig]);

  const mat3 = useMemo(() => new THREE.ShaderMaterial({
    ...matConfig,
    uniforms: {
      tDiffuse: { value: tex3 },
      uTint: { value: new THREE.Color(0.55, 0.65, 1.0) },
      uTintStr: { value: 0.0 }, uBrightness: { value: 1.0 },
      uImageOpacity: { value: 0.0 }, uGlobalOpacity: { value: 1.0 }, uSaturation: { value: 1.0 }
    }
  }), [tex3, matConfig]);

  useFrame((state, delta) => {
    const c = animate(state, delta);
    
    const s = scrollProgress;
    let o1 = 1, o2 = 0, o3 = 0;

    if (s <= 0.3) {
      o1 = 1; o2 = 0; o3 = 0;
    } else if (s > 0.3 && s <= 0.6) {
      const t = (s - 0.3) / 0.3;
      o1 = 1 - t; o2 = t; o3 = 0;
    } else if (s > 0.6 && s <= 1.0) {
      const t = (s - 0.6) / 0.4;
      o1 = 0; o2 = 1 - t; o3 = t;
    } else {
      o1 = 0; o2 = 0; o3 = 1;
    }

    mat1.uniforms.uImageOpacity.value = o1;
    mat2.uniforms.uImageOpacity.value = o2;
    mat3.uniforms.uImageOpacity.value = o3;

    [mat1, mat2, mat3].forEach(mat => {
      mat.uniforms.uTint.value.setRGB(c.tintR, c.tintG, c.tintB);
      mat.uniforms.uTintStr.value = c.tintStr;
      mat.uniforms.uBrightness.value = c.brightness;
      mat.uniforms.uSaturation.value = c.saturation;
      mat.uniforms.uGlobalOpacity.value = c.opacity;
    });
  });

  return (
    <group ref={groupRef} position={[2.5, 0, 0]}>
      <mesh material={mat1} position={[0, 0, 0.002]} castShadow><planeGeometry args={[3.5, 4.5]} /></mesh>
      <mesh material={mat2} position={[0, 0, 0.001]} castShadow><planeGeometry args={[3.5, 4.5]} /></mesh>
      <mesh material={mat3} position={[0, 0, 0.000]} castShadow><planeGeometry args={[3.5, 4.5]} /></mesh>
    </group>
  );
}

// ─── Animation clip names expected in the GLB ──────────────────────────────
// Rename clips in your GLB tool to match, OR override below with actual names
const CLIP_IDLE    = 'idle';
const CLIP_LOOK    = 'look';
const CLIP_GESTURE = 'gesture';

type AnimState = 'idle' | 'look' | 'gesture';

// ─── GLB Avatar Mesh — animations + physics float ───────────────────────────
function GlbAvatarMesh() {
  const { groupRef, animate } = useAvatarAnim();

  // Load GLB with animations
  const { scene: gltfScene, animations } = useGLTF('/models/avatar.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);

  // Physics impulse target (damped float offset)
  const physicsVel = useRef({ y: 0, vy: 0 });

  // Animation state machine
  const animState = useRef<AnimState>('idle');
  const gestureTimer = useRef(0);
  const fadeTime = 0.35; // seconds for crossfade

  // Shadow + env-map on load
  useMemo(() => {
    gltfScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
        }
      }
    });
  }, [gltfScene]);

  // Play idle on mount — safe: only runs if clip exists
  useEffect(() => {
    const idle = actions[CLIP_IDLE];
    if (idle) {
      idle.reset().fadeIn(fadeTime).play();
      idle.setLoop(THREE.LoopRepeat, Infinity);
    }
  }, [actions]);

  // ── Single animation controller ──────────────────────────────────────────
  const transitionTo = useCallback((next: AnimState, durationOverride?: number) => {
    if (animState.current === next) return;

    const prev = animState.current;
    const prevAction = actions[prev === 'idle' ? CLIP_IDLE : prev === 'look' ? CLIP_LOOK : CLIP_GESTURE];
    const nextAction = actions[next === 'idle' ? CLIP_IDLE : next === 'look' ? CLIP_LOOK : CLIP_GESTURE];

    animState.current = next;

    if (nextAction) {
      if (next === 'gesture') {
        nextAction.reset();
        nextAction.setLoop(THREE.LoopOnce, 1);
        nextAction.clampWhenFinished = true;
      } else {
        nextAction.setLoop(THREE.LoopRepeat, Infinity);
      }
      nextAction.fadeIn(durationOverride ?? fadeTime).play();
    }
    if (prevAction) prevAction.fadeOut(durationOverride ?? fadeTime);
  }, [actions]);

  // ── Hover handler ────────────────────────────────────────────────────────
  const handlePointerEnter = useCallback(() => {
    if (animState.current === 'gesture') return;
    transitionTo('look');
  }, [transitionTo]);

  const handlePointerLeave = useCallback(() => {
    if (animState.current === 'gesture') return;
    transitionTo('idle');
  }, [transitionTo]);

  // ── Click handler ────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    const gestureDuration = actions[CLIP_GESTURE]?.getClip().duration ?? 1.5;
    gestureTimer.current = gestureDuration;
    transitionTo('gesture');
  }, [actions, transitionTo]);

  useFrame((state, delta) => {
    // Advance mixer
    if (mixer) mixer.update(delta);

    // Auto-return from gesture when clip ends
    if (animState.current === 'gesture') {
      gestureTimer.current -= delta;
      if (gestureTimer.current <= 0) {
        transitionTo('idle', 0.5);
      }
    }

    // Physics float: spring-damper on top of scroll float
    const pv = physicsVel.current;
    const springForce = -4.0 * pv.y;   // spring constant
    const damping     = -6.0 * pv.vy;  // damping
    pv.vy += (springForce + damping) * delta;
    pv.y  += pv.vy * delta;

    // Scroll + base animation (position, scale, rotation)
    const c = animate(state, delta);

    // Add physics offset on top of scroll float
    if (groupRef.current) {
      groupRef.current.position.y += pv.y;
    }

    // Fade materials with scroll opacity
    gltfScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mat.transparent) mat.transparent = true;
        mat.opacity = c.opacity;
        mat.needsUpdate = false; // avoid freeze
      }
    });
  });

  return (
    <group
      ref={groupRef}
      position={[2.5, 0, 0]}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Additive glow halo behind model */}
      <mesh position={[0, 0, -0.85]}>
        <planeGeometry args={[4.5, 6.0]} />
        <meshBasicMaterial
          color="#5e6ad2"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3D GLB Model — centered, scaled for a human-proportioned character */}
      <group position={[0, -1.8, 0]} scale={[1.2, 1.2, 1.2]}>
        <primitive object={gltfScene} />
      </group>
    </group>
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

// ACTIVE: image-based, crash-proof
export const Avatar: React.FC = () => (
  <Suspense fallback={null}>
    <ImageAvatarMesh />
  </Suspense>
);

// READY: drop avatar.glb in /public/models/ and swap <Avatar> → <GlbAvatar> in Scene.tsx
// Physics wrapper is included; wrap with <Physics> in Scene.tsx (see Scene.tsx comments)
export const GlbAvatar: React.FC = () => (
  <Suspense fallback={null}>
    <GlbAvatarMesh />
  </Suspense>
);

useGLTF.preload('/models/avatar.glb');
