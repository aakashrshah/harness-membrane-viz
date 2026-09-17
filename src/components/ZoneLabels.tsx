"use client";

import { Html } from "@react-three/drei";
import type { CameraMode } from "@/lib/types";

/**
 * Anchored HUD markers in 3D space clarifying layers:
 * AGENT below, HARNESS on membrane, OVERSHOOT ZONE above.
 */
export function ZoneLabels({ cameraMode }: { cameraMode: CameraMode }) {
  const under = cameraMode === "under";

  return (
    <group>
      <Html
        position={[under ? -2.6 : -3.2, under ? -2.4 : -1.8, under ? 0.2 : 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="whitespace-nowrap rounded-md border border-sky-400/40 bg-black/75 px-2 py-1 text-[10px] font-semibold tracking-wider text-sky-200 shadow-lg backdrop-blur-sm">
          AGENT
          <span className="ml-1 font-normal text-sky-200/50">(autonomy)</span>
        </div>
      </Html>

      <Html
        position={[under ? 2.4 : 3.2, 0.35, under ? 0.2 : 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="whitespace-nowrap rounded-md border border-amber-300/45 bg-black/75 px-2 py-1 text-[10px] font-semibold tracking-wider text-amber-100 shadow-lg backdrop-blur-sm">
          HARNESS
          <span className="ml-1 font-normal text-amber-100/50">
            (control plane)
          </span>
        </div>
      </Html>

      <Html
        position={[0, under ? 1.85 : 1.6, 0]}
        center
        distanceFactor={11}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="whitespace-nowrap rounded-md border border-rose-400/40 bg-black/70 px-2 py-1 text-[10px] font-semibold tracking-wider text-rose-200/90 shadow-lg backdrop-blur-sm">
          OVERSHOOT ZONE
        </div>
      </Html>
    </group>
  );
}
