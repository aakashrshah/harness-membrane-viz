"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { AgentDepth } from "@/lib/types";
import { depthIndex } from "@/lib/types";

interface Props {
  agentDepth: AgentDepth;
  activity: number;
}

/** Glowing autonomous agent core beneath the harness membrane. Grows with depth. */
export function AgentCore({ agentDepth, activity }: Props) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const d = depthIndex(agentDepth);
  const scale = 0.35 + d * 0.18;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.25;
    }
    if (core.current) {
      const s = scale * (1 + Math.sin(t * 2) * 0.04 + activity * 0.12);
      core.current.scale.setScalar(s);
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.4;
      ring.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    }
  });

  const toolNodes = d >= 3 ? 4 + d : d >= 2 ? 2 : 0;

  return (
    <group ref={group} position={[0, -1.6 - d * 0.08, 0]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color="#0a1a2e"
          emissive="#1e90ff"
          emissiveIntensity={0.8 + activity * 1.2 + d * 0.15}
          roughness={0.35}
          metalness={0.6}
          wireframe={d >= 3}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial
          color="#5ec8ff"
          transparent
          opacity={0.12 + activity * 0.15}
          wireframe
        />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4 + d * 0.15, 0.02, 8, 64]} />
        <meshBasicMaterial
          color={d >= 4 ? "#ffe066" : "#3aa9ff"}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* Tool nodes bloom under membrane along permitted arcs */}
      {Array.from({ length: toolNodes }).map((_, i) => {
        const a = (i / toolNodes) * Math.PI * 2;
        const r = 1.8 + (i % 2) * 0.35;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0.3 + (i % 3) * 0.15, Math.sin(a) * r]}
          >
            <sphereGeometry args={[0.08 + (i % 2) * 0.03, 12, 12]} />
            <meshStandardMaterial
              color="#0a0a0a"
              emissive={i % 2 === 0 ? "#3aa9ff" : "#ffe066"}
              emissiveIntensity={0.9 + activity * 0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}
