"use client";

import { useState } from "react";
import {
  HARNESS_PEDAGOGY,
  USUAL_CONTROLS,
  type HarnessType,
} from "@/lib/types";

interface Props {
  harnessType: HarnessType;
}

/**
 * Persistent, skimmable explainer — what a harness is, usual controls,
 * and this membrane's specific controls.
 */
export function PedagogyPanel({ harnessType }: Props) {
  const [open, setOpen] = useState(true);
  const ped = HARNESS_PEDAGOGY[harnessType];

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-20 w-[min(100%-2rem,22rem)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/75 px-3 py-2 text-left text-xs text-sky-100/90 shadow-lg backdrop-blur-md hover:border-sky-400/30"
      >
        <span>
          <span className="font-semibold text-sky-200">What is a harness?</span>
          <span className="ml-2 text-white/40">
            {open ? "collapse" : "expand"}
          </span>
        </span>
        <span className="text-white/40">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-3 rounded-xl border border-white/10 bg-black/80 p-3 text-[11px] leading-relaxed text-white/70 shadow-xl backdrop-blur-md">
          <p>
            A <span className="font-medium text-sky-200">harness</span> is the{" "}
            <span className="text-amber-100">control plane</span> around an
            agent: tools, policies, schemas, sandboxes, approvals —{" "}
            <span className="text-white/45">not</span> the model weights. The
            agent is autonomy{" "}
            <span className="italic text-sky-100/80">under</span> the membrane;
            overshoot tries to punch{" "}
            <span className="italic text-rose-200/80">up</span> through it.
          </p>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Usual controls → membrane cues
            </div>
            <ul className="space-y-1">
              {USUAL_CONTROLS.map((c) => (
                <li key={c.name} className="flex gap-1.5">
                  <span className="shrink-0 font-medium text-sky-200/90">
                    {c.name}:
                  </span>
                  <span className="text-white/50">{c.cue}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-amber-300/25 bg-amber-300/5 px-2.5 py-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
              This membrane —{" "}
              {harnessType === "test"
                ? "Test harness"
                : harnessType === "kernel"
                  ? "Kernel"
                  : "Domain-specific"}
            </div>
            <p className="mb-1.5 text-amber-50/85">{ped.oneLiner}</p>
            <ul className="list-disc space-y-0.5 pl-3.5 text-white/55">
              {ped.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
