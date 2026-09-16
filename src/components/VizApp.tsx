"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ControlDock } from "./ControlDock";
import { EventHUD } from "./EventHUD";
import { OnboardingTip } from "./OnboardingTip";
import { eventBus } from "@/lib/event-bus";
import { pauseStream, startMockStream } from "@/lib/stream-client";
import type { AgentDepth, HarnessType, ScenarioId } from "@/lib/types";

const Scene = dynamic(
  () => import("./Scene").then((m) => m.Scene),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#03050a]" /> }
);

export function VizApp() {
  const [prompt, setPrompt] = useState(
    "Summarize Q3 revenue drivers within approved data sources."
  );
  const [agentDepth, setAgentDepth] = useState<AgentDepth>("deep-tools");
  const [harnessType, setHarnessType] = useState<HarnessType>("kernel");
  const [scenario, setScenario] = useState<ScenarioId>("constrained");
  const [playing, setPlaying] = useState(false);
  const [scrub, setScrub] = useState(-1);
  const [historyLen, setHistoryLen] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsub = eventBus.subscribe(() => {
      setHistoryLen(eventBus.getHistory().length);
      setScrub(eventBus.getScrubIndex());
      setPlaying(eventBus.isPlaying());
    });
    const unreset = eventBus.onReset(() => {
      setHistoryLen(0);
      setScrub(-1);
    });
    const poll = setInterval(() => setPlaying(eventBus.isPlaying()), 200);
    return () => {
      unsub();
      unreset();
      clearInterval(poll);
    };
  }, []);

  const onPlay = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPlaying(true);
    try {
      await startMockStream(
        { prompt, agentDepth, harnessType, scenario },
        ac.signal
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error(e);
      }
    } finally {
      setPlaying(false);
    }
  }, [prompt, agentDepth, harnessType, scenario]);

  const onPause = useCallback(() => {
    pauseStream();
    abortRef.current?.abort();
    setPlaying(false);
  }, []);

  const onScrub = useCallback((index: number) => {
    pauseStream();
    abortRef.current?.abort();
    setPlaying(false);
    eventBus.replayAt(index);
    setScrub(index);
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#03050a] text-white">
      <Scene agentDepth={agentDepth} harnessType={harnessType} />

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

      <OnboardingTip />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-stretch justify-between gap-4 p-4 md:flex-row md:items-end">
        <ControlDock
          prompt={prompt}
          setPrompt={setPrompt}
          agentDepth={agentDepth}
          setAgentDepth={setAgentDepth}
          harnessType={harnessType}
          setHarnessType={setHarnessType}
          scenario={scenario}
          setScenario={setScenario}
          playing={playing}
          scrub={scrub}
          historyLen={historyLen}
          onPlay={onPlay}
          onPause={onPause}
          onScrub={onScrub}
        />
        <EventHUD />
      </div>

      <footer className="pointer-events-none absolute right-4 top-4 z-20 text-right text-[10px] text-white/30">
        v1 mock SSE · not real model activations
      </footer>
    </div>
  );
}
