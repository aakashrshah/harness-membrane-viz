"use client";

import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import { eventBus } from "@/lib/event-bus";
import { TEST_ASSERTION_LANES, type HarnessType } from "@/lib/types";
import * as THREE from "three";

type LaneState = "idle" | "pass" | "fail";

/**
 * Labeled assertion rails on the Test harness membrane plane.
 */
export function AssertionRails({ harnessType }: { harnessType: HarnessType }) {
  const [states, setStates] = useState<Record<string, LaneState>>(() =>
    Object.fromEntries(TEST_ASSERTION_LANES.map((n) => [n, "idle" as LaneState]))
  );

  useEffect(() => {
    if (harnessType !== "test") return;
    const unsub = eventBus.subscribe((ev) => {
      if (ev.type === "test_assert") {
        setStates((s) => ({
          ...s,
          [ev.name]: ev.result === "pass" ? "pass" : "fail",
        }));
      }
    });
    const unreset = eventBus.onReset(() => {
      setStates(
        Object.fromEntries(
          TEST_ASSERTION_LANES.map((n) => [n, "idle" as LaneState])
        )
      );
    });
    return () => {
      unsub();
      unreset();
    };
  }, [harnessType]);

  if (harnessType !== "test") return null;

  const n = TEST_ASSERTION_LANES.length;
  const span = 7.2;
  const start = -span / 2;

  return (
    <group position={[0, 0.22, 0]}>
      {TEST_ASSERTION_LANES.map((name, i) => {
        const x = start + (span * (i + 0.5)) / n;
        const st = states[name] ?? "idle";
        const color =
          st === "pass"
            ? "#7dffb3"
            : st === "fail"
              ? "#ff6b6b"
              : "#ffe066";
        const opacity = st === "idle" ? 0.35 : 0.85;

        return (
          <group key={name} position={[x, 0, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.12, 8.5]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity * 0.45}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Tick / fail marker at near edge */}
            <mesh position={[0, 0.02, 3.6]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                depthWrite={false}
              />
            </mesh>
            <Html
              position={[0, 0.15, 3.9]}
              center
              distanceFactor={9}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <div
                className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${
                  st === "pass"
                    ? "border border-emerald-400/50 bg-black/70 text-emerald-200"
                    : st === "fail"
                      ? "border border-rose-400/50 bg-black/70 text-rose-200"
                      : "border border-amber-300/35 bg-black/65 text-amber-100/80"
                }`}
              >
                {st === "pass" ? "✓ " : st === "fail" ? "✗ " : ""}
                {name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
