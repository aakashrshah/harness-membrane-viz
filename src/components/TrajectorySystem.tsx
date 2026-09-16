"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { eventBus } from "@/lib/event-bus";
import type { TrajectoryEvent } from "@/lib/types";

interface TrailData {
  id: string;
  points: THREE.Vector3[];
  color: THREE.Color;
  born: number;
  maxLife: number;
  kind: TrajectoryEvent["kind"];
}

const MAX_TRAILS = 20;

function curvePoints(
  from: [number, number, number],
  to: [number, number, number],
  kind: TrajectoryEvent["kind"]
): THREE.Vector3[] {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  if (kind === "breach" || kind === "deflect") {
    mid.y += kind === "breach" ? 0.9 : -0.3;
  } else {
    mid.y += 0.35;
  }
  mid.x += (Math.random() - 0.5) * 0.35;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  return curve.getPoints(32);
}

/** Illuminates think/tool/breach paths; breach ripples then deflects under control. */
export function TrajectorySystem({ onBreach }: { onBreach?: () => void }) {
  const [version, setVersion] = useState(0);
  const trailsRef = useRef<TrailData[]>([]);
  const breachRef = useRef(onBreach);
  breachRef.current = onBreach;

  useEffect(() => {
    const unsub = eventBus.subscribe((ev) => {
      if (ev.type !== "trajectory") return;
      const from = ev.from ?? [0, -1.4, 0];
      const to = ev.to ?? [0, 0.8, 0];
      const color = new THREE.Color(
        ev.color ??
          (ev.kind === "breach"
            ? "#ff4d6d"
            : ev.kind === "deflect"
              ? "#ffe066"
              : ev.kind === "allow"
                ? "#7dffb3"
                : "#5ec8ff")
      );
      const trail: TrailData = {
        id: ev.id,
        points: curvePoints(from, to, ev.kind),
        color,
        born: performance.now(),
        maxLife: ev.kind === "breach" ? 2400 : 1800,
        kind: ev.kind,
      };
      if (ev.kind === "breach") breachRef.current?.();
      trailsRef.current = [...trailsRef.current.slice(-(MAX_TRAILS - 1)), trail];
      setVersion((v) => v + 1);
    });
    const unreset = eventBus.onReset(() => {
      trailsRef.current = [];
      setVersion((v) => v + 1);
    });
    return () => {
      unsub();
      unreset();
    };
  }, []);

  // Cull expired without thrashing every frame — check periodically via rAF in useFrame
  const lastCull = useRef(0);
  useFrame(() => {
    const now = performance.now();
    if (now - lastCull.current < 200) return;
    lastCull.current = now;
    const before = trailsRef.current.length;
    trailsRef.current = trailsRef.current.filter(
      (t) => now - t.born < t.maxLife
    );
    if (trailsRef.current.length !== before) setVersion((v) => v + 1);
  });

  // version used to trigger re-render when trails change
  void version;

  return (
    <group>
      {trailsRef.current.map((trail) => (
        <TrailMesh key={trail.id} trail={trail} />
      ))}
    </group>
  );
}

function TrailMesh({ trail }: { trail: TrailData }) {
  const lineRef = useRef<THREE.Line>(null);
  const headRef = useRef<THREE.Mesh>(null);

  const { positions, color } = useMemo(() => {
    const positions = new Float32Array(trail.points.length * 3);
    trail.points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    return { positions, color: trail.color };
  }, [trail]);

  useFrame(() => {
    const age = performance.now() - trail.born;
    const life = 1 - age / trail.maxLife;
    const progress = Math.min(1, age / (trail.maxLife * 0.45));
    const count = Math.max(2, Math.floor(trail.points.length * progress));

    const line = lineRef.current;
    if (line) {
      const geo = line.geometry;
      geo.setDrawRange(0, count);
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, life) * 0.95;
    }

    if (headRef.current) {
      const idx = Math.min(trail.points.length - 1, count - 1);
      const p = trail.points[idx];
      headRef.current.position.copy(p);
      const mat = headRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, life);
      headRef.current.visible = life > 0.05;
    }
  });

  return (
    <group>
      {/* @ts-expect-error R3F line element */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={trail.points.length}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </line>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
