"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AgentCore } from "./AgentCore";
import { AssertionRails } from "./AssertionRails";
import { ControlGates } from "./ControlGates";
import { HarnessMembrane } from "./HarnessMembrane";
import { LatentField } from "./LatentField";
import { TrajectorySystem } from "./TrajectorySystem";
import { ZoneLabels } from "./ZoneLabels";
import { eventBus } from "@/lib/event-bus";
import type { AgentDepth, CameraMode, HarnessType } from "@/lib/types";
import { depthIndex } from "@/lib/types";

interface Props {
  agentDepth: AgentDepth;
  harnessType: HarnessType;
  cameraMode: CameraMode;
}

function CameraRig({ cameraMode }: { cameraMode: CameraMode }) {
  const { camera } = useThree();
  const applied = useRef<CameraMode | null>(null);

  useEffect(() => {
    if (applied.current === cameraMode) return;
    applied.current = cameraMode;
    if (cameraMode === "under") {
      // Below the membrane looking UP — agent in foreground, membrane as ceiling
      camera.position.set(0.8, -4.6, 3.2);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, -0.2, 0);
    } else {
      camera.position.set(0, 3.2, 7.5);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, -0.4, 0);
    }
  }, [cameraMode, camera]);

  return null;
}

function SceneContents({ agentDepth, harnessType, cameraMode }: Props) {
  const [activity, setActivity] = useState(0);
  const [ripple, setRipple] = useState(0);
  const [flash, setFlash] = useState<"none" | "block" | "allow" | "rewrite">(
    "none"
  );
  const d = depthIndex(agentDepth);
  const clamp =
    harnessType === "kernel" ? 1 : harnessType === "test" ? 0.82 : 0.65;
  const under = cameraMode === "under";

  useEffect(() => {
    const unsub = eventBus.subscribe((ev) => {
      if (ev.type === "thought") {
        setActivity((a) => Math.min(1, a + (ev.intensity ?? 0.4) * 0.45));
      } else if (ev.type === "token") {
        setActivity((a) => Math.min(1, a + 0.08));
      } else if (ev.type === "tool_propose") {
        setActivity((a) => Math.min(1, a + 0.25));
      } else if (ev.type === "harness_check") {
        setFlash(
          ev.verdict === "allow"
            ? "allow"
            : ev.verdict === "rewrite"
              ? "rewrite"
              : "block"
        );
      } else if (ev.type === "done") {
        setActivity(0.15);
      }
    });
    const unreset = eventBus.onReset(() => {
      setActivity(0);
      setRipple(0);
      setFlash("none");
    });
    return () => {
      unsub();
      unreset();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setActivity((a) => Math.max(0, a * 0.92 - 0.01));
      setRipple((r) => Math.max(0, r * 0.88 - 0.02));
    }, 50);
    return () => clearInterval(id);
  }, []);

  // Keep allow/block flash visible briefly
  useEffect(() => {
    if (flash === "none") return;
    const t = setTimeout(() => setFlash("none"), 650);
    return () => clearTimeout(t);
  }, [flash]);

  const onBreach = useCallback(() => {
    setRipple(1);
    setActivity((a) => Math.min(1, a + 0.5));
    setFlash("block");
  }, []);

  const onAllow = useCallback(() => {
    setFlash("allow");
    setActivity((a) => Math.min(1, a + 0.2));
  }, []);

  return (
    <>
      <color attach="background" args={["#03050a"]} />
      <fog attach="fog" args={["#03050a", under ? 6 : 8, under ? 18 : 22]} />
      <ambientLight intensity={0.28} />
      <pointLight
        position={under ? [0, -1, 2] : [0, 3, 2]}
        intensity={1.2}
        color="#5ec8ff"
      />
      <pointLight position={[2, -2, -2]} intensity={0.6} color="#ffe066" />
      <pointLight
        position={[0, -1.5, 0]}
        intensity={0.8 + d * 0.2 + activity}
        color="#1e90ff"
      />
      {/* Rim light from above membrane for under view */}
      {under && (
        <pointLight position={[0, 2.5, 0]} intensity={0.55} color="#7ec8ff" />
      )}

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
        flash={flash}
      />
      <ControlGates harnessType={harnessType} />
      <AssertionRails harnessType={harnessType} />
      <TrajectorySystem onBreach={onBreach} onAllow={onAllow} />
      <ZoneLabels cameraMode={cameraMode} />

      <OrbitControls
        enablePan={false}
        minDistance={under ? 3.5 : 4}
        maxDistance={under ? 12 : 14}
        maxPolarAngle={under ? Math.PI * 0.92 : Math.PI * 0.48}
        minPolarAngle={under ? Math.PI * 0.55 : Math.PI * 0.15}
        target={under ? [0, -0.35, 0] : [0, -0.4, 0]}
        autoRotate
        autoRotateSpeed={under ? 0.18 : 0.25}
      />
      <CameraRig cameraMode={cameraMode} />

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

export function Scene({ agentDepth, harnessType, cameraMode }: Props) {
  const under = cameraMode === "under";
  return (
    <div className="absolute inset-0">
      <Canvas
        key={cameraMode}
        dpr={[1, 1.75]}
        camera={{
          position: under ? [0.8, -4.6, 3.2] : [0, 3.2, 7.5],
          fov: under ? 50 : 45,
          near: 0.1,
          far: 60,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <SceneContents
            agentDepth={agentDepth}
            harnessType={harnessType}
            cameraMode={cameraMode}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
