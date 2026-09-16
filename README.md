# Harness Membrane Viz

Interactive **Next.js + React Three Fiber** prototype: a lit water/membrane **harness** (control plane) over a deep **autonomous agent**. Black void, blue/yellow latent-space dots, streaming trajectories that try to breach — and get clamped.

> **v1** uses a **mock SSE stream** and gorgeous visuals. Dots are **illustrative**, not real model activations. No LLM API keys.

**Harness = control plane. Agent = autonomy under it.**

## Concept

| Layer | Role |
| --- | --- |
| Latent field | Mock particle cloud under the membrane; denser with agent depth |
| Agent core | Glowing autonomy nucleus; grows with depth; tool nodes at deeper settings |
| Harness membrane | Fluid grid with fresnel/distortion — Kernel / Test / Domain materials |
| Trajectories | Think / allow / breach / deflect paths driven by the event stream |

### Controls

1. **Agent depth** — LLM only → Agent → Agent + skills → Deep + tools → Deep + all  
   Deeper = more autonomy pressure, denser latent activity, more tool nodes, more breach attempts in aggressive scenarios.
2. **Harness type** — membrane material  
   - **Kernel** — densest grid, tightest clamp, cool blue  
   - **Test** — assertion lanes, yellow pass/fail accents  
   - **Domain-specific** — constraint islands, mixed blue/yellow  
3. **Run panel** — prompt, scenario presets, play/pause/scrub, Event HUD (`token`, `thought`, `tool_propose`, `harness_check` allow|rewrite|block, `trajectory`).

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production check
npm start
```

## Architecture

```
src/
  app/
    page.tsx                 # mounts VizApp
    api/mock-stream/route.ts # POST → SSE ReadableStream
  components/
    Scene.tsx                # R3F canvas + bloom
    LatentField.tsx
    HarnessMembrane.tsx
    AgentCore.tsx
    TrajectorySystem.tsx
    ControlDock.tsx
    EventHUD.tsx
    VizApp.tsx               # client shell + stream wiring
  lib/
    types.ts
    event-bus.ts             # shared bus → scene + HUD
    stream-client.ts         # fetch SSE → event bus
```

### Mock SSE contract

`POST /api/mock-stream`

```json
{
  "prompt": "…",
  "agentDepth": "deep-tools",
  "harnessType": "kernel",
  "scenario": "tool-overreach"
}
```

Events (SSE `data:` JSON):

| type | payload highlights |
| --- | --- |
| `token` | `text` |
| `thought` | `text`, `intensity?` |
| `tool_propose` | `tool`, `args?`, `risk?` |
| `harness_check` | `verdict`: allow \| rewrite \| block, `reason` |
| `trajectory` | `kind`: think \| tool \| breach \| deflect \| allow, `from`/`to` |
| `done` | `summary` |

Ends with `data: [DONE]`.

## Pass-2: wiring a real LLM

The client (`stream-client.ts`) already speaks SSE. To swap providers:

1. Keep the same event schema (or adapt a thin mapper).
2. Replace `/api/mock-stream` with a route that streams from your provider (OpenAI/Anthropic/etc.) and **emits harness_check / trajectory** from your real control plane.
3. Do **not** pretend token logits are the particle field — keep the latent field as a visual metaphor unless you have a deliberate activation probe.

No auth or keys are required for v1.

## Stack

- Next.js App Router + TypeScript + Tailwind
- `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three`

## Non-goals

- No real model calls, no API keys, no auth
- No claim that particles are real activations
