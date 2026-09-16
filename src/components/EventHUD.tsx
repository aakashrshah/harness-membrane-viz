"use client";

import { useEffect, useRef, useState } from "react";
import { eventBus } from "@/lib/event-bus";
import type { StreamEvent } from "@/lib/types";

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
    case "done":
      return ev.summary;
  }
}

export function EventHUD() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [tokens, setTokens] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = eventBus.subscribe((ev) => {
      setEvents(eventBus.getHistory().slice(-40));
      if (ev.type === "token") setTokens((t) => t + ev.text);
      if (ev.type === "done") {
        /* keep tokens */
      }
    });
    const unreset = eventBus.onReset(() => {
      setEvents([]);
      setTokens("");
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

      {tokens && (
        <div className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-sky-100/90">
          {tokens}
          <span className="animate-pulse text-sky-300">▍</span>
        </div>
      )}

      <div
        ref={listRef}
        className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-[11px]"
      >
        {events.length === 0 && (
          <p className="py-6 text-center text-white/30">
            Press Run to stream mock events
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
