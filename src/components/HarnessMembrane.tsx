"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { HarnessType } from "@/lib/types";

interface Props {
  harnessType: HarnessType;
  ripple: number; // 0–1 spike on breach
  clamp: number; // visual tightness
  flash?: "none" | "block" | "allow" | "rewrite";
}

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uRipple;
uniform float uDistort;
varying vec2 vUv;
varying float vElevation;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec3 pos = position;
  float wave =
    sin(pos.x * 2.2 + uTime * 1.1) * 0.06 * uDistort +
    cos(pos.y * 2.8 - uTime * 0.9) * 0.05 * uDistort;
  float rip = sin(length(pos.xy) * 6.0 - uTime * 4.0) * 0.18 * uRipple;
  pos.z += wave + rip;
  vElevation = pos.z;
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uRipple;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uAccent;
uniform float uGrid;
uniform float uMode; // 0 kernel, 1 test, 2 domain
uniform float uFlash; // 0 none, 1 block, 2 allow, 3 rewrite
varying vec2 vUv;
varying float vElevation;
varying vec3 vWorld;

float gridLine(vec2 uv, float scale, float width) {
  vec2 g = abs(fract(uv * scale) - 0.5);
  float line = min(g.x, g.y);
  return 1.0 - smoothstep(0.0, width, line);
}

void main() {
  vec2 uv = vUv;
  float fres = pow(1.0 - abs(vElevation * 4.0), 2.0);
  float g1 = gridLine(uv - 0.5, mix(8.0, 18.0, uGrid), 0.04);
  float g2 = gridLine(uv - 0.5, mix(4.0, 10.0, uGrid), 0.06);

  vec3 col = mix(uColorA, uColorB, g2 * 0.55 + fres * 0.3);
  col += uAccent * g1 * 0.65;

  // Test harness: structured assertion lanes
  if (uMode > 0.5 && uMode < 1.5) {
    float lane = step(0.92, abs(sin(uv.x * 40.0)));
    col = mix(col, uAccent, lane * 0.45);
    float passFail = step(0.97, fract(uv.y * 12.0 + uTime * 0.2));
    col = mix(col, vec3(1.0, 0.85, 0.3), passFail * 0.35);
  }

  // Domain: constraint islands
  if (uMode > 1.5) {
    vec2 c1 = uv - vec2(0.3, 0.55);
    vec2 c2 = uv - vec2(0.7, 0.4);
    float island = smoothstep(0.18, 0.08, length(c1)) + smoothstep(0.15, 0.06, length(c2));
    col = mix(col, mix(uColorB, uAccent, 0.5), island * 0.55);
  }

  // Verdict flash — red/amber block vs allow glow
  if (uFlash > 0.5 && uFlash < 1.5) {
    col = mix(col, vec3(1.0, 0.25, 0.35), 0.45 + uRipple * 0.25);
  } else if (uFlash > 1.5 && uFlash < 2.5) {
    col = mix(col, vec3(0.4, 1.0, 0.65), 0.4);
  } else if (uFlash > 2.5) {
    col = mix(col, vec3(1.0, 0.85, 0.3), 0.4);
  }

  float alpha = 0.22 + g1 * 0.35 + g2 * 0.15 + fres * 0.25 + uRipple * 0.2;
  alpha = clamp(alpha, 0.15, 0.85);
  gl_FragColor = vec4(col, alpha);
}
`;

function harnessPalette(type: HarnessType) {
  if (type === "kernel") {
    return {
      a: new THREE.Color("#041018"),
      b: new THREE.Color("#0a3a5c"),
      accent: new THREE.Color("#3aa9ff"),
      grid: 1,
      distort: 0.55,
      mode: 0,
    };
  }
  if (type === "test") {
    return {
      a: new THREE.Color("#0a0c10"),
      b: new THREE.Color("#1a2a20"),
      accent: new THREE.Color("#ffe066"),
      grid: 0.7,
      distort: 0.7,
      mode: 1,
    };
  }
  return {
    a: new THREE.Color("#080a12"),
    b: new THREE.Color("#12304a"),
    accent: new THREE.Color("#7ec8ff"),
    grid: 0.55,
    distort: 0.85,
    mode: 2,
  };
}

function flashToUniform(flash: Props["flash"]): number {
  if (flash === "block") return 1;
  if (flash === "allow") return 2;
  if (flash === "rewrite") return 3;
  return 0;
}

/** Lit water/membrane control plane — material varies by harness type. */
export function HarnessMembrane({
  harnessType,
  ripple,
  clamp,
  flash = "none",
}: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const palette = useMemo(() => harnessPalette(harnessType), [harnessType]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRipple: { value: 0 },
      uDistort: { value: palette.distort },
      uColorA: { value: palette.a },
      uColorB: { value: palette.b },
      uAccent: { value: palette.accent },
      uGrid: { value: palette.grid * clamp },
      uMode: { value: palette.mode },
      uFlash: { value: 0 },
    }),
    [palette, clamp]
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uRipple.value = THREE.MathUtils.lerp(
      uniforms.uRipple.value,
      ripple,
      0.12
    );
    uniforms.uDistort.value = palette.distort * (0.85 + (1 - clamp) * 0.3);
    uniforms.uGrid.value = palette.grid * clamp;
    uniforms.uColorA.value.copy(palette.a);
    uniforms.uColorB.value.copy(palette.b);
    uniforms.uAccent.value.copy(palette.accent);
    uniforms.uMode.value = palette.mode;
    uniforms.uFlash.value = THREE.MathUtils.lerp(
      uniforms.uFlash.value,
      flashToUniform(flash),
      0.2
    );
  });

  const segs = harnessType === "kernel" ? 96 : harnessType === "test" ? 72 : 64;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
      <mesh ref={mesh}>
        <planeGeometry args={[10, 10, segs, segs]} />
        <shaderMaterial
          key={harnessType}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Soft under-glow sheet */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial
          color={
            flash === "block"
              ? "#ff4d6d"
              : flash === "allow"
                ? "#7dffb3"
                : flash === "rewrite"
                  ? "#ffe066"
                  : palette.accent
          }
          transparent
          opacity={0.04 + ripple * 0.08 + (flash !== "none" ? 0.1 : 0)}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
