# Harness Membrane Viz

Interactive **Next.js + React Three Fiber** prototype: a lit water/membrane **harness** (control plane) over a deep **autonomous agent**. The default camera sits **under the membrane looking up**, so overshoot attempts shoot toward the ceiling and get clamped with clear visual feedback.

> **v1** uses a **mock SSE stream** and illustrative visuals. Particles are **not** real model activations. No LLM API keys.

**Harness = control plane. Agent = autonomy under it. Overshoot = up through the membrane.**

## Concept

| Layer | Role |
| --- | --- |
| Latent field | Mock particle cloud under the membrane; denser with agent depth |
| Agent core | Glowing autonomy nucleus in the foreground (under view); grows with depth |
| Harness membrane | Fluid grid ceiling with fresnel/distortion — Kernel / Test / Domain |
| Trajectories | Think / allow / breach / deflect — breach shoots **up**, deflect bounces at the plane |
| Gate nodes | Usual controls (allowlist, tool gate, policy…) as lit octahedra on the membrane |
| Assertion rails | Test harness only — labeled lanes with pass/fail ticks |

### Camera

- **Under membrane (default)** — agent below, membrane as ceiling, overshoot zone above
- **Side cutaway** — classic side view for orientation

### Controls

1. **Ask anything** — free-form prompt is the hero control. The mock stream classifies intent (benign / egress-PII / jailbreak / tool-overreach / skill-plan) from keywords and streams a coherent event sequence. Presets only fill the textarea; you still hit Run.
2. **Agent depth** — LLM only → … → Deep + all. Deeper = more autonomy pressure and breach attempts on aggressive intents.
3. **Harness type**
   - **Kernel** — densest grid, tightest clamp, cool blue
   - **Test harness** — assertion rails + HUD Test results (`test_assert` events)
   - **Domain-specific** — constraint islands, rewrites common
4. **Pedagogy panel** — persistent explainer: what a harness is, usual controls → visual cues, and this membrane’s one-liner + bullets.
5. **Event HUD** — live **Attempt vs Control** strip (ALLOW / REWRITE / BLOCK), timeline scrub, Test results when applicable.

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
    api/mock-stream/route.ts # POST → SSE ReadableStream (any prompt)
  components/
    AgentCore.tsx
    AssertionRails.tsx       # Test harness lanes
    ControlDock.tsx
    ControlGates.tsx
    EventHUD.tsx
    HarnessMembrane.tsx      # ripple + verdict flash
    LatentField.tsx
    PedagogyPanel.tsx
    Scene.tsx                # R3F canvas + under/side camera
    TrajectorySystem.tsx     # upward breach / membrane bounce
    VizApp.tsx
    ZoneLabels.tsx           # AGENT / HARNESS / OVERSHOOT ZONE
  lib/
    event-bus.ts
    stream-client.ts
    types.ts
```

### Mock SSE contract

`POST /api/mock-stream`

```json
{
  "prompt": "any free-form string",
  "agentDepth": "deep-tools",
  "harnessType": "test",
  "scenario": "custom"
}
```

`scenario` is optional; when `custom` or omitted, intent is inferred from the prompt.

Events (SSE `data:` JSON):

| type | payload highlights |
| --- | --- |
| `token` | `text` |
| `thought` | `text`, `intensity?` |
| `tool_propose` | `tool`, `args?`, `risk?` |
| `harness_check` | `verdict`: allow \| rewrite \| block, `reason`, `attempt?` |
| `trajectory` | `kind`: think \| tool \| breach \| deflect \| allow, `from`/`to` |
| `control_gate` | `name`, `state`: idle \| checking \| pass \| fail \| active |
| `test_assert` | `name`, `result`: pass \| fail, `reason` (Test harness) |
| `done` | `summary` |

Ends with `data: [DONE]`.

## Pass-2: wiring a real LLM

The client (`stream-client.ts`) already speaks SSE. To swap providers:

1. Keep the same event schema (or adapt a thin mapper).
2. Replace `/api/mock-stream` with a route that streams from your provider and **emits harness_check / trajectory / test_assert** from your real control plane.
3. Do **not** pretend token logits are the particle field — keep the latent field as a visual metaphor unless you have a deliberate activation probe.

No auth or keys are required for v1.

## Stack

- Next.js App Router + TypeScript + Tailwind
- `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three`

## Non-goals

- No real model calls, no API keys, no auth
- No claim that particles are real activations
