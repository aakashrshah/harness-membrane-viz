"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AgentCore } from "./AgentCore";
import { HarnessMembrane } from "./HarnessMembrane";
import { LatentField } from "./LatentField";
import { TrajectorySystem } from "./TrajectorySystem";
import { eventBus } from "@/lib/event-bus";
import type { AgentDepth, HarnessType } from "@/lib/types";
import { depthIndex } from "@/lib/types";

interface Props {
  agentDepth: AgentDepth;
  harnessType: HarnessType;
}

function SceneContents({ agentDepth, harnessType }: Props) {
  const [activity, setActivity] = useState(0);
  const [ripple, setRipple] = useState(0);
  const d = depthIndex(agentDepth);
  const clamp =
    harnessType === "kernel" ? 1 : harnessType === "test" ? 0.82 : 0.65;

  useEffect(() => {
    const unsub = eventBus.subscribe((ev) => {
      if (ev.type === "thought") {
        setActivity((a) => Math.min(1, a + (ev.intensity ?? 0.4) * 0.45));
      } else if (ev.type === "token") {
        setActivity((a) => Math.min(1, a + 0.08));
      } else if (ev.type === "tool_propose") {
        setActivity((a) => Math.min(1, a + 0.25));
      } else if (ev.type === "done") {
        setActivity(0.15);
      }
    });
    const unreset = eventBus.onReset(() => {
      setActivity(0);
      setRipple(0);
    });
    return () => {
      unsub();
      unreset();
    };
  }, []);

  // Decay activity
  useEffect(() => {
    const id = setInterval(() => {
      setActivity((a) => Math.max(0, a * 0.92 - 0.01));
      setRipple((r) => Math.max(0, r * 0.88 - 0.02));
    }, 50);
    return () => clearInterval(id);
  }, []);

  const onBreach = useCallback(() => {
    setRipple(1);
    setActivity((a) => Math.min(1, a + 0.5));
  }, []);

  return (
    <>
      <color attach="background" args={["#03050a"]} />
      <fog attach="fog" args={["#03050a", 8, 22]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 3, 2]} intensity={1.2} color="#5ec8ff" />
      <pointLight position={[2, -2, -2]} intensity={0.6} color="#ffe066" />
      <pointLight
        position={[0, -1.5, 0]}
        intensity={0.8 + d * 0.2 + activity}
        color="#1e90ff"
      />

      <Stars
        radius={40}
        depth={30}
        count={1200}
        factor={2}
        saturation={0}
        fade
        speed={0.3}
      />

      <LatentField agentDepth={agentDepth} activity={activity} />
      <AgentCore agentDepth={agentDepth} activity={activity} />
      <HarnessMembrane
        harnessType={harnessType}
        ripple={ripple}
        clamp={clamp}
      />
      <TrajectorySystem onBreach={onBreach} />

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.48}
        minPolarAngle={Math.PI * 0.15}
        target={[0, -0.4, 0]}
        autoRotate
        autoRotateSpeed={0.25}
      />

      <EffectComposer>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function Scene({ agentDepth, harnessType }: Props) {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 3.2, 7.5], fov: 45, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <SceneContents agentDepth={agentDepth} harnessType={harnessType} />
        </Suspense>
      </Canvas>
    </div>
  );
}
