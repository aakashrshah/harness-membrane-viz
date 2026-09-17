"use client";

import { useEffect, useRef, useState } from "react";
import { eventBus } from "@/lib/event-bus";
import type {
  HarnessVerdict,
  StreamEvent,
  TestAssertEvent,
} from "@/lib/types";

function badge(ev: StreamEvent): { label: string; className: string } {
  switch (ev.type) {
    case "token":
      return { label: "token", className: "bg-white/10 text-white/70" };
    case "thought":
      return { label: "thought", className: "bg-sky-500/20 text-sky-200" };
    case "tool_propose":
      return {
        label: "tool_propose",
        className: "bg-violet-500/20 text-violet-200",
      };
    case "harness_check":
      return {
        label: `harness_check · ${ev.verdict}`,
        className:
          ev.verdict === "allow"
            ? "bg-emerald-500/20 text-emerald-200"
            : ev.verdict === "rewrite"
              ? "bg-amber-500/20 text-amber-100"
              : "bg-rose-500/25 text-rose-200",
      };
    case "trajectory":
      return {
        label: `trajectory · ${ev.kind}`,
        className: "bg-cyan-500/15 text-cyan-100",
      };
    case "test_assert":
      return {
        label: `test_assert · ${ev.result}`,
        className:
          ev.result === "pass"
            ? "bg-emerald-500/20 text-emerald-200"
            : "bg-rose-500/25 text-rose-200",
      };
    case "control_gate":
      return {
        label: `control_gate · ${ev.state}`,
        className: "bg-amber-500/15 text-amber-100",
      };
    case "done":
      return { label: "done", className: "bg-white/15 text-white/80" };
  }
}

function body(ev: StreamEvent): string {
  switch (ev.type) {
    case "token":
      return ev.text;
    case "thought":
      return ev.text;
    case "tool_propose":
      return `${ev.tool}${ev.risk ? ` · risk ${ev.risk}` : ""}`;
    case "harness_check":
      return ev.reason;
    case "trajectory":
      return ev.kind;
    case "test_assert":
      return `${ev.name}: ${ev.reason}`;
    case "control_gate":
      return `${ev.name} → ${ev.state}`;
    case "done":
      return ev.summary;
  }
}

const VERDICT_STYLE: Record<HarnessVerdict, string> = {
  allow: "text-emerald-300",
  rewrite: "text-amber-200",
  block: "text-rose-300",
};

export function EventHUD({ showTestResults }: { showTestResults: boolean }) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [tokens, setTokens] = useState("");
  const [attempt, setAttempt] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<HarnessVerdict | null>(null);
  const [asserts, setAsserts] = useState<TestAssertEvent[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = eventBus.subscribe((ev) => {
      setEvents(eventBus.getHistory().slice(-40));
      if (ev.type === "token") setTokens((t) => t + ev.text);
      if (ev.type === "tool_propose") {
        setAttempt(`${ev.tool}${ev.risk ? ` (${ev.risk} risk)` : ""}`);
      }
      if (ev.type === "harness_check") {
        setAttempt(ev.attempt ?? ev.tool ?? "action");
        setVerdict(ev.verdict);
      }
      if (ev.type === "test_assert") {
        setAsserts((prev) => {
          const rest = prev.filter((a) => a.name !== ev.name);
          return [...rest, ev];
        });
      }
    });
    const unreset = eventBus.onReset(() => {
      setEvents([]);
      setTokens("");
      setAttempt(null);
      setVerdict(null);
      setAsserts([]);
    });
    return () => {
      unsub();
      unreset();
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  return (
    <aside className="pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Event HUD
        </h2>
        <span className="text-[10px] text-white/30">{events.length} events</span>
      </div>

      {/* Live Attempt vs Control */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-sky-500/10 via-black/40 to-amber-400/10 px-3 py-2.5">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-white/40">
          Attempt vs Control
        </div>
        {attempt && verdict ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="text-sm font-medium text-white/85">
              <span className="text-white/40">Tried:</span> {attempt}
            </p>
            <p
              className={`text-lg font-bold tracking-wide ${VERDICT_STYLE[verdict]}`}
            >
              {verdict.toUpperCase()}
            </p>
          </div>
        ) : (
          <p className="text-xs text-white/35">
            Waiting for a harness decision…
          </p>
        )}
      </div>

      {showTestResults && (
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/5 px-3 py-2">
          <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-amber-200/80">
            Test results
          </div>
          {asserts.length === 0 ? (
            <p className="text-[11px] text-white/35">
              Assertions stream when Test harness runs
            </p>
          ) : (
            <ul className="space-y-1">
              {asserts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2 text-[11px] text-white/70"
                >
                  <span
                    className={
                      a.result === "pass"
                        ? "font-bold text-emerald-300"
                        : "font-bold text-rose-300"
                    }
                  >
                    {a.result === "pass" ? "✓" : "✗"}
                  </span>
                  <span>
                    <span className="font-medium text-amber-100/90">
                      {a.name}
                    </span>
                    <span className="text-white/40"> — {a.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tokens && (
        <div className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-sky-100/90">
          {tokens}
          <span className="animate-pulse text-sky-300">▍</span>
        </div>
      )}

      <div
        ref={listRef}
        className="max-h-44 space-y-1.5 overflow-y-auto pr-1 text-[11px]"
      >
        {events.length === 0 && (
          <p className="py-6 text-center text-white/30">
            Type any prompt and press Run
          </p>
        )}
        {events.map((ev) => {
          const b = badge(ev);
          return (
            <div
              key={ev.id}
              className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5"
            >
              <div className="mb-0.5 flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${b.className}`}
                >
                  {b.label}
                </span>
                <span className="ml-auto font-mono text-[10px] text-white/25">
                  t={ev.t}ms
                </span>
              </div>
              <p className="text-white/65">{body(ev)}</p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
