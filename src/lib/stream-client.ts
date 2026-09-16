"use client";

import { eventBus } from "./event-bus";
import type {
  AgentDepth,
  HarnessType,
  MockStreamRequest,
  ScenarioId,
  StreamEvent,
} from "./types";

export interface RunParams {
  prompt: string;
  agentDepth: AgentDepth;
  harnessType: HarnessType;
  scenario?: ScenarioId;
}

/**
 * POST to the mock SSE endpoint and fan events into the shared event bus.
 * Shape matches a future real-provider SSE swap (pass-2).
 */
export async function startMockStream(
  params: RunParams,
  signal?: AbortSignal
): Promise<void> {
  eventBus.reset();
  eventBus.setPlaying(true);

  const body: MockStreamRequest = {
    prompt: params.prompt,
    agentDepth: params.agentDepth,
    harnessType: params.harnessType,
    scenario: params.scenario ?? "custom",
  };

  const res = await fetch("/api/mock-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    eventBus.setPlaying(false);
    throw new Error(`Mock stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;
      if (!eventBus.isPlaying()) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const line = chunk
          .split("\n")
          .find((l) => l.startsWith("data: "));
        if (!line) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const event = JSON.parse(raw) as StreamEvent;
          eventBus.publish(event);
          if (event.type === "done") {
            eventBus.setPlaying(false);
          }
        } catch {
          // ignore malformed SSE frames
        }
      }
    }
  } finally {
    eventBus.setPlaying(false);
  }
}

export function pauseStream() {
  eventBus.setPlaying(false);
}
