"use client";

import { useEffect, useState } from "react";

export function OnboardingTip() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full border border-sky-400/30 bg-black/75 px-4 py-2 text-center text-xs text-sky-100/90 shadow-lg backdrop-blur-md">
      <span className="font-medium text-sky-200">Harness</span> = control plane.{" "}
      <span className="font-medium text-amber-200">Agent</span> = autonomy under
      it.
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-3 text-white/40 hover:text-white/70"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
