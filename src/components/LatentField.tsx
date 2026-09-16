"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AgentDepth } from "@/lib/types";
import { depthIndex } from "@/lib/types";

const MAX = 2400;

interface Props {
  agentDepth: AgentDepth;
  activity: number; // 0–1 from stream intensity
}

/**
 * Mock latent-space particle field (illustrative dots — not real activations).
 * Deeper agent depth → denser field; streaming activity → brighter flicker.
 */
export function LatentField({ agentDepth, activity }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const d = depthIndex(agentDepth);
  const count = Math.min(MAX, 500 + d * 400);

  const { positions, colors, phases } = useMemo(() => {
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const phases = new Float32Array(MAX);
    const cBlue = new THREE.Color("#3aa9ff");
    const cYellow = new THREE.Color("#ffd24a");
    const cDim = new THREE.Color("#1a3a55");

    for (let i = 0; i < MAX; i++) {
      const i3 = i * 3;
      // Spread under and around the membrane plane (y ≈ 0)
      const radius = 1.2 + Math.random() * (4.5 + d * 0.6);
      const theta = Math.random() * Math.PI * 2;
      const y = -2.8 + Math.random() * 2.6 + (Math.random() - 0.5) * 0.4;
      positions[i3] = Math.cos(theta) * radius * (0.4 + Math.random() * 0.8);
      positions[i3 + 1] = y;
      positions[i3 + 2] = Math.sin(theta) * radius * (0.4 + Math.random() * 0.8);

      const warm = Math.random() > 0.72;
      const col = warm ? cYellow : Math.random() > 0.15 ? cBlue : cDim;
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, colors, phases };
  }, [d]);

  useFrame(({ clock }) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const col = pts.geometry.attributes.color as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    const arr = pos.array as Float32Array;
    const carr = col.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ph = phases[i];
      // Subtle drift
      arr[i3 + 1] += Math.sin(t * 0.6 + ph) * 0.0008 * (1 + activity);
      // Pulse brightness with activity
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + ph) * (0.35 + activity * 0.9);
      carr[i3] *= 0.98;
      carr[i3 + 1] *= 0.98;
      carr[i3 + 2] *= 0.98;
      // Soft restore toward base via multiplicative pulse on a copy — simpler: scale alpha via size
      void pulse;
    }
    pos.needsUpdate = true;

    const mat = pts.material as THREE.PointsMaterial;
    mat.size = 0.035 + activity * 0.04 + d * 0.004;
    mat.opacity = 0.55 + activity * 0.35;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
