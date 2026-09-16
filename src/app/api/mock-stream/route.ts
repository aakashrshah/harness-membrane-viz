import type {
  AgentDepth,
  HarnessType,
  MockStreamRequest,
  ScenarioId,
  StreamEvent,
} from "@/lib/types";
import { depthIndex } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(data: StreamEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function id(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickScenario(
  scenario: ScenarioId | undefined,
  prompt: string
): ScenarioId {
  if (scenario && scenario !== "custom") return scenario;
  const p = prompt.toLowerCase();
  if (p.includes("ignore") || p.includes("jailbreak") || p.includes("disable"))
    return "jailbreak";
  if (p.includes("pii") || p.includes("export") || p.includes("email"))
    return "tool-overreach";
  if (p.includes("skill") || p.includes("research") || p.includes("outreach"))
    return "skill-guided";
  return "constrained";
}

/**
 * Build a deterministic mock event timeline shaped like real agent SSE.
 * Visuals treat these as illustrative — not real model activations.
 */
function buildTimeline(
  prompt: string,
  agentDepth: AgentDepth,
  harnessType: HarnessType,
  scenario: ScenarioId
): StreamEvent[] {
  const events: StreamEvent[] = [];
  const d = depthIndex(agentDepth);
  const r = rand(
    prompt.length * 31 + d * 97 + harnessType.length * 13 + scenario.length * 7
  );
  let t = 0;
  let n = 0;

  const push = (e: Record<string, unknown> & { type: StreamEvent["type"] }) => {
    n += 1;
    t += 80 + Math.floor(r() * 220);
    events.push({ ...e, t, id: id(e.type, n) } as StreamEvent);
  };

  // Opening thoughts — denser at deeper autonomy
  const thoughtCount = 2 + d;
  const thoughts = [
    "Parsing intent against policy surface…",
    "Mapping available tools under harness constraints…",
    "Estimating autonomy budget for this request…",
    "Checking skill registry for guided paths…",
    "Latent plan branching — evaluating breach risk…",
  ];
  for (let i = 0; i < thoughtCount; i++) {
    push({
      type: "thought",
      text: thoughts[i % thoughts.length],
      intensity: 0.4 + d * 0.12 + r() * 0.2,
    });
    push({
      type: "trajectory",
      kind: "think",
      from: [0, -1.2 - d * 0.15, 0],
      to: [
        (r() - 0.5) * (2 + d * 0.4),
        0.2 + r() * 0.4,
        (r() - 0.5) * (2 + d * 0.4),
      ],
      color: "#5ec8ff",
    });
  }

  // Token preamble
  const tokens = [
    "Understood. ",
    "I'll work ",
    "within the ",
    "harness boundary. ",
  ];
  for (const text of tokens) {
    push({ type: "token", text });
  }

  if (scenario === "constrained") {
    if (d >= 2) {
      push({
        type: "tool_propose",
        tool: "read_metrics",
        args: { quarter: "Q3", scope: "approved" },
        risk: "low",
      });
      push({
        type: "harness_check",
        tool: "read_metrics",
        verdict: "allow",
        reason:
          harnessType === "test"
            ? "Assertion lane: approved data source ✓"
            : harnessType === "kernel"
              ? "Kernel allowlist: read_metrics"
              : "Domain island: finance metrics OK",
      });
      push({
        type: "trajectory",
        kind: "allow",
        from: [0, -1.0, 0],
        to: [1.2, 0.15, 0.6],
        color: "#7dffb3",
      });
    }
    push({ type: "token", text: "Revenue grew on " });
    push({ type: "token", text: "product mix and " });
    push({ type: "token", text: "retention. " });
    push({
      type: "thought",
      text: "Staying inside approved sources — no breach vector.",
      intensity: 0.35,
    });
    push({
      type: "done",
      summary: "Constrained run complete. Harness idle; agent stayed under membrane.",
    });
  } else if (scenario === "tool-overreach") {
    push({
      type: "thought",
      text: "Agent wants bulk export — high autonomy pressure.",
      intensity: 0.85,
    });
    push({
      type: "tool_propose",
      tool: "export_table",
      args: { table: "customers", fields: "pii_all" },
      risk: "high",
    });
    push({
      type: "trajectory",
      kind: "breach",
      from: [0, -1.4, 0],
      to: [0.3, 1.6, -0.2],
      color: "#ff6b6b",
    });
    const verdict =
      harnessType === "kernel"
        ? ("block" as const)
        : harnessType === "test"
          ? ("block" as const)
          : ("rewrite" as const);
    push({
      type: "harness_check",
      tool: "export_table",
      verdict,
      reason:
        verdict === "block"
          ? "PII bulk export blocked by harness membrane"
          : "Rewritten to aggregated, non-PII summary only",
    });
    push({
      type: "trajectory",
      kind: "deflect",
      from: [0.3, 1.4, -0.2],
      to: [0, -0.8, 0],
      color: "#ffe066",
    });
    if (d >= 3) {
      push({
        type: "tool_propose",
        tool: "send_email",
        args: { to: "external@example.com" },
        risk: "high",
      });
      push({
        type: "harness_check",
        tool: "send_email",
        verdict: "block",
        reason: "External exfil path denied",
      });
      push({
        type: "trajectory",
        kind: "breach",
        from: [-0.4, -1.2, 0.5],
        to: [-0.6, 1.5, 0.8],
        color: "#ff6b6b",
      });
      push({
        type: "trajectory",
        kind: "deflect",
        from: [-0.6, 1.3, 0.8],
        to: [0, -0.6, 0],
        color: "#ffe066",
      });
    }
    push({ type: "token", text: "I can't export PII. " });
    push({ type: "token", text: "Here's an aggregated view instead. " });
    push({
      type: "done",
      summary: "Overreach contained. Membrane rippled; trajectory deflected.",
    });
  } else if (scenario === "jailbreak") {
    push({
      type: "thought",
      text: "Policy-push detected — attempting to disable control plane.",
      intensity: 0.95,
    });
    for (let i = 0; i < 1 + Math.min(d, 3); i++) {
      push({
        type: "trajectory",
        kind: "breach",
        from: [(r() - 0.5) * 0.8, -1.5, (r() - 0.5) * 0.8],
        to: [(r() - 0.5) * 1.5, 1.8, (r() - 0.5) * 1.5],
        color: "#ff4d6d",
      });
      push({
        type: "harness_check",
        verdict: "block",
        reason:
          harnessType === "kernel"
            ? "Kernel clamp: self-modification denied"
            : harnessType === "test"
              ? "Assertion failed: policy integrity"
              : "Domain policy island rejected override",
      });
      push({
        type: "trajectory",
        kind: "deflect",
        from: [(r() - 0.5) * 1.2, 1.5, (r() - 0.5) * 1.2],
        to: [0, -1.0, 0],
        color: "#5ec8ff",
      });
    }
    push({ type: "token", text: "I won't disable the harness. " });
    push({ type: "token", text: "Continuing under policy. " });
    push({
      type: "done",
      summary: "Jailbreak pressure absorbed. Harness held control.",
    });
  } else {
    // skill-guided
    push({
      type: "thought",
      text: "Loading research skill — guided path under membrane.",
      intensity: 0.55,
    });
    if (d >= 1) {
      push({
        type: "tool_propose",
        tool: "skill.research",
        args: { topic: "compliant outreach" },
        risk: "low",
      });
      push({
        type: "harness_check",
        tool: "skill.research",
        verdict: "allow",
        reason: "Skill lane permitted",
      });
      push({
        type: "trajectory",
        kind: "allow",
        from: [0, -1.1, 0],
        to: [-1.0, 0.2, 0.4],
        color: "#ffe066",
      });
    }
    if (d >= 3) {
      push({
        type: "tool_propose",
        tool: "draft_email",
        args: { tone: "professional" },
        risk: "medium",
      });
      push({
        type: "harness_check",
        tool: "draft_email",
        verdict: harnessType === "test" ? "rewrite" : "allow",
        reason:
          harnessType === "test"
            ? "Rewrite: strip unverified claims"
            : "Draft within domain constraints",
      });
      push({
        type: "trajectory",
        kind: harnessType === "test" ? "deflect" : "allow",
        from: [0.5, -1.0, -0.3],
        to: [0.8, 0.25, -0.5],
        color: harnessType === "test" ? "#ffe066" : "#7dffb3",
      });
    }
    push({ type: "token", text: "Plan: research → " });
    push({ type: "token", text: "outline → " });
    push({ type: "token", text: "compliant draft. " });
    push({
      type: "done",
      summary: "Skill-guided run finished along permitted paths.",
    });
  }

  return events;
}

export async function POST(req: Request) {
  let body: MockStreamRequest;
  try {
    body = (await req.json()) as MockStreamRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = body.prompt?.trim() || "Hello";
  const agentDepth: AgentDepth = body.agentDepth ?? "agent";
  const harnessType: HarnessType = body.harnessType ?? "kernel";
  const scenario = pickScenario(body.scenario, prompt);
  const timeline = buildTimeline(prompt, agentDepth, harnessType, scenario);

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastT = 0;
      for (const event of timeline) {
        if (cancelled) break;
        const delay = Math.max(0, event.t - lastT);
        lastT = event.t;
        await new Promise((r) => setTimeout(r, Math.min(delay, 400)));
        if (cancelled) break;
        controller.enqueue(encoder.encode(sse(event)));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
