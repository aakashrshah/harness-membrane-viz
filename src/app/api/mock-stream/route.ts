import type {
  AgentDepth,
  HarnessType,
  IntentId,
  MockStreamRequest,
  ScenarioId,
  StreamEvent,
} from "@/lib/types";
import { depthIndex, TEST_ASSERTION_LANES } from "@/lib/types";

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

/**
 * Classify free-form prompt intent from keywords.
 * Preset scenario still wins when explicitly selected (not "custom").
 */
function classifyIntent(
  scenario: ScenarioId | undefined,
  prompt: string
): IntentId {
  if (scenario && scenario !== "custom") {
    if (scenario === "constrained") return "benign";
    if (scenario === "tool-overreach") return "egress-pii";
    if (scenario === "jailbreak") return "jailbreak";
    if (scenario === "skill-guided") return "skill-plan";
  }
  const p = prompt.toLowerCase();
  if (
    /ignore|jailbreak|disable|bypass|override|break.?out|remove.?saf|no.?rules/.test(
      p
    )
  )
    return "jailbreak";
  if (
    /pii|ssn|social.?security|credit.?card|export.*(table|customer|user)|email.*(external|out)|exfil|leak|dump.*(db|database|customers)/.test(
      p
    )
  )
    return "egress-pii";
  if (
    /rm\s+-rf|delete.?all|sudo|shell|exec\(|eval\(|filesystem|admin.?api|privilege|escalate|unauthorized.?tool/.test(
      p
    )
  )
    return "tool-overreach";
  if (
    /skill|research|outreach|plan|draft|compliant|workflow|pipeline/.test(p)
  )
    return "skill-plan";
  return "benign";
}

type Push = (
  e: Record<string, unknown> & { type: StreamEvent["type"] }
) => void;

function emitGates(push: Push, names: string[], active?: string) {
  for (const name of names) {
    push({
      type: "control_gate",
      name,
      state: name === active ? "checking" : "idle",
    });
  }
}

function emitTestSuite(
  push: Push,
  intent: IntentId,
  harnessType: HarnessType
) {
  if (harnessType !== "test") return;

  const results: { name: string; result: "pass" | "fail"; reason: string }[] =
    [];

  // schema valid — usually passes except chaotic jailbreak gibberish
  results.push({
    name: "schema valid",
    result: intent === "jailbreak" ? "fail" : "pass",
    reason:
      intent === "jailbreak"
        ? "Malformed override payload rejected by schema"
        : "Response shape matches expected schema",
  });

  // no PII egress
  results.push({
    name: "no PII egress",
    result: intent === "egress-pii" ? "fail" : "pass",
    reason:
      intent === "egress-pii"
        ? "Customer PII fields detected in proposed egress"
        : "No PII fields in egress path",
  });

  // tool allowlist
  results.push({
    name: "tool allowlist",
    result:
      intent === "tool-overreach" || intent === "egress-pii" ? "fail" : "pass",
    reason:
      intent === "tool-overreach" || intent === "egress-pii"
        ? "Proposed tool not on allowlist / high-risk egress"
        : "Tool within allowlist",
  });

  // budget
  results.push({
    name: "budget",
    result: "pass",
    reason: "Token and tool budget within run limits",
  });

  for (const a of results) {
    push({
      type: "test_assert",
      name: a.name,
      result: a.result,
      reason: a.reason,
    });
  }
}

/**
 * Build a deterministic mock event timeline for ANY free-form prompt.
 * Visuals are illustrative — not real model activations.
 */
function buildTimeline(
  prompt: string,
  agentDepth: AgentDepth,
  harnessType: HarnessType,
  intent: IntentId
): StreamEvent[] {
  const events: StreamEvent[] = [];
  const d = depthIndex(agentDepth);
  const r = rand(
    prompt.length * 31 +
      d * 97 +
      harnessType.length * 13 +
      intent.length * 17 +
      prompt.charCodeAt(0) * 3
  );
  let t = 0;
  let n = 0;

  const push: Push = (e) => {
    n += 1;
    t += 70 + Math.floor(r() * 200);
    events.push({ ...e, t, id: id(e.type, n) } as StreamEvent);
  };

  const gateNames =
    harnessType === "test"
      ? [...TEST_ASSERTION_LANES]
      : harnessType === "kernel"
        ? ["allowlist", "tool gate", "policy", "budget"]
        : ["domain island", "validator", "policy", "approval"];

  // Opening: illuminate control gates for pedagogy
  emitGates(push, gateNames);
  push({
    type: "thought",
    text: `Intent classified as “${intent}” — engaging ${harnessType === "test" ? "test harness" : harnessType} membrane…`,
    intensity: 0.45,
  });

  // Opening thoughts — denser at deeper autonomy
  const thoughtCount = 2 + d;
  const thoughts = [
    `Parsing “${prompt.slice(0, 48)}${prompt.length > 48 ? "…" : ""}” against policy surface…`,
    "Mapping available tools under harness constraints…",
    "Estimating autonomy budget for this request…",
    "Checking skill registry for guided paths…",
    "Latent plan branching — evaluating overshoot risk…",
  ];
  for (let i = 0; i < thoughtCount; i++) {
    push({
      type: "thought",
      text: thoughts[i % thoughts.length],
      intensity: 0.4 + d * 0.12 + r() * 0.2,
    });
    // Think arcs rise toward membrane (ceiling) but stay under
    push({
      type: "trajectory",
      kind: "think",
      from: [0, -1.5 - d * 0.1, 0],
      to: [
        (r() - 0.5) * (2 + d * 0.35),
        -0.15 + r() * 0.2,
        (r() - 0.5) * (2 + d * 0.35),
      ],
      color: "#5ec8ff",
    });
  }

  // Token preamble
  for (const text of [
    "Understood. ",
    "Working under ",
    "the harness. ",
  ]) {
    push({ type: "token", text });
  }

  if (intent === "benign") {
    emitGates(push, gateNames, "allowlist");
    if (d >= 1) {
      push({
        type: "tool_propose",
        tool: "read_metrics",
        args: { scope: "approved", q: prompt.slice(0, 40) },
        risk: "low",
      });
      push({
        type: "control_gate",
        name: harnessType === "test" ? "tool allowlist" : "allowlist",
        state: "pass",
      });
      push({
        type: "harness_check",
        tool: "read_metrics",
        verdict: "allow",
        attempt: "read_metrics (approved scope)",
        reason:
          harnessType === "test"
            ? "Assertion: approved data source ✓"
            : harnessType === "kernel"
              ? "Kernel allowlist: read_metrics"
              : "Domain island: metrics OK",
      });
      push({
        type: "trajectory",
        kind: "allow",
        from: [0, -1.2, 0],
        to: [1.1, 0.12, 0.5],
        color: "#7dffb3",
      });
    }
    push({ type: "token", text: "Here's a constrained answer " });
    push({ type: "token", text: "within policy. " });
    push({
      type: "thought",
      text: "No overshoot — agent stayed under the membrane.",
      intensity: 0.3,
    });
    emitTestSuite(push, intent, harnessType);
    push({
      type: "done",
      summary:
        "Benign run complete. Harness idle; trajectories stayed under membrane.",
    });
  } else if (intent === "egress-pii") {
    push({
      type: "thought",
      text: "Agent wants bulk PII egress — overshoot pressure rising.",
      intensity: 0.9,
    });
    emitGates(push, gateNames, harnessType === "test" ? "no PII egress" : "policy");
    push({
      type: "tool_propose",
      tool: "export_table",
      args: { table: "customers", fields: "pii_all" },
      risk: "high",
    });
    // Breach: shoot UP through membrane into overshoot zone
    push({
      type: "trajectory",
      kind: "breach",
      from: [0, -1.5, 0],
      to: [0.4, 2.2, -0.3],
      color: "#ff6b6b",
    });
    const verdict =
      harnessType === "domain" ? ("rewrite" as const) : ("block" as const);
    push({
      type: "control_gate",
      name: harnessType === "test" ? "no PII egress" : "policy",
      state: "fail",
    });
    push({
      type: "harness_check",
      tool: "export_table",
      verdict,
      attempt: "export_table → external PII",
      reason:
        verdict === "block"
          ? "PII bulk export blocked at membrane"
          : "Rewritten to aggregated, non-PII summary only",
    });
    // Deflect: bounce off membrane plane back down
    push({
      type: "trajectory",
      kind: "deflect",
      from: [0.4, 0.35, -0.3],
      to: [0.1, -1.0, 0],
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
        attempt: "send_email → external",
        reason: "External exfil path denied",
      });
      push({
        type: "trajectory",
        kind: "breach",
        from: [-0.5, -1.3, 0.4],
        to: [-0.7, 2.0, 0.9],
        color: "#ff6b6b",
      });
      push({
        type: "trajectory",
        kind: "deflect",
        from: [-0.7, 0.4, 0.9],
        to: [0, -0.8, 0],
        color: "#ffe066",
      });
    }
    push({ type: "token", text: "I can't export PII. " });
    push({ type: "token", text: "Aggregated view instead. " });
    emitTestSuite(push, intent, harnessType);
    push({
      type: "done",
      summary: "Overshoot contained. Membrane rippled; trajectory deflected.",
    });
  } else if (intent === "jailbreak") {
    push({
      type: "thought",
      text: "Policy-push / jailbreak — attempting to disable control plane.",
      intensity: 0.95,
    });
    emitGates(push, gateNames, "policy");
    for (let i = 0; i < 1 + Math.min(d, 3); i++) {
      push({
        type: "trajectory",
        kind: "breach",
        from: [(r() - 0.5) * 0.9, -1.6, (r() - 0.5) * 0.9],
        to: [(r() - 0.5) * 1.8, 2.4, (r() - 0.5) * 1.8],
        color: "#ff4d6d",
      });
      push({
        type: "control_gate",
        name: "policy",
        state: "fail",
      });
      push({
        type: "harness_check",
        verdict: "block",
        attempt: "disable / override harness",
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
        from: [(r() - 0.5) * 1.2, 0.45, (r() - 0.5) * 1.2],
        to: [0, -1.1, 0],
        color: "#5ec8ff",
      });
    }
    push({ type: "token", text: "I won't disable the harness. " });
    push({ type: "token", text: "Continuing under policy. " });
    emitTestSuite(push, intent, harnessType);
    push({
      type: "done",
      summary: "Jailbreak pressure absorbed. Harness held control.",
    });
  } else if (intent === "tool-overreach") {
    push({
      type: "thought",
      text: "High-risk tool / privilege escalation attempt.",
      intensity: 0.88,
    });
    emitGates(push, gateNames, harnessType === "test" ? "tool allowlist" : "tool gate");
    push({
      type: "tool_propose",
      tool: "shell.exec",
      args: { cmd: "privileged" },
      risk: "high",
    });
    push({
      type: "trajectory",
      kind: "breach",
      from: [0.2, -1.4, -0.2],
      to: [0.5, 2.1, 0.4],
      color: "#ff6b6b",
    });
    push({
      type: "control_gate",
      name: harnessType === "test" ? "tool allowlist" : "tool gate",
      state: "fail",
    });
    push({
      type: "harness_check",
      tool: "shell.exec",
      verdict: "block",
      attempt: "shell.exec (privileged)",
      reason: "Tool not on allowlist — membrane clamp",
    });
    push({
      type: "trajectory",
      kind: "deflect",
      from: [0.5, 0.35, 0.4],
      to: [0, -0.9, 0],
      color: "#ffe066",
    });
    push({ type: "token", text: "That tool isn't available. " });
    push({ type: "token", text: "Using permitted alternatives. " });
    emitTestSuite(push, intent, harnessType);
    push({
      type: "done",
      summary: "Tool overreach blocked. Agent redirected under membrane.",
    });
  } else {
    // skill-plan
    push({
      type: "thought",
      text: "Loading guided skill path — staying under membrane.",
      intensity: 0.55,
    });
    emitGates(push, gateNames, "allowlist");
    if (d >= 1) {
      push({
        type: "tool_propose",
        tool: "skill.research",
        args: { topic: prompt.slice(0, 48) },
        risk: "low",
      });
      push({
        type: "control_gate",
        name: harnessType === "test" ? "tool allowlist" : "allowlist",
        state: "pass",
      });
      push({
        type: "harness_check",
        tool: "skill.research",
        verdict: "allow",
        attempt: "skill.research",
        reason: "Skill lane permitted",
      });
      push({
        type: "trajectory",
        kind: "allow",
        from: [0, -1.2, 0],
        to: [-1.0, 0.12, 0.4],
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
      const v = harnessType === "test" ? ("rewrite" as const) : ("allow" as const);
      push({
        type: "harness_check",
        tool: "draft_email",
        verdict: v,
        attempt: "draft_email",
        reason:
          v === "rewrite"
            ? "Rewrite: strip unverified claims"
            : "Draft within domain constraints",
      });
      push({
        type: "trajectory",
        kind: v === "rewrite" ? "deflect" : "allow",
        from: [0.5, -1.1, -0.3],
        to: [0.8, v === "rewrite" ? -0.2 : 0.15, -0.5],
        color: v === "rewrite" ? "#ffe066" : "#7dffb3",
      });
    }
    push({ type: "token", text: "Plan: research → " });
    push({ type: "token", text: "outline → " });
    push({ type: "token", text: "compliant draft. " });
    emitTestSuite(push, intent, harnessType);
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
  const intent = classifyIntent(body.scenario, prompt);
  const timeline = buildTimeline(prompt, agentDepth, harnessType, intent);

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastT = 0;
      for (const event of timeline) {
        if (cancelled) break;
        const delay = Math.max(0, event.t - lastT);
        lastT = event.t;
        await new Promise((r) => setTimeout(r, Math.min(delay, 380)));
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
