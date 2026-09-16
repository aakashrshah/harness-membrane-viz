"use client";

import {
  AGENT_DEPTH_LABELS,
  AGENT_DEPTH_ORDER,
  HARNESS_LABELS,
  SCENARIO_PRESETS,
  type AgentDepth,
  type HarnessType,
  type ScenarioId,
} from "@/lib/types";

interface Props {
  prompt: string;
  setPrompt: (v: string) => void;
  agentDepth: AgentDepth;
  setAgentDepth: (v: AgentDepth) => void;
  harnessType: HarnessType;
  setHarnessType: (v: HarnessType) => void;
  scenario: ScenarioId;
  setScenario: (v: ScenarioId) => void;
  playing: boolean;
  scrub: number;
  historyLen: number;
  onPlay: () => void;
  onPause: () => void;
  onScrub: (index: number) => void;
}

export function ControlDock({
  prompt,
  setPrompt,
  agentDepth,
  setAgentDepth,
  harnessType,
  setHarnessType,
  scenario,
  setScenario,
  playing,
  scrub,
  historyLen,
  onPlay,
  onPause,
  onScrub,
}: Props) {
  return (
    <aside className="pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-md">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-sky-200">
            Harness Membrane
          </h1>
          <p className="text-[11px] text-white/45">
            Mock stream · illustrative latent dots
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={playing ? onPause : onPlay}
            className="rounded-lg bg-sky-500/90 px-3 py-1.5 text-xs font-medium text-black hover:bg-sky-400"
          >
            {playing ? "Pause" : "Run"}
          </button>
        </div>
      </header>

      <label className="block text-[11px] uppercase tracking-wider text-white/40">
        Prompt
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setScenario("custom");
          }}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none focus:border-sky-400/50"
          placeholder="Ask the agent…"
        />
      </label>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-white/40">
          Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIO_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setScenario(p.id);
                setPrompt(p.prompt);
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                scenario === p.id
                  ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/25"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-white/40">
          Agent depth
        </div>
        <div className="grid grid-cols-1 gap-1">
          {AGENT_DEPTH_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setAgentDepth(d)}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                agentDepth === d
                  ? "border-sky-400/70 bg-sky-400/15 text-sky-100"
                  : "border-white/10 bg-white/5 text-white/55 hover:border-white/25"
              }`}
            >
              {AGENT_DEPTH_LABELS[d]}
              <span className="float-right text-[10px] text-white/30">
                {"●".repeat(AGENT_DEPTH_ORDER.indexOf(d) + 1)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-white/40">
          Harness membrane
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(HARNESS_LABELS) as HarnessType[]).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHarnessType(h)}
              className={`rounded-lg border px-2 py-2 text-center text-[11px] transition ${
                harnessType === h
                  ? h === "test"
                    ? "border-amber-300/70 bg-amber-300/15 text-amber-100"
                    : "border-sky-400/70 bg-sky-400/15 text-sky-100"
                  : "border-white/10 bg-white/5 text-white/55 hover:border-white/25"
              }`}
            >
              {HARNESS_LABELS[h]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-white/35">
          {harnessType === "kernel" &&
            "Densest grid · tightest clamp · cool blue"}
          {harnessType === "test" &&
            "Assertion lanes · yellow pass/fail accents"}
          {harnessType === "domain" &&
            "Constraint islands · mixed blue/yellow"}
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-white/40">
          <span>Scrub</span>
          <span className="normal-case tracking-normal text-white/30">
            {historyLen === 0 ? "—" : `${Math.max(0, scrub) + 1}/${historyLen}`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, historyLen - 1)}
          value={Math.max(0, scrub)}
          disabled={historyLen === 0}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="w-full accent-sky-400"
        />
      </div>
    </aside>
  );
}
