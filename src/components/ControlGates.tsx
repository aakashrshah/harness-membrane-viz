"use client";

import { Html } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { eventBus } from "@/lib/event-bus";
import { TEST_ASSERTION_LANES, type HarnessType } from "@/lib/types";
import type { ControlGateEvent } from "@/lib/types";

type GateVis = {
  name: string;
  state: ControlGateEvent["state"];
};

function defaultGates(harnessType: HarnessType): string[] {
  if (harnessType === "test") return [...TEST_ASSERTION_LANES];
  if (harnessType === "kernel")
    return ["allowlist", "tool gate", "policy", "budget"];
  return ["domain island", "validator", "policy", "approval"];
}

/** Gate nodes on the membrane grid — light up with control_gate events. */
export function ControlGates({ harnessType }: { harnessType: HarnessType }) {
  const names = useMemo(() => defaultGates(harnessType), [harnessType]);
  const [gates, setGates] = useState<GateVis[]>(() =>
    names.map((name) => ({ name, state: "idle" as const }))
  );

  useEffect(() => {
    setGates(names.map((name) => ({ name, state: "idle" as const })));
  }, [names]);

  useEffect(() => {
    const unsub = eventBus.subscribe((ev) => {
      if (ev.type !== "control_gate") return;
      setGates((prev) => {
        const idx = prev.findIndex(
          (g) => g.name.toLowerCase() === ev.name.toLowerCase()
        );
        if (idx < 0) {
          return [...prev, { name: ev.name, state: ev.state }];
        }
        const next = [...prev];
        next[idx] = { name: ev.name, state: ev.state };
        return next;
      });
    });
    const unreset = eventBus.onReset(() => {
      setGates(names.map((name) => ({ name, state: "idle" as const })));
    });
    return () => {
      unsub();
      unreset();
    };
  }, [names]);

  const radius = 2.8;

  return (
    <group position={[0, 0.28, 0]}>
      {gates.slice(0, 6).map((g, i) => {
        const a = (i / Math.max(gates.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const color =
          g.state === "pass"
            ? "#7dffb3"
            : g.state === "fail"
              ? "#ff6b6b"
              : g.state === "checking" || g.state === "active"
                ? "#ffe066"
                : "#3aa9ff";
        const intensity =
          g.state === "idle" ? 0.35 : g.state === "checking" ? 0.9 : 1;

        return (
          <group key={`${g.name}-${i}`} position={[x, 0, z]}>
            <mesh>
              <octahedronGeometry args={[0.12, 0]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.55 + intensity * 0.4}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <Html
              position={[0, 0.22, 0]}
              center
              distanceFactor={10}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <div className="whitespace-nowrap rounded border border-white/15 bg-black/65 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-white/70">
                {g.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
